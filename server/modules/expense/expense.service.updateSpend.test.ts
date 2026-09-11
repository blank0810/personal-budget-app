import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

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
		account: {
			findUnique: mocks.accountFindUnique,
			update: mocks.accountUpdate,
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
	accountId: 'account-1',
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
		categoryId: 'category-old',
	};
}

describe('ExpenseService.updateExpense — spend recompute and balance transfer', () => {
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
		mocks.accountFindUnique.mockResolvedValue({ isLiability: false });
		mocks.accountUpdate.mockResolvedValue(undefined);
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

	it('recomputes spend and fires an alert when only the amount changes on an already-linked expense', async () => {
		const expenseWithoutAccount = { ...oldExpense, accountId: null };
		mocks.expenseFindUnique.mockResolvedValue(expenseWithoutAccount);
		mocks.expenseFindUniqueOrThrow.mockResolvedValue(expenseWithoutAccount);
		mocks.expenseAggregate.mockResolvedValue({
			_sum: { amount: new Prisma.Decimal('0.15') },
		});

		await ExpenseService.updateExpense('user-1', {
			id: 'expense-1',
			amount: 0.2,
		});

		expect(mocks.budgetFindUnique).toHaveBeenCalledExactlyOnceWith({
			where: { id: 'budget-old', userId: 'user-1' },
			select: budgetSelect,
		});
		expect(mocks.expenseAggregate).toHaveBeenCalledWith({
			where: {
				budgetId: 'budget-old',
				userId: 'user-1',
				date: augustWindow,
			},
			_sum: { amount: true },
		});
		expect(mocks.expenseUpdate).toHaveBeenCalledWith({
			where: { id: 'expense-1', userId: 'user-1' },
			data: { amount: 0.2 },
		});
		expect(mocks.sendBudgetAlert).toHaveBeenCalledWith(
			'user-1',
			{ id: 'budget-old', name: 'budget-old name', amount: 1 },
			0.3,
			10,
			30
		);
	});

	it('moves the balance between accounts without touching budget spend when only the account changes on a linked expense', async () => {
		mocks.accountFindUnique.mockImplementation(
			async ({ where }: { where: { id: string } }) => {
				if (where.id === 'account-1') return { isLiability: false };
				if (where.id === 'account-new') return { isLiability: true };
				return null;
			}
		);

		await ExpenseService.updateExpense('user-1', {
			id: 'expense-1',
			accountId: 'account-new',
		});

		expect(mocks.budgetFindUnique).not.toHaveBeenCalled();
		expect(mocks.expenseAggregate).not.toHaveBeenCalled();
		expect(mocks.sendBudgetAlert).not.toHaveBeenCalled();
		expect(mocks.expenseUpdate).toHaveBeenCalledWith({
			where: { id: 'expense-1', userId: 'user-1' },
			data: { accountId: 'account-new' },
		});
		expect(mocks.accountFindUnique).toHaveBeenCalledTimes(2);
		expect(mocks.accountFindUnique).toHaveBeenNthCalledWith(1, {
			where: { id: 'account-1', userId: 'user-1' },
			select: { isLiability: true },
		});
		expect(mocks.accountFindUnique).toHaveBeenNthCalledWith(2, {
			where: { id: 'account-new', userId: 'user-1' },
			select: { isLiability: true },
		});
		expect(mocks.accountUpdate).toHaveBeenCalledTimes(2);
		expect(mocks.accountUpdate).toHaveBeenNthCalledWith(1, {
			where: { id: 'account-1', userId: 'user-1' },
			data: { balance: { increment: oldExpense.amount } },
		});
		expect(mocks.accountUpdate).toHaveBeenNthCalledWith(2, {
			where: { id: 'account-new', userId: 'user-1' },
			data: { balance: { increment: oldExpense.amount } },
		});
	});

	it('does not re-fetch or re-alert when an explicit budgetId resubmits the same already-linked budget', async () => {
		const expenseWithoutAccount = { ...oldExpense, accountId: null };
		mocks.expenseFindUnique.mockResolvedValue(expenseWithoutAccount);
		mocks.expenseFindUniqueOrThrow.mockResolvedValue(expenseWithoutAccount);

		await ExpenseService.updateExpense('user-1', {
			id: 'expense-1',
			budgetId: 'budget-old',
		});

		expect(mocks.budgetFindUnique).toHaveBeenCalledExactlyOnceWith({
			where: { id: 'budget-old', userId: 'user-1' },
			select: { ...budgetSelect, categoryId: true },
		});
		expect(mocks.expenseAggregate).not.toHaveBeenCalled();
		expect(mocks.sendBudgetAlert).not.toHaveBeenCalled();
		expect(mocks.expenseUpdate).toHaveBeenCalledWith({
			where: { id: 'expense-1', userId: 'user-1' },
			data: { budgetId: 'budget-old' },
		});
	});

	it('keeps a link valid using a budget.month value that is not itself UTC midnight, by normalizing before comparing bounds', async () => {
		const newDate = new Date(Date.UTC(2026, 7, 5, 12));
		mocks.budgetFindUnique.mockResolvedValue({
			...envelope('budget-old', new Date(Date.UTC(2026, 7, 15, 8, 30))),
			categoryId: 'category-old',
		});
		mocks.expenseAggregate.mockResolvedValue({
			_sum: { amount: new Prisma.Decimal('0.15') },
		});

		await ExpenseService.updateExpense('user-1', {
			id: 'expense-1',
			date: newDate,
		});

		expect(mocks.budgetFindUnique).toHaveBeenCalledExactlyOnceWith({
			where: { id: 'budget-old', userId: 'user-1' },
			select: { ...budgetSelect, categoryId: true },
		});
		expect(mocks.expenseUpdate).toHaveBeenCalledWith({
			where: { id: 'expense-1', userId: 'user-1' },
			data: { date: newDate },
		});
		expect(mocks.expenseAggregate).toHaveBeenCalledWith({
			where: {
				budgetId: 'budget-old',
				userId: 'user-1',
				date: augustWindow,
			},
			_sum: { amount: true },
		});
	});

	it('drops the link when the previously-linked budget can no longer be found (e.g. deleted between the initial read and the validity check)', async () => {
		mocks.budgetFindUnique.mockResolvedValue(null);

		await ExpenseService.updateExpense('user-1', {
			id: 'expense-1',
			categoryId: 'category-new',
		});

		expect(mocks.budgetFindUnique).toHaveBeenCalledExactlyOnceWith({
			where: { id: 'budget-old', userId: 'user-1' },
			select: { ...budgetSelect, categoryId: true },
		});
		expect(mocks.expenseUpdate).toHaveBeenCalledWith({
			where: { id: 'expense-1', userId: 'user-1' },
			data: { categoryId: 'category-new', budgetId: null },
		});
		expect(mocks.expenseAggregate).not.toHaveBeenCalled();
		expect(mocks.sendBudgetAlert).not.toHaveBeenCalled();
	});
});
