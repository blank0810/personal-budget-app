import { beforeEach, describe, expect, it, vi } from 'vitest';

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
		mocks.getAuthenticatedUser.mockResolvedValue('user-1');
		mocks.adjustBalance.mockResolvedValue({ adjusted: true });
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
