import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	getAuthenticatedUser: vi.fn(),
	getAdvancedAnalytics: vi.fn(),
}));

vi.mock('@/server/lib/auth-guard', () => ({
	getAuthenticatedUser: mocks.getAuthenticatedUser,
}));

vi.mock('./budget.analytics.service', () => ({
	BudgetAnalyticsService: {
		getAdvancedAnalytics: mocks.getAdvancedAnalytics,
	},
}));

import { getAdvancedBudgetAnalyticsAction } from './budget.controller';

describe('getAdvancedBudgetAnalyticsAction', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getAuthenticatedUser.mockResolvedValue('user-1');
	});

	it('authenticates, validates, and normalizes the requested UTC month', async () => {
		const analytics = {
			month: new Date(Date.UTC(2026, 7, 1)),
			trailingMonths: 6,
			revealedBudgets: [],
			volatility: [],
			weekOfMonthVelocity: [],
			breakDays: [],
			fixedVsDiscretionary: [],
			anomalies: [],
		};
		mocks.getAdvancedAnalytics.mockResolvedValue(analytics);

		await expect(
			getAdvancedBudgetAnalyticsAction({
				month: '2026-08-16T00:00:00.000Z',
				trailingMonths: 6,
			})
		).resolves.toEqual({ success: true, data: analytics });
		expect(mocks.getAuthenticatedUser).toHaveBeenCalledOnce();
		expect(mocks.getAdvancedAnalytics).toHaveBeenCalledWith('user-1', {
			month: new Date(Date.UTC(2026, 7, 1)),
			trailingMonths: 6,
		});
	});

	it('rejects invalid history windows before querying analytics', async () => {
		await expect(
			getAdvancedBudgetAnalyticsAction({
				month: '2026-08-16T00:00:00.000Z',
				trailingMonths: 0,
			})
		).resolves.toEqual({ error: 'Invalid analytics request' });
		expect(mocks.getAuthenticatedUser).toHaveBeenCalledOnce();
		expect(mocks.getAdvancedAnalytics).not.toHaveBeenCalled();
	});

	it('returns a safe error when analytics cannot be loaded', async () => {
		const error = new Error('database details');
		const consoleError = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		mocks.getAdvancedAnalytics.mockRejectedValue(error);

		await expect(
			getAdvancedBudgetAnalyticsAction({
				month: new Date(Date.UTC(2026, 7, 1)),
				trailingMonths: 6,
			})
		).resolves.toEqual({ error: 'Failed to load budget analytics' });
		expect(consoleError).toHaveBeenCalledWith(
			'Failed to load advanced budget analytics:',
			error
		);
		consoleError.mockRestore();
	});
});
