import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { BudgetLinkError } from '../expense/expense.types';

const D = Prisma.Decimal;

// ---------------------------------------------------------------------------
// Hoisted spy / state factory.
//
// Vitest hoists vi.mock factories to the top of the file. vi.hoisted lets
// us share spies and mutable query results between those factories and tests.
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => {
	type Account = {
		id: string;
		balance: Prisma.Decimal;
		isLiability: boolean;
	};
	type Category = {
		id: string;
		type: 'INCOME' | 'EXPENSE';
	};
	type Budget = {
		id: string;
		categoryId: string;
		month: Date;
	};

	const state: {
		account: Account | null;
		category: Category | null;
		budget: Budget | null;
	} = {
		account: null,
		category: null,
		budget: null,
	};

	const accountFindUnique = vi.fn();
	const categoryFindUnique = vi.fn();
	const budgetFindUnique = vi.fn();
	const createIncome = vi.fn();
	const createExpense = vi.fn();

	return {
		state,
		accountFindUnique,
		categoryFindUnique,
		budgetFindUnique,
		createIncome,
		createExpense,
	};
});

vi.mock('@/lib/prisma', () => ({
	default: {
		account: {
			findUnique: mocks.accountFindUnique,
		},
		category: {
			findUnique: mocks.categoryFindUnique,
		},
		budget: {
			findUnique: mocks.budgetFindUnique,
		},
	},
}));

vi.mock('../income/income.service', () => ({
	IncomeService: {
		createIncome: mocks.createIncome,
	},
}));

vi.mock('../expense/expense.service', () => ({
	ExpenseService: {
		createExpense: mocks.createExpense,
	},
}));

import { AccountService } from './account.service';

type ServicePayload = Record<string, unknown>;

