import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from 'vitest';
import { Prisma } from '@prisma/client';
import { BudgetLinkError, createExpenseSchema, type CreateExpenseInput } from './expense.types';

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
	categoryId: true,
};

const BASE: CreateExpenseInput = {
	amount: 20,
	description: 'Lunch',
	date: new Date('2026-08-17T12:00:00.000Z'),
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
		categoryId: 'category-food',
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

describe('ExpenseService.createExpense — explicit budget linking', () => {
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

	it('REGRESSION: choosing no budget stays unlinked even when exactly one category/month envelope matches', async () => {
		mocks.budgetFindMany.mockResolvedValue([
			envelope('budget-august', new Date(Date.UTC(2026, 7, 1))),
		]);

		const result = await ExpenseService.createExpense('user-1', BASE);

		expect(mocks.expenseCreate).toHaveBeenCalledWith({
			data: expectedCreateData(BASE, 'category-food', null),
		});
		expect(result).toMatchObject({ budgetId: null });
		expect(mocks.budgetFindMany).not.toHaveBeenCalled();
		expect(mocks.budgetFindUnique).not.toHaveBeenCalled();
		expect(mocks.expenseAggregate).not.toHaveBeenCalled();
		expect(mocks.sendBudgetAlert).not.toHaveBeenCalled();
	});

	it('accepts an explicit null budget and creates an unlinked expense without budget lookups', async () => {
		const input = createExpenseSchema.parse({ ...BASE, budgetId: null });

		await ExpenseService.createExpense('user-1', input);

		expect(mocks.expenseCreate).toHaveBeenCalledWith({
			data: expectedCreateData(input, 'category-food', null),
		});
		expect(mocks.budgetFindMany).not.toHaveBeenCalled();
		expect(mocks.budgetFindUnique).not.toHaveBeenCalled();
		expect(mocks.expenseAggregate).not.toHaveBeenCalled();
		expect(mocks.sendBudgetAlert).not.toHaveBeenCalled();
	});

	it('links a valid explicit budget and keeps exact Decimal spend math scoped to its own UTC month', async () => {
		const input = { ...BASE, amount: 0.2, budgetId: 'budget-explicit' };
		const augustEnvelope = envelope(
			'budget-explicit',
			new Date(Date.UTC(2026, 7, 1)),
			'1'
		);
		mocks.budgetFindUnique.mockResolvedValue(augustEnvelope);
		mocks.expenseAggregate.mockResolvedValue({
			_sum: { amount: new Prisma.Decimal('0.10') },
		});

		await ExpenseService.createExpense('user-1', input);

		expect(mocks.budgetFindMany).not.toHaveBeenCalled();
		expect(mocks.budgetFindUnique).toHaveBeenCalledExactlyOnceWith({
			where: { id: 'budget-explicit', userId: 'user-1' },
			select: budgetSelect,
		});
		expect(mocks.expenseAggregate).toHaveBeenCalledWith({
			where: {
				budgetId: 'budget-explicit',
				userId: 'user-1',
				date: {
					gte: new Date(Date.UTC(2026, 7, 1)),
					lte: new Date(Date.UTC(2026, 7, 31, 23, 59, 59, 999)),
				},
			},
			_sum: { amount: true },
		});
		expect(mocks.expenseCreate).toHaveBeenCalledWith({
			data: expectedCreateData(input, 'category-food', 'budget-explicit'),
		});
		expect(mocks.sendBudgetAlert).toHaveBeenCalledWith(
			'user-1',
			{ id: 'budget-explicit', name: 'budget-explicit name', amount: 1 },
			0.3,
			10,
			30
		);
	});

	it.each([
		['category mismatch', { categoryId: 'category-other' }, 'That budget is for a different category'],
		['month mismatch', { date: new Date('2026-09-17T12:00:00.000Z') }, 'That budget is for a different month'],
		['categoryName-only input', { categoryId: undefined, categoryName: 'Food' }, 'That budget is for a different category'],
	])('rejects an explicit budget for %s before entering a transaction', async (_label, changes, message) => {
		mocks.budgetFindUnique.mockResolvedValue(
			envelope('budget-explicit', new Date('2026-08-01T00:00:00.000Z'))
		);

		const result = ExpenseService.createExpense('user-1', {
			...BASE,
			...changes,
			budgetId: 'budget-explicit',
		});

		await expect(result).rejects.toThrow(message);
		await expect(result).rejects.toBeInstanceOf(BudgetLinkError);

		expect(mocks.transaction).not.toHaveBeenCalled();
		expect(mocks.expenseCreate).not.toHaveBeenCalled();
		expect(mocks.accountUpdate).not.toHaveBeenCalled();
		expect(mocks.getOrCreateCategory).not.toHaveBeenCalled();
		expect(mocks.expenseAggregate).not.toHaveBeenCalled();
		expect(mocks.sendBudgetAlert).not.toHaveBeenCalled();
	});

	it.each([
		['first millisecond', new Date('2026-08-01T00:00:00.000Z')],
		['last millisecond', new Date('2026-08-31T23:59:59.999Z')],
	])('accepts an explicit budget at the %s of its UTC month', async (_label, date) => {
		mocks.budgetFindUnique.mockResolvedValue(
			envelope('budget-explicit', new Date('2026-08-01T00:00:00.000Z'))
		);
		const input = { ...BASE, date, budgetId: 'budget-explicit' };

		const result = await ExpenseService.createExpense('user-1', input);

		expect(result).toMatchObject({ date, budgetId: 'budget-explicit' });
		expect(mocks.expenseCreate).toHaveBeenCalledExactlyOnceWith({
			data: expectedCreateData(input, 'category-food', 'budget-explicit'),
		});
	});

	it.each([
		['before', new Date('2026-07-31T23:59:59.999Z')],
		['after', new Date('2026-09-01T00:00:00.000Z')],
	])('rejects an explicit budget one millisecond %s its UTC month', async (_label, date) => {
		mocks.budgetFindUnique.mockResolvedValue(
			envelope('budget-explicit', new Date('2026-08-01T00:00:00.000Z'))
		);

		const result = ExpenseService.createExpense('user-1', { ...BASE, date, budgetId: 'budget-explicit' });

		await expect(result).rejects.toThrow('That budget is for a different month');
		await expect(result).rejects.toBeInstanceOf(BudgetLinkError);

		expect(mocks.transaction).not.toHaveBeenCalled();
		expect(mocks.expenseCreate).not.toHaveBeenCalled();
		expect(mocks.accountUpdate).not.toHaveBeenCalled();
		expect(mocks.expenseAggregate).not.toHaveBeenCalled();
		expect(mocks.sendBudgetAlert).not.toHaveBeenCalled();
	});

	it('rejects an explicit unowned or nonexistent budget before any write', async () => {
		const input = {
			...BASE,
			categoryId: undefined,
			categoryName: 'New category',
			budgetId: 'budget-not-owned',
		};

		const result = ExpenseService.createExpense('user-1', input);

		await expect(result).rejects.toThrow('Budget not found');
		await expect(result).rejects.not.toBeInstanceOf(BudgetLinkError);

		expect(mocks.budgetFindUnique).toHaveBeenCalledExactlyOnceWith({
			where: { id: 'budget-not-owned', userId: 'user-1' },
			select: budgetSelect,
		});
		expect(mocks.budgetFindMany).not.toHaveBeenCalled();
		expect(mocks.expenseCreate).not.toHaveBeenCalled();
		expect(mocks.getOrCreateCategory).not.toHaveBeenCalled();
		expect(mocks.accountUpdate).not.toHaveBeenCalled();
		expect(mocks.transaction).not.toHaveBeenCalled();
	});

	it('creates the category and leaves the categoryName-only expense unlinked', async () => {
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
