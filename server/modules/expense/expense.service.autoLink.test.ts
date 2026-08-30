import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from 'vitest';
import { Prisma } from '@prisma/client';
import type { CreateExpenseInput } from './expense.types';

const mocks = vi.hoisted(() => ({
	transaction: vi.fn(),
	expenseCreate: vi.fn(),
	expenseAggregate: vi.fn(),
	accountFindUnique: vi.fn(),
	accountUpdate: vi.fn(),
	budgetFindMany: vi.fn(),
	budgetFindUnique: vi.fn(),
	categoryFindUnique: vi.fn(),
	getOrCreateCategory: vi.fn(),
	getThreshold: vi.fn(),
	sendBudgetAlert: vi.fn(),
	sendLargeExpenseAlert: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
	default: {
		$transaction: mocks.transaction,
		expense: { aggregate: mocks.expenseAggregate },
		budget: {
			findMany: mocks.budgetFindMany,
			findUnique: mocks.budgetFindUnique,
		},
		category: { findUnique: mocks.categoryFindUnique },
	},
}));

vi.mock('@/server/modules/user/user.service', () => ({
	UserService: { getLargeExpenseThreshold: mocks.getThreshold },
}));

vi.mock('@/server/modules/notification/notification.service', () => ({
	NotificationService: {
		sendBudgetAlert: mocks.sendBudgetAlert,
		sendLargeExpenseAlert: mocks.sendLargeExpenseAlert,
	},
}));

vi.mock('../category/category.service', () => ({
	CategoryService: { getOrCreateCategory: mocks.getOrCreateCategory },
}));

import { ExpenseService } from './expense.service';

const budgetSelect = {
	id: true,
	name: true,
	amount: true,
	month: true,
};

const BASE: CreateExpenseInput = {
	amount: 20,
	description: 'Lunch',
	date: new Date(2026, 7, 17, 12),
	notes: 'Team meal',
	categoryId: 'category-food',
	accountId: 'account-1',
};

function envelope(id: string, month: Date, amount = '100') {
	return {
		id,
		name: `${id} name`,
		amount: new Prisma.Decimal(amount),
		month,
	};
}

function expectedCreateData(
	input: CreateExpenseInput,
	categoryId: string,
	budgetId: string | null
) {
	return {
		amount: input.amount,
		description: input.description,
		date: input.date,
		notes: input.notes,
		categoryId,
		accountId: input.accountId,
		budgetId,
		userId: 'user-1',
	};
}

