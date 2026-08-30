import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	getAuthenticatedUser: vi.fn(),
	getCategorySpendComparison: vi.fn(),
}));

vi.mock('@/server/lib/auth-guard', () => ({
	getAuthenticatedUser: mocks.getAuthenticatedUser,
}));

vi.mock('./budget.analytics.service', () => ({
	BudgetAnalyticsService: {
		getCategorySpendComparison: mocks.getCategorySpendComparison,
	},
}));

import { getCategorySpendComparisonAction } from './budget.controller';

describe('getCategorySpendComparisonAction', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getAuthenticatedUser.mockResolvedValue('user-1');
	});

	it('authenticates, validates the month, and returns category movement', async () => {
		const comparison = [
			{
				categoryId: 'category-food',
				categoryName: 'Food',
				currentTotal: 500,
				previousTotal: 300,
				amountDelta: 200,
				absoluteDelta: 200,
				percentDelta: 66.66666666666667,
			},
		];
		mocks.getCategorySpendComparison.mockResolvedValue(comparison);

		await expect(
			getCategorySpendComparisonAction({
				month: '2026-08-16T00:00:00.000Z',
			})
		).resolves.toEqual({ success: true, data: comparison });
		expect(mocks.getAuthenticatedUser).toHaveBeenCalledOnce();
		expect(mocks.getCategorySpendComparison).toHaveBeenCalledWith(
			'user-1',
			new Date(Date.UTC(2026, 7, 16, 0, 0, 0, 0))
		);
	});

	it('rejects an invalid month before querying analytics', async () => {
		await expect(
			getCategorySpendComparisonAction({ month: 'not-a-date' })
		).resolves.toEqual({ error: 'Invalid month' });
		expect(mocks.getAuthenticatedUser).toHaveBeenCalledOnce();
		expect(mocks.getCategorySpendComparison).not.toHaveBeenCalled();
	});

	it('returns a safe error when category movement cannot be loaded', async () => {
		const error = new Error('database details');
		const consoleError = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		mocks.getCategorySpendComparison.mockRejectedValue(error);

		await expect(
			getCategorySpendComparisonAction({
				month: new Date(Date.UTC(2026, 7, 16, 0, 0, 0, 0)),
			})
		).resolves.toEqual({ error: 'Failed to load category spending' });
		expect(consoleError).toHaveBeenCalledWith(
			'Failed to load category spending:',
			error
		);
		consoleError.mockRestore();
	});
});
