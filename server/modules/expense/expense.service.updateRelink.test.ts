import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import type { UpdateExpenseInput } from './expense.types';

const mocks = vi.hoisted(() => ({
	transaction: vi.fn(),
	expenseFindUnique: vi.fn(),
	expenseFindUniqueOrThrow: vi.fn(),
	expenseUpdate: vi.fn(),
	expenseAggregate: vi.fn(),
	budgetFindMany: vi.fn(),
	budgetFindUnique: vi.fn(),
	accountFindUnique: vi.fn(),
	accountUpdate: vi.fn(),
	sendBudgetAlert: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
	default: {
		$transaction: mocks.transaction,
		expense: {
			findUnique: mocks.expenseFindUnique,
			findUniqueOrThrow: mocks.expenseFindUniqueOrThrow,
			aggregate: mocks.expenseAggregate,
		},
		budget: {
			findMany: mocks.budgetFindMany,
			findUnique: mocks.budgetFindUnique,
		},
	},
}));

vi.mock('@/server/modules/notification/notification.service', () => ({
	NotificationService: {
		sendBudgetAlert: mocks.sendBudgetAlert,
		sendLargeExpenseAlert: vi.fn(),
	},
}));

vi.mock('@/server/modules/user/user.service', () => ({
	UserService: { getLargeExpenseThreshold: vi.fn() },
}));

vi.mock('../category/category.service', () => ({
	CategoryService: { getOrCreateCategory: vi.fn() },
}));

import { ExpenseService } from './expense.service';

const budgetSelect = {
	id: true,
	name: true,
	amount: true,
	month: true,
};
const augustDate = new Date(Date.UTC(2026, 7, 17, 12, 0, 0, 0));
const septemberDate = new Date(Date.UTC(2026, 8, 1, 0, 30, 0, 0));
const augustWindow = {
	gte: new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0)),
	lte: new Date(Date.UTC(2026, 7, 31, 23, 59, 59, 999)),
};
const septemberWindow = {
	gte: new Date(Date.UTC(2026, 8, 1, 0, 0, 0, 0)),
	lte: new Date(Date.UTC(2026, 8, 30, 23, 59, 59, 999)),
};

const oldExpense = {
	id: 'expense-1',
	amount: new Prisma.Decimal('0.05'),
	description: 'Coffee',
	date: augustDate,
	notes: null,
	categoryId: 'category-old',
	accountId: null,
	budgetId: 'budget-old',
	userId: 'user-1',
	createdAt: new Date(Date.UTC(2026, 7, 17, 12, 0, 0, 0)),
	updatedAt: new Date(Date.UTC(2026, 7, 17, 12, 0, 0, 0)),
};

function envelope(id: string, month: Date) {
	return {
		id,
		name: `${id} name`,
		amount: new Prisma.Decimal('1.00'),
		month,
	};
}

