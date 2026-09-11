import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { BudgetLinkError, updateExpenseSchema, type UpdateExpenseInput } from './expense.types';

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
	categoryId: true,
};
const augustDate = new Date(Date.UTC(2026, 7, 17, 12, 0, 0, 0));
const septemberDate = new Date(Date.UTC(2026, 8, 1, 0, 30, 0, 0));
const augustWindow = {
	gte: new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0)),
	lte: new Date(Date.UTC(2026, 7, 31, 23, 59, 59, 999)),
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

function envelope(id: string, month: Date, categoryId = 'category-old') {
	return {
		id,
		name: `${id} name`,
		amount: new Prisma.Decimal('1.00'),
		month,
		categoryId,
	};
}

describe('ExpenseService.updateExpense — explicit budget linking and link validity', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date(Date.UTC(2026, 8, 15, 12)));
		mocks.expenseFindUnique.mockResolvedValue(oldExpense);
		mocks.expenseFindUniqueOrThrow.mockResolvedValue(oldExpense);
		mocks.budgetFindMany.mockResolvedValue([]);
		mocks.budgetFindUnique.mockResolvedValue(
			envelope('budget-old', augustWindow.gte)
		);
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

	afterEach(() => {
		vi.useRealTimers();
	});

	it('never links an unlinked expense when only its category changes, even with one matching envelope', async () => {
		const unlinkedExpense = { ...oldExpense, budgetId: null };
		mocks.expenseFindUniqueOrThrow.mockResolvedValue(unlinkedExpense);
		mocks.expenseUpdate.mockResolvedValue({
			...unlinkedExpense,
			categoryId: 'category-new',
		});
		mocks.budgetFindMany.mockResolvedValue([
			envelope('budget-new', augustWindow.gte, 'category-new'),
		]);

		await ExpenseService.updateExpense('user-1', {
			id: 'expense-1',
			categoryId: 'category-new',
		});

		expect(mocks.expenseUpdate).toHaveBeenCalledWith({
			where: { id: 'expense-1', userId: 'user-1' },
			data: { categoryId: 'category-new' },
		});
		expect(mocks.budgetFindMany).not.toHaveBeenCalled();
		expect(mocks.budgetFindUnique).not.toHaveBeenCalled();
		expect(mocks.expenseAggregate).not.toHaveBeenCalled();
		expect(mocks.sendBudgetAlert).not.toHaveBeenCalled();
	});

	it('drops the link when the category changes away from the linked envelope category', async () => {
		await ExpenseService.updateExpense('user-1', {
			id: 'expense-1',
			categoryId: 'category-new',
		});

		expect(mocks.expenseUpdate).toHaveBeenCalledWith({
			where: { id: 'expense-1', userId: 'user-1' },
			data: { categoryId: 'category-new', budgetId: null },
		});
		expect(mocks.budgetFindUnique).toHaveBeenCalledExactlyOnceWith({
			where: { id: 'budget-old', userId: 'user-1' },
			select: budgetSelect,
		});
		expect(mocks.budgetFindMany).not.toHaveBeenCalled();
		expect(mocks.expenseAggregate).not.toHaveBeenCalled();
		expect(mocks.sendBudgetAlert).not.toHaveBeenCalled();
	});

	it.each([
		['before', new Date('2026-07-31T23:59:59.999Z')],
		['after', new Date('2026-09-01T00:00:00.000Z')],
	])('drops the link when the next date is %s the envelope UTC month', async (_label, date) => {
		await ExpenseService.updateExpense('user-1', { id: 'expense-1', date });

		expect(mocks.expenseUpdate).toHaveBeenCalledWith({
			where: { id: 'expense-1', userId: 'user-1' },
			data: { date, budgetId: null },
		});
		expect(mocks.budgetFindUnique).toHaveBeenCalledExactlyOnceWith({
			where: { id: 'budget-old', userId: 'user-1' },
			select: budgetSelect,
		});
		expect(mocks.budgetFindMany).not.toHaveBeenCalled();
		expect(mocks.expenseAggregate).not.toHaveBeenCalled();
		expect(mocks.sendBudgetAlert).not.toHaveBeenCalled();
	});

	it('keeps a link when the changed category matches the envelope and subtracts the old spend exactly within its own month', async () => {
		mocks.budgetFindUnique.mockResolvedValue(
			envelope('budget-old', augustWindow.gte, 'category-new')
		);
		mocks.expenseAggregate.mockResolvedValue({
			_sum: { amount: new Prisma.Decimal('0.15') },
		});

		await ExpenseService.updateExpense('user-1', {
			id: 'expense-1',
			categoryId: 'category-new',
			amount: 0.2,
		});

		expect(mocks.expenseFindUniqueOrThrow).toHaveBeenCalledExactlyOnceWith({
			where: { id: 'expense-1', userId: 'user-1' },
		});
		expect(mocks.expenseUpdate).toHaveBeenCalledWith({
			where: { id: 'expense-1', userId: 'user-1' },
			data: { categoryId: 'category-new', amount: 0.2 },
		});
		expect(mocks.budgetFindUnique).toHaveBeenCalledExactlyOnceWith({
			where: { id: 'budget-old', userId: 'user-1' },
			select: budgetSelect,
		});
		expect(mocks.budgetFindMany).not.toHaveBeenCalled();
		expect(mocks.expenseAggregate).toHaveBeenCalledWith({
			where: {
				budgetId: 'budget-old',
				userId: 'user-1',
				date: augustWindow,
			},
			_sum: { amount: true },
		});
		expect(mocks.sendBudgetAlert).toHaveBeenCalledWith(
			'user-1',
			{ id: 'budget-old', name: 'budget-old name', amount: 1 },
			0.3,
			10,
			30
		);
	});

	it.each([
		['start', augustWindow.gte],
		['end', augustWindow.lte],
	])('keeps the existing link at the inclusive %s of its UTC month', async (_label, date) => {
		mocks.expenseAggregate.mockResolvedValue({
			_sum: { amount: new Prisma.Decimal('0.15') },
		});

		await ExpenseService.updateExpense('user-1', { id: 'expense-1', date });

		expect(mocks.expenseUpdate).toHaveBeenCalledWith({
			where: { id: 'expense-1', userId: 'user-1' },
			data: { date },
		});
		expect(mocks.budgetFindMany).not.toHaveBeenCalled();
		expect(mocks.sendBudgetAlert).toHaveBeenCalledWith(
			'user-1',
			{ id: 'budget-old', name: 'budget-old name', amount: 1 },
			0.15,
			10,
			15
		);
	});

	it('rejects an explicit July budget when category and date both change to September', async () => {
		mocks.budgetFindUnique.mockResolvedValue(
			envelope('budget-explicit', new Date(Date.UTC(2026, 6, 1)))
		);

		const result = ExpenseService.updateExpense('user-1', {
			id: 'expense-1',
			categoryId: 'category-new',
			date: septemberDate,
			budgetId: 'budget-explicit',
		});

		await expect(result).rejects.toThrow('That budget is for a different category');
		await expect(result).rejects.toBeInstanceOf(BudgetLinkError);

		expect(mocks.budgetFindUnique).toHaveBeenCalledExactlyOnceWith({
			where: { id: 'budget-explicit', userId: 'user-1' },
			select: budgetSelect,
		});
		expect(mocks.budgetFindMany).not.toHaveBeenCalled();
		expect(mocks.expenseUpdate).not.toHaveBeenCalled();
		expect(mocks.accountUpdate).not.toHaveBeenCalled();
		expect(mocks.transaction).not.toHaveBeenCalled();
		expect(mocks.expenseAggregate).not.toHaveBeenCalled();
		expect(mocks.sendBudgetAlert).not.toHaveBeenCalled();
	});

	it('links an explicit budget valid against the next category and date', async () => {
		mocks.budgetFindUnique.mockResolvedValue(
			envelope('budget-explicit', new Date('2026-09-01T00:00:00.000Z'), 'category-new')
		);
		mocks.expenseAggregate.mockResolvedValue({
			_sum: { amount: new Prisma.Decimal('0.10') },
		});

		const result = await ExpenseService.updateExpense('user-1', {
			id: 'expense-1',
			categoryId: 'category-new',
			date: septemberDate,
			budgetId: 'budget-explicit',
			amount: 0.2,
		});

		expect(result).toMatchObject({ budgetId: 'budget-explicit' });
		expect(mocks.expenseUpdate).toHaveBeenCalledExactlyOnceWith({
			where: { id: 'expense-1', userId: 'user-1' },
			data: {
				categoryId: 'category-new',
				date: septemberDate,
				budgetId: 'budget-explicit',
				amount: 0.2,
			},
		});
		expect(mocks.expenseAggregate).toHaveBeenCalledExactlyOnceWith({
			where: {
				budgetId: 'budget-explicit',
				userId: 'user-1',
				date: {
					gte: new Date('2026-09-01T00:00:00.000Z'),
					lte: new Date('2026-09-30T23:59:59.999Z'),
				},
			},
			_sum: { amount: true },
		});
		expect(mocks.sendBudgetAlert).toHaveBeenCalledExactlyOnceWith(
			'user-1',
			{ id: 'budget-explicit', name: 'budget-explicit name', amount: 1 },
			0.3,
			10,
			30
		);
	});

	it.each([
		['category', { categoryId: 'category-new' }, 'That budget is for a different category'],
		['date', { date: septemberDate }, 'That budget is for a different month'],
	])('rejects an explicit budget valid only against the old %s before any write', async (_label, changes, message) => {
		const result = ExpenseService.updateExpense('user-1', {
			id: 'expense-1',
			budgetId: 'budget-old',
			amount: 0.2,
			accountId: 'account-new',
			...changes,
		});

		await expect(result).rejects.toThrow(message);
		await expect(result).rejects.toBeInstanceOf(BudgetLinkError);

		expect(mocks.expenseUpdate).not.toHaveBeenCalled();
		expect(mocks.accountUpdate).not.toHaveBeenCalled();
		expect(mocks.transaction).not.toHaveBeenCalled();
		expect(mocks.expenseAggregate).not.toHaveBeenCalled();
		expect(mocks.sendBudgetAlert).not.toHaveBeenCalled();
	});

	it('rejects an explicit unowned or nonexistent budget before any write', async () => {
		mocks.budgetFindUnique.mockResolvedValue(null);

		const result = ExpenseService.updateExpense('user-1', {
			id: 'expense-1',
			budgetId: 'budget-not-owned',
			amount: 0.2,
			accountId: 'account-new',
		});

		await expect(result).rejects.toThrow('Budget not found');
		await expect(result).rejects.not.toBeInstanceOf(BudgetLinkError);

		expect(mocks.budgetFindUnique).toHaveBeenCalledExactlyOnceWith({
			where: { id: 'budget-not-owned', userId: 'user-1' },
			select: budgetSelect,
		});
		expect(mocks.budgetFindMany).not.toHaveBeenCalled();
		expect(mocks.expenseUpdate).not.toHaveBeenCalled();
		expect(mocks.accountUpdate).not.toHaveBeenCalled();
		expect(mocks.transaction).not.toHaveBeenCalled();
	});

	it('accepts an explicit null to unlink even when category and date change', async () => {
		const input = updateExpenseSchema.parse({
			id: 'expense-1',
			budgetId: null,
			categoryId: 'category-new',
			date: septemberDate,
		});

		await ExpenseService.updateExpense('user-1', input);

		expect(mocks.expenseUpdate).toHaveBeenCalledWith({
			where: { id: 'expense-1', userId: 'user-1' },
			data: {
				budgetId: null,
				categoryId: 'category-new',
				date: septemberDate,
			},
		});
		expect(mocks.budgetFindMany).not.toHaveBeenCalled();
		expect(mocks.budgetFindUnique).not.toHaveBeenCalled();
		expect(mocks.expenseAggregate).not.toHaveBeenCalled();
		expect(mocks.sendBudgetAlert).not.toHaveBeenCalled();
	});

	it('treats a blank budget id as an unlink rather than a foreign key', async () => {
		await ExpenseService.updateExpense('user-1', {
			id: 'expense-1',
			budgetId: '',
		});

		expect(mocks.expenseUpdate).toHaveBeenCalledWith({
			where: { id: 'expense-1', userId: 'user-1' },
			data: { budgetId: null },
		});
		expect(mocks.budgetFindMany).not.toHaveBeenCalled();
		expect(mocks.budgetFindUnique).not.toHaveBeenCalled();
		expect(mocks.expenseAggregate).not.toHaveBeenCalled();
		expect(mocks.sendBudgetAlert).not.toHaveBeenCalled();
	});

	it('leaves the existing link alone without budget resolution when supplied category and date are unchanged', async () => {
		const input: UpdateExpenseInput = {
			id: 'expense-1',
			categoryId: 'category-old',
			date: new Date(augustDate.getTime()),
		};

		await ExpenseService.updateExpense('user-1', input);

		expect(mocks.expenseUpdate).toHaveBeenCalledWith({
			where: { id: 'expense-1', userId: 'user-1' },
			data: { categoryId: 'category-old', date: input.date },
		});
		expect(mocks.budgetFindMany).not.toHaveBeenCalled();
		expect(mocks.budgetFindUnique).not.toHaveBeenCalled();
		expect(mocks.expenseAggregate).not.toHaveBeenCalled();
		expect(mocks.sendBudgetAlert).not.toHaveBeenCalled();
	});
});
