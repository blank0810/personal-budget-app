// Budget has no stored "spent" total (see prisma/schema.prisma model Budget).
// Envelope spend is derived by aggregating the expenses relation at read time
// (see server/modules/budget/budget.service.ts), so deleting the expense row
// itself reverses the envelope total. There is deliberately no separate
// budget-side mutation in _deleteExpenseInTx to test for.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

const mocks = vi.hoisted(() => ({
	transaction: vi.fn(),
	expenseFindUniqueOrThrow: vi.fn(),
	expenseDelete: vi.fn(),
	accountFindUnique: vi.fn(),
	accountUpdate: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
	default: {
		$transaction: mocks.transaction,
		expense: {
			findUniqueOrThrow: mocks.expenseFindUniqueOrThrow,
			delete: mocks.expenseDelete,
		},
		account: {
			findUnique: mocks.accountFindUnique,
			update: mocks.accountUpdate,
		},
	},
}));

vi.mock('@/server/modules/notification/notification.service', () => ({
	NotificationService: {
		sendBudgetAlert: vi.fn(),
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

const expense = {
	id: 'expense-1',
	userId: 'user-1',
	accountId: 'account-1',
	amount: new Prisma.Decimal('45.00'),
	budgetId: 'budget-old',
	categoryId: 'category-old',
	date: new Date(Date.UTC(2026, 7, 17)),
	description: 'Groceries',
	notes: null,
	createdAt: new Date(Date.UTC(2026, 7, 17)),
	updatedAt: new Date(Date.UTC(2026, 7, 17)),
};

describe('ExpenseService.deleteExpense', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date(Date.UTC(2026, 8, 15, 12)));
		mocks.expenseFindUniqueOrThrow.mockResolvedValue(expense);
		mocks.expenseDelete.mockResolvedValue(expense);
		mocks.accountFindUnique.mockResolvedValue({ isLiability: false });
		mocks.accountUpdate.mockResolvedValue(undefined);
		mocks.transaction.mockImplementation(
			async (callback: (tx: unknown) => unknown) =>
				callback({
					expense: {
						findUniqueOrThrow: mocks.expenseFindUniqueOrThrow,
						delete: mocks.expenseDelete,
					},
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

	it('refunds an asset account\'s balance and deletes the expense row', async () => {
		const result = await ExpenseService.deleteExpense('user-1', 'expense-1');

		expect(mocks.transaction).toHaveBeenCalledExactlyOnceWith(expect.any(Function));
		expect(mocks.expenseFindUniqueOrThrow).toHaveBeenCalledWith({
			where: { id: 'expense-1', userId: 'user-1' },
		});
		expect(mocks.accountFindUnique).toHaveBeenCalledWith({
			where: { id: 'account-1', userId: 'user-1' },
			select: { isLiability: true },
		});
		expect(mocks.accountUpdate).toHaveBeenCalledWith({
			where: { id: 'account-1', userId: 'user-1' },
			data: { balance: { increment: new Prisma.Decimal('45.00') } },
		});
		expect(mocks.expenseDelete).toHaveBeenCalledWith({
			where: { id: 'expense-1', userId: 'user-1' },
		});
		expect(result).toEqual(expense);
	});

	it('reduces a liability account\'s debt and deletes the expense row', async () => {
		mocks.accountFindUnique.mockResolvedValue({ isLiability: true });

		const result = await ExpenseService.deleteExpense('user-1', 'expense-1');

		expect(mocks.transaction).toHaveBeenCalledExactlyOnceWith(expect.any(Function));
		expect(mocks.expenseFindUniqueOrThrow).toHaveBeenCalledWith({
			where: { id: 'expense-1', userId: 'user-1' },
		});
		expect(mocks.accountFindUnique).toHaveBeenCalledWith({
			where: { id: 'account-1', userId: 'user-1' },
			select: { isLiability: true },
		});
		expect(mocks.accountUpdate).toHaveBeenCalledWith({
			where: { id: 'account-1', userId: 'user-1' },
			data: { balance: { decrement: new Prisma.Decimal('45.00') } },
		});
		expect(mocks.expenseDelete).toHaveBeenCalledWith({
			where: { id: 'expense-1', userId: 'user-1' },
		});
		expect(result).toEqual(expense);
	});

	it('performs no account mutation when the expense has no linked account', async () => {
		const expenseWithoutAccount = { ...expense, accountId: null };
		mocks.expenseFindUniqueOrThrow.mockResolvedValue(expenseWithoutAccount);
		mocks.expenseDelete.mockResolvedValue(expenseWithoutAccount);

		const result = await ExpenseService.deleteExpense('user-1', 'expense-1');

		expect(mocks.transaction).toHaveBeenCalledExactlyOnceWith(expect.any(Function));
		expect(mocks.expenseFindUniqueOrThrow).toHaveBeenCalledWith({
			where: { id: 'expense-1', userId: 'user-1' },
		});
		expect(mocks.accountFindUnique).not.toHaveBeenCalled();
		expect(mocks.accountUpdate).not.toHaveBeenCalled();
		expect(mocks.expenseDelete).toHaveBeenCalledWith({
			where: { id: 'expense-1', userId: 'user-1' },
		});
		expect(result).toEqual(expenseWithoutAccount);
	});
});
