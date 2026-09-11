import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BudgetLinkError } from '../expense/expense.types';

const mocks = vi.hoisted(() => ({
	getAuthenticatedUser: vi.fn(),
	adjustBalance: vi.fn(),
	invalidateTags: vi.fn(),
}));

vi.mock('@/server/lib/auth-guard', () => ({
	getAuthenticatedUser: mocks.getAuthenticatedUser,
}));

vi.mock('./account.service', () => ({
	AccountService: {
		adjustBalance: mocks.adjustBalance,
	},
}));

vi.mock('@/server/actions/cache', () => ({
	invalidateTags: mocks.invalidateTags,
}));

import { adjustAccountBalanceAction } from './account.controller';

describe('adjustAccountBalanceAction', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, 'error').mockImplementation(() => {});
		mocks.getAuthenticatedUser.mockResolvedValue('user-1');
		mocks.adjustBalance.mockResolvedValue({ adjusted: true });
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it.each([
		'That budget is for a different category',
		'That budget is for a different month',
		'Budget is not for the current month',
	])('surfaces the owned budget validity message: %s', async (message) => {
		mocks.adjustBalance.mockRejectedValue(new BudgetLinkError(message));

		await expect(
			adjustAccountBalanceAction({
				accountId: 'account-1',
				newBalance: 500,
				budgetId: 'budget-1',
			})
		).resolves.toEqual({ error: message });
		expect(mocks.invalidateTags).not.toHaveBeenCalled();
	});

	// The dialog renders whatever comes back, and adjustBalance throws several
	// messages the user can act on — a wrong category type, an income-direction
	// budget link, a missing account. Collapsing those into a generic string
	// would leave the user with no idea what to change.
	it.each([
		['ownership failure', new Error('Budget not found')],
		[
			'category direction mismatch',
			new Error('Category type does not match the adjustment direction'),
		],
		[
			'budget on an income adjustment',
			new Error('A budget can only be linked to an expense adjustment'),
		],
	])('surfaces the service message for %s', async (_label, error) => {
		mocks.adjustBalance.mockRejectedValue(error);

		await expect(
			adjustAccountBalanceAction({
				accountId: 'account-1',
				newBalance: 500,
				budgetId: 'budget-1',
			})
		).resolves.toEqual({ error: (error as Error).message });
		expect(mocks.invalidateTags).not.toHaveBeenCalled();
	});

	it('falls back to a generic message when the failure is not an Error', async () => {
		mocks.adjustBalance.mockRejectedValue('Database details');

		await expect(
			adjustAccountBalanceAction({
				accountId: 'account-1',
				newBalance: 500,
				budgetId: 'budget-1',
			})
		).resolves.toEqual({ error: 'Failed to adjust balance' });
		expect(mocks.invalidateTags).not.toHaveBeenCalled();
	});

	it('invalidates categories after an adjustment can create one', async () => {
		await expect(
			adjustAccountBalanceAction({
				accountId: 'account-1',
				newBalance: 1500,
				categoryName: 'Consulting',
			})
		).resolves.toEqual({ success: true });
		expect(mocks.invalidateTags).toHaveBeenCalledWith(
			'accounts',
			'incomes',
			'expenses',
			'budgets',
			'categories',
			'dashboard',
			'ledger'
		);
	});
});