function currentMonth(): Date {
	const now = new Date();
	return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function incomePayload(callIndex = 0): ServicePayload {
	return mocks.createIncome.mock.calls[callIndex][1] as ServicePayload;
}

function expensePayload(callIndex = 0): ServicePayload {
	return mocks.createExpense.mock.calls[callIndex][1] as ServicePayload;
}

describe('AccountService.adjustBalance', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-08-17T12:00:00.000Z'));

		mocks.state.account = {
			id: 'account-1',
			balance: new D(1000),
			isLiability: false,
		};
		mocks.state.category = null;
		mocks.state.budget = null;

		mocks.accountFindUnique.mockImplementation(
			async () => mocks.state.account
		);
		mocks.categoryFindUnique.mockImplementation(
			async () => mocks.state.category
		);
		mocks.budgetFindUnique.mockImplementation(
			async () => mocks.state.budget
		);
		mocks.createIncome.mockResolvedValue(undefined);
		mocks.createExpense.mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllEnvs();
	});

	it('uses income fallbacks when all optional fields are blank', async () => {
		await AccountService.adjustBalance('user-1', {
			accountId: 'account-1',
			newBalance: 1500,
			description: '',
			categoryId: '',
			categoryName: '',
			budgetId: '',
		});

		expect(mocks.createIncome).toHaveBeenCalledWith('user-1', {
			amount: 500,
			date: expect.any(Date),
			description: 'Manual Balance Adjustment',
			categoryName: 'Initial Balance/Adjustment',
			accountId: 'account-1',
			titheEnabled: false,
			tithePercentage: 0,
			emergencyFundEnabled: false,
			emergencyFundPercentage: 0,
		});
		expect(incomePayload()).not.toHaveProperty('categoryId');
		expect(mocks.createExpense).not.toHaveBeenCalled();
	});

	it('uses expense fallbacks when all optional fields are blank', async () => {
		await AccountService.adjustBalance('user-1', {
			accountId: 'account-1',
			newBalance: 500,
			description: '',
			categoryId: '',
			categoryName: '',
			budgetId: '',
		});

		expect(mocks.createExpense).toHaveBeenCalledWith('user-1', {
			amount: 500,
			date: expect.any(Date),
			description: 'Manual Balance Adjustment',
			categoryName: 'Initial Balance/Adjustment',
			accountId: 'account-1',
		});
		expect(expensePayload()).not.toHaveProperty('budgetId');
		expect(mocks.createIncome).not.toHaveBeenCalled();
	});

	it('does nothing when the delta is below one cent', async () => {
		const result = await AccountService.adjustBalance('user-1', {
			accountId: 'account-1',
			newBalance: 1000.005,
		});

		expect(result).toEqual({ adjusted: false });
		expect(mocks.createIncome).not.toHaveBeenCalled();
		expect(mocks.createExpense).not.toHaveBeenCalled();
	});

	it('trims a non-blank description', async () => {
		await AccountService.adjustBalance('user-1', {
			accountId: 'account-1',
			newBalance: 1500,
			description: '  Cash spent at the market  ',
		});

		expect(mocks.createIncome).toHaveBeenCalledWith('user-1', {
			amount: 500,
			date: expect.any(Date),
			description: 'Cash spent at the market',
			categoryName: 'Initial Balance/Adjustment',
			accountId: 'account-1',
			titheEnabled: false,
			tithePercentage: 0,
			emergencyFundEnabled: false,
			emergencyFundPercentage: 0,
		});
	});

	it('uses the description fallback for whitespace-only input', async () => {
		await AccountService.adjustBalance('user-1', {
			accountId: 'account-1',
			newBalance: 1500,
			description: '   ',
		});

		expect(incomePayload()).toMatchObject({
			description: 'Manual Balance Adjustment',
		});
	});

	it('routes liability increases to expense and decreases to income', async () => {
		mocks.state.account = {
			id: 'liability-1',
			balance: new D(1000),
			isLiability: true,
		};

		await AccountService.adjustBalance('user-1', {
			accountId: 'liability-1',
			newBalance: 1500,
		});
		await AccountService.adjustBalance('user-1', {
			accountId: 'liability-1',
			newBalance: 500,
		});

		expect(mocks.createExpense).toHaveBeenCalledWith('user-1', {
			amount: 500,
			date: expect.any(Date),
			description: 'Manual Balance Adjustment',
			categoryName: 'Initial Balance/Adjustment',
			accountId: 'liability-1',
		});
		expect(mocks.createIncome).toHaveBeenCalledWith('user-1', {
			amount: 500,
			date: expect.any(Date),
			description: 'Manual Balance Adjustment',
			categoryName: 'Initial Balance/Adjustment',
			accountId: 'liability-1',
			titheEnabled: false,
			tithePercentage: 0,
			emergencyFundEnabled: false,
			emergencyFundPercentage: 0,
		});
	});

	it('passes through a valid expense category id', async () => {
		mocks.state.category = {
			id: 'expense-category',
			type: 'EXPENSE',
		};

		await AccountService.adjustBalance('user-1', {
			accountId: 'account-1',
			newBalance: 500,
			categoryId: 'expense-category',
		});

		expect(mocks.createExpense).toHaveBeenCalledWith('user-1', {
			amount: 500,
			date: expect.any(Date),
			description: 'Manual Balance Adjustment',
			categoryId: 'expense-category',
			accountId: 'account-1',
		});
		expect(expensePayload()).not.toHaveProperty('categoryName');
	});

	it('rejects a category whose type does not match the adjustment direction', async () => {
		mocks.state.category = {
			id: 'income-category',
			type: 'INCOME',
		};

		await expect(
			AccountService.adjustBalance('user-1', {
				accountId: 'account-1',
				newBalance: 500,
				categoryId: 'income-category',
			})
		).rejects.toThrow(
			'Category type does not match the adjustment direction'
		);
		expect(mocks.createExpense).not.toHaveBeenCalled();
	});

	it('rejects an unknown or other-user category id', async () => {
		mocks.state.category = null;

		await expect(
			AccountService.adjustBalance('user-1', {
				accountId: 'account-1',
				newBalance: 500,
				categoryId: 'missing-category',
			})
		).rejects.toThrow('Category not found');
		expect(mocks.createExpense).not.toHaveBeenCalled();
	});

	it('passes through a custom category name when no category id is given', async () => {
		await AccountService.adjustBalance('user-1', {
			accountId: 'account-1',
			newBalance: 500,
			categoryName: 'Street food',
		});

		expect(mocks.createExpense).toHaveBeenCalledWith('user-1', {
			amount: 500,
			date: expect.any(Date),
			description: 'Manual Balance Adjustment',
			categoryName: 'Street food',
			accountId: 'account-1',
		});
		expect(expensePayload()).not.toHaveProperty('categoryId');
	});

	it('rejects a budget on an income-direction adjustment', async () => {
		await expect(
			AccountService.adjustBalance('user-1', {
				accountId: 'account-1',
				newBalance: 1500,
				budgetId: 'budget-1',
			})
		).rejects.toThrow(
			'A budget can only be linked to an expense adjustment'
		);
		expect(mocks.createIncome).not.toHaveBeenCalled();
	});

	it('rejects an unknown or other-user budget id', async () => {
		mocks.state.budget = null;

		const result = AccountService.adjustBalance('user-1', {
			accountId: 'account-1',
			newBalance: 500,
			budgetId: 'missing-budget',
		});

		await expect(result).rejects.toThrow('Budget not found');
		await expect(result).rejects.not.toBeInstanceOf(BudgetLinkError);
		expect(mocks.createExpense).not.toHaveBeenCalled();
	});

	it('rejects a budget from a different month', async () => {
		const now = new Date();
		mocks.state.budget = {
			id: 'budget-1',
			categoryId: 'budget-category',
			month: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)),
		};

		const result = AccountService.adjustBalance('user-1', {
			accountId: 'account-1',
			newBalance: 500,
			budgetId: 'budget-1',
		});

		await expect(result).rejects.toThrow('Budget is not for the current month');
		await expect(result).rejects.toBeInstanceOf(BudgetLinkError);
		expect(mocks.createExpense).not.toHaveBeenCalled();
	});

	it('uses a current-month budget and overrides a conflicting client category', async () => {
		mocks.state.category = {
			id: 'client-category',
			type: 'EXPENSE',
		};
		mocks.state.budget = {
			id: 'budget-1',
			categoryId: 'budget-category',
			month: currentMonth(),
		};

		await AccountService.adjustBalance('user-1', {
			accountId: 'account-1',
			newBalance: 500,
			categoryId: 'client-category',
			categoryName: 'Ignored category',
			budgetId: 'budget-1',
		});

		expect(mocks.createExpense).toHaveBeenCalledWith('user-1', {
			amount: 500,
			date: expect.any(Date),
			description: 'Manual Balance Adjustment',
			categoryId: 'budget-category',
			accountId: 'account-1',
			budgetId: 'budget-1',
		});
		expect(expensePayload()).not.toHaveProperty('categoryName');
	});

	describe.each(['UTC', 'America/Los_Angeles', 'Asia/Manila'])('budget UTC month on a %s host', (timeZone) => {
		beforeEach(() => {
			vi.stubEnv('TZ', timeZone);
			mocks.state.budget = {
				id: 'budget-1',
				categoryId: 'budget-category',
				month: new Date('2026-08-01T00:00:00.000Z'),
			};
		});

		it.each([
			['first millisecond', '2026-08-01T00:00:00.000Z'],
			['middle of month', '2026-08-17T12:00:00.000Z'],
			['last millisecond', '2026-08-31T23:59:59.999Z'],
		])('accepts the %s of the envelope UTC month', async (_label, timestamp) => {
			const date = new Date(timestamp);
			vi.setSystemTime(date);

			await expect(
				AccountService.adjustBalance('user-1', {
					accountId: 'account-1',
					newBalance: 500,
					budgetId: 'budget-1',
				})
			).resolves.toEqual({ adjusted: true });

			expect(mocks.budgetFindUnique).toHaveBeenCalledExactlyOnceWith({
				where: { id: 'budget-1', userId: 'user-1' },
				select: { id: true, categoryId: true, month: true },
			});
			expect(mocks.createExpense).toHaveBeenCalledExactlyOnceWith('user-1', {
				amount: 500,
				date,
				description: 'Manual Balance Adjustment',
				categoryId: 'budget-category',
				accountId: 'account-1',
				budgetId: 'budget-1',
			});
			expect(mocks.createIncome).not.toHaveBeenCalled();
		});

		it.each([
			['before', '2026-07-31T23:59:59.999Z'],
			['after', '2026-09-01T00:00:00.000Z'],
		])('rejects one millisecond %s the envelope UTC month', async (_label, timestamp) => {
			vi.setSystemTime(new Date(timestamp));

			const result = AccountService.adjustBalance('user-1', {
				accountId: 'account-1',
				newBalance: 500,
				budgetId: 'budget-1',
			});

			await expect(result).rejects.toThrow('Budget is not for the current month');
			await expect(result).rejects.toBeInstanceOf(BudgetLinkError);

			expect(mocks.createExpense).not.toHaveBeenCalled();
			expect(mocks.createIncome).not.toHaveBeenCalled();
		});
	});

	it('disables tithe and emergency-fund transfers for categorized income adjustments', async () => {
		mocks.state.category = {
			id: 'salary-category',
			type: 'INCOME',
		};

		await AccountService.adjustBalance('user-1', {
			accountId: 'account-1',
			newBalance: 1500,
			categoryId: 'salary-category',
		});

		// Re-enabling these would make a balance reconciliation silently move
		// money into the tithe account and the emergency-fund goal.
		expect(mocks.createIncome).toHaveBeenCalledWith('user-1', {
			amount: 500,
			date: expect.any(Date),
			description: 'Manual Balance Adjustment',
			categoryId: 'salary-category',
			accountId: 'account-1',
			titheEnabled: false,
			tithePercentage: 0,
			emergencyFundEnabled: false,
			emergencyFundPercentage: 0,
		});
	});

	it('rejects an unknown or other-user account id', async () => {
		mocks.state.account = null;

		await expect(
			AccountService.adjustBalance('user-1', {
				accountId: 'missing-account',
				newBalance: 1500,
			})
		).rejects.toThrow('Account not found');
		expect(mocks.createIncome).not.toHaveBeenCalled();
		expect(mocks.createExpense).not.toHaveBeenCalled();
	});
});