describe('ExpenseService.createExpense — single-envelope auto-link', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 7, 30, 12));
		mocks.budgetFindMany.mockResolvedValue([]);
		mocks.budgetFindUnique.mockResolvedValue(null);
		mocks.expenseAggregate.mockResolvedValue({ _sum: { amount: null } });
		mocks.accountFindUnique.mockResolvedValue({ isLiability: false });
		mocks.accountUpdate.mockResolvedValue(undefined);
		mocks.getThreshold.mockResolvedValue(null);
		mocks.sendBudgetAlert.mockResolvedValue(undefined);
		mocks.sendLargeExpenseAlert.mockResolvedValue(undefined);
		mocks.getOrCreateCategory.mockResolvedValue({ id: 'category-new' });
		mocks.expenseCreate.mockImplementation(
			async ({ data }: { data: Record<string, unknown> }) => ({
				id: 'expense-1',
				...data,
			})
		);
		mocks.transaction.mockImplementation(
			async (callback: (tx: unknown) => unknown) =>
				callback({
					expense: { create: mocks.expenseCreate },
					account: {
						findUnique: mocks.accountFindUnique,
						update: mocks.accountUpdate,
					},
				})
		);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('links when exactly one envelope exists and keeps alert math exact', async () => {
		const input = { ...BASE, amount: 0.2 };
		const augustEnvelope = envelope(
			'budget-august',
			new Date(Date.UTC(2026, 7, 1)),
			'1'
		);
		mocks.budgetFindMany.mockResolvedValue([augustEnvelope]);
		mocks.expenseAggregate.mockResolvedValue({
			_sum: { amount: new Prisma.Decimal('0.10') },
		});

		const result = await ExpenseService.createExpense('user-1', input);

		expect(mocks.budgetFindMany).toHaveBeenCalledWith({
			where: {
				userId: 'user-1',
				categoryId: 'category-food',
				month: {
					gte: new Date(Date.UTC(2026, 7, 1)),
					lte: new Date(Date.UTC(2026, 7, 31, 23, 59, 59, 999)),
				},
			},
			select: budgetSelect,
			take: 2,
		});
		expect(mocks.expenseAggregate).toHaveBeenCalledWith({
			where: {
				budgetId: 'budget-august',
				userId: 'user-1',
				date: {
					gte: new Date(Date.UTC(2026, 7, 1)),
					lte: new Date(Date.UTC(2026, 7, 31, 23, 59, 59, 999)),
				},
			},
			_sum: { amount: true },
		});
		expect(mocks.expenseCreate).toHaveBeenCalledWith({
			data: expectedCreateData(
				input,
				'category-food',
				'budget-august'
			),
		});
		expect(mocks.sendBudgetAlert).toHaveBeenCalledWith(
			'user-1',
			{ id: 'budget-august', name: 'budget-august name', amount: 1 },
			0.3,
			10,
			30
		);
		expect(result).toMatchObject({ budgetId: 'budget-august' });
	});

	it('leaves the expense unlinked when two envelopes match', async () => {
		mocks.budgetFindMany.mockResolvedValue([
			envelope('budget-1', new Date(Date.UTC(2026, 7, 1))),
			envelope('budget-2', new Date(Date.UTC(2026, 7, 1))),
		]);

		await ExpenseService.createExpense('user-1', BASE);

		expect(mocks.expenseCreate).toHaveBeenCalledWith({
			data: expectedCreateData(BASE, 'category-food', null),
		});
		expect(mocks.expenseAggregate).not.toHaveBeenCalled();
		expect(mocks.sendBudgetAlert).not.toHaveBeenCalled();
	});

	it('leaves the expense unlinked when no envelope matches', async () => {
		await ExpenseService.createExpense('user-1', BASE);

		expect(mocks.expenseCreate).toHaveBeenCalledWith({
			data: expectedCreateData(BASE, 'category-food', null),
		});
		expect(mocks.expenseAggregate).not.toHaveBeenCalled();
	});

	it('never overwrites an explicit budget and scopes spend to its own month', async () => {
		const input = { ...BASE, budgetId: 'budget-explicit' };
		const julyEnvelope = envelope(
			'budget-explicit',
			new Date(Date.UTC(2026, 6, 1))
		);
		mocks.budgetFindUnique.mockResolvedValue(julyEnvelope);

		await ExpenseService.createExpense('user-1', input);

		expect(mocks.budgetFindMany).not.toHaveBeenCalled();
		expect(mocks.budgetFindUnique).toHaveBeenCalledWith({
			where: { id: 'budget-explicit', userId: 'user-1' },
			select: budgetSelect,
		});
		expect(mocks.expenseAggregate).toHaveBeenCalledWith({
			where: {
				budgetId: 'budget-explicit',
				userId: 'user-1',
				date: {
					gte: new Date(Date.UTC(2026, 6, 1)),
					lte: new Date(Date.UTC(2026, 6, 31, 23, 59, 59, 999)),
				},
			},
			_sum: { amount: true },
		});
		expect(mocks.expenseCreate).toHaveBeenCalledWith({
			data: expectedCreateData(
				input,
				'category-food',
				'budget-explicit'
			),
		});
	});

	it('does not match an envelope from a different month', async () => {
		const septemberInput = {
			...BASE,
			date: new Date(2026, 8, 10, 12),
		};

		await ExpenseService.createExpense('user-1', septemberInput);

		expect(mocks.budgetFindMany).toHaveBeenCalledWith({
			where: {
				userId: 'user-1',
				categoryId: 'category-food',
				month: {
					gte: new Date(Date.UTC(2026, 8, 1)),
					lte: new Date(Date.UTC(2026, 8, 30, 23, 59, 59, 999)),
				},
			},
			select: budgetSelect,
			take: 2,
		});
		expect(mocks.expenseCreate).toHaveBeenCalledWith({
			data: expectedCreateData(
				septemberInput,
				'category-food',
				null
			),
		});
	});

	it("links a backdated expense to that month's envelope, not the current month", async () => {
		const januaryInput = {
			...BASE,
			date: new Date(2026, 0, 12, 12),
		};
		mocks.budgetFindMany.mockResolvedValue([
			envelope('budget-january', new Date(Date.UTC(2026, 0, 1))),
		]);

		await ExpenseService.createExpense('user-1', januaryInput);

		expect(mocks.budgetFindMany).toHaveBeenCalledWith({
			where: {
				userId: 'user-1',
				categoryId: 'category-food',
				month: {
					gte: new Date(Date.UTC(2026, 0, 1)),
					lte: new Date(Date.UTC(2026, 0, 31, 23, 59, 59, 999)),
				},
			},
			select: budgetSelect,
			take: 2,
		});
		expect(mocks.expenseCreate).toHaveBeenCalledWith({
			data: expectedCreateData(
				januaryInput,
				'category-food',
				'budget-january'
			),
		});
	});

	it('does not attempt auto-linking for the categoryName-only path', async () => {
		const input: CreateExpenseInput = {
			amount: BASE.amount,
			description: BASE.description,
			date: BASE.date,
			notes: BASE.notes,
			categoryName: 'New category',
			accountId: BASE.accountId,
		};

		await ExpenseService.createExpense('user-1', input);

		expect(mocks.budgetFindMany).not.toHaveBeenCalled();
		expect(mocks.budgetFindUnique).not.toHaveBeenCalled();
		expect(mocks.getOrCreateCategory).toHaveBeenCalledWith(
			'user-1',
			'New category',
			'EXPENSE'
		);
		expect(mocks.expenseCreate).toHaveBeenCalledWith({
			data: expectedCreateData(input, 'category-new', null),
		});
	});
});