describe('ExpenseService.updateExpense — budget relinking', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.expenseFindUnique.mockResolvedValue(oldExpense);
		mocks.expenseFindUniqueOrThrow.mockResolvedValue(oldExpense);
		mocks.budgetFindMany.mockResolvedValue([]);
		mocks.budgetFindUnique.mockResolvedValue(null);
		mocks.expenseAggregate.mockResolvedValue({
			_sum: { amount: null },
		});
		mocks.expenseUpdate.mockImplementation(
			async ({ data }: { data: Record<string, unknown> }) => ({
				...oldExpense,
				...data,
			})
		);
		mocks.transaction.mockImplementation(
			async (callback: (tx: unknown) => unknown) =>
				callback({
					expense: {
						findUniqueOrThrow: mocks.expenseFindUniqueOrThrow,
						update: mocks.expenseUpdate,
					},
					account: {
						findUnique: mocks.accountFindUnique,
						update: mocks.accountUpdate,
					},
				})
		);
		mocks.sendBudgetAlert.mockResolvedValue(undefined);
	});

	it('relinks a changed category through one UTC-windowed match and keeps alert math exact', async () => {
		const input: UpdateExpenseInput = {
			id: 'expense-1',
			categoryId: 'category-new',
			amount: 0.2,
		};
		mocks.budgetFindMany.mockResolvedValue([
			envelope('budget-new', new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0))),
		]);
		mocks.expenseAggregate.mockResolvedValue({
			_sum: { amount: new Prisma.Decimal('0.10') },
		});

		await ExpenseService.updateExpense('user-1', input);

		expect(mocks.expenseFindUniqueOrThrow).toHaveBeenNthCalledWith(1, {
			where: { id: 'expense-1', userId: 'user-1' },
		});
		expect(mocks.budgetFindMany).toHaveBeenCalledWith({
			where: {
				userId: 'user-1',
				categoryId: 'category-new',
				month: augustWindow,
			},
			select: budgetSelect,
			take: 2,
		});
		expect(mocks.expenseAggregate).toHaveBeenCalledWith({
			where: {
				budgetId: 'budget-new',
				userId: 'user-1',
				date: augustWindow,
			},
			_sum: { amount: true },
		});
		expect(mocks.expenseUpdate).toHaveBeenCalledWith({
			where: { id: 'expense-1', userId: 'user-1' },
			data: {
				categoryId: 'category-new',
				amount: 0.2,
				budgetId: 'budget-new',
			},
		});
		expect(mocks.sendBudgetAlert).toHaveBeenCalledWith(
			'user-1',
			{ id: 'budget-new', name: 'budget-new name', amount: 1 },
			0.3,
			10,
			30
		);
	});

	it('uses the changed date and existing category to resolve the UTC month', async () => {
		const input: UpdateExpenseInput = {
			id: 'expense-1',
			date: septemberDate,
		};
		mocks.budgetFindMany.mockResolvedValue([
			envelope(
				'budget-september',
				new Date(Date.UTC(2026, 8, 1, 0, 0, 0, 0))
			),
		]);

		await ExpenseService.updateExpense('user-1', input);

		expect(mocks.budgetFindMany).toHaveBeenCalledWith({
			where: {
				userId: 'user-1',
				categoryId: 'category-old',
				month: septemberWindow,
			},
			select: budgetSelect,
			take: 2,
		});
		expect(mocks.expenseUpdate).toHaveBeenCalledWith({
			where: { id: 'expense-1', userId: 'user-1' },
			data: {
				date: septemberDate,
				budgetId: 'budget-september',
			},
		});
	});

	it('does not re-resolve when supplied category and date are unchanged', async () => {
		const unlinkedOldExpense = {
			...oldExpense,
			budgetId: null,
		};
		mocks.expenseFindUniqueOrThrow.mockResolvedValue(unlinkedOldExpense);
		const input: UpdateExpenseInput = {
			id: 'expense-1',
			categoryId: 'category-old',
			date: new Date(augustDate.getTime()),
		};

		await ExpenseService.updateExpense('user-1', input);

		expect(mocks.budgetFindMany).not.toHaveBeenCalled();
		expect(mocks.budgetFindUnique).not.toHaveBeenCalled();
		expect(mocks.expenseAggregate).not.toHaveBeenCalled();
		expect(mocks.expenseUpdate).toHaveBeenCalledWith({
			where: { id: 'expense-1', userId: 'user-1' },
			data: {
				categoryId: 'category-old',
				date: input.date,
			},
		});
	});

	it('keeps an explicit budget when category and date both change', async () => {
		const input: UpdateExpenseInput = {
			id: 'expense-1',
			categoryId: 'category-new',
			date: septemberDate,
			budgetId: 'budget-explicit',
		};
		mocks.budgetFindUnique.mockResolvedValue(
			envelope(
				'budget-explicit',
				new Date(Date.UTC(2026, 6, 1, 0, 0, 0, 0))
			)
		);

		await ExpenseService.updateExpense('user-1', input);

		expect(mocks.budgetFindMany).not.toHaveBeenCalled();
		expect(mocks.budgetFindUnique).toHaveBeenCalledWith({
			where: { id: 'budget-explicit', userId: 'user-1' },
			select: budgetSelect,
		});
		expect(mocks.expenseUpdate).toHaveBeenCalledWith({
			where: { id: 'expense-1', userId: 'user-1' },
			data: {
				categoryId: 'category-new',
				date: septemberDate,
				budgetId: 'budget-explicit',
			},
		});
	});

	it.each([
		['no', []],
		[
			'multiple',
			[
				envelope(
					'budget-1',
					new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0))
				),
				envelope(
					'budget-2',
					new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0))
				),
			],
		],
	])('clears the link when %s envelopes match', async (_label, matches) => {
		const input: UpdateExpenseInput = {
			id: 'expense-1',
			categoryId: 'category-new',
		};
		mocks.budgetFindMany.mockResolvedValue(matches);

		await ExpenseService.updateExpense('user-1', input);

		expect(mocks.budgetFindMany).toHaveBeenCalledWith({
			where: {
				userId: 'user-1',
				categoryId: 'category-new',
				month: augustWindow,
			},
			select: budgetSelect,
			take: 2,
		});
		expect(mocks.expenseUpdate).toHaveBeenCalledWith({
			where: { id: 'expense-1', userId: 'user-1' },
			data: {
				categoryId: 'category-new',
				budgetId: null,
			},
		});
		expect(mocks.expenseAggregate).not.toHaveBeenCalled();
		expect(mocks.sendBudgetAlert).not.toHaveBeenCalled();
	});
});
