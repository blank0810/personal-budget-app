import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	getAuthenticatedUser: vi.fn(),
	getBudgetHealthSummary: vi.fn(),
}));

vi.mock('@/server/lib/auth-guard', () => ({
	getAuthenticatedUser: mocks.getAuthenticatedUser,
}));

vi.mock('./budget.service', () => ({
	BudgetService: {
		getBudgetHealthSummary: mocks.getBudgetHealthSummary,
	},
}));

import { getBudgetHealthSummaryAction } from './budget.controller';

describe('getBudgetHealthSummaryAction', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getAuthenticatedUser.mockResolvedValue('user-1');
	});

	it('authenticates and returns the month-scoped health summary', async () => {
		const month = new Date(2026, 7, 1);
		const health = {
			totalBudgets: 4,
			onTrack: 1,
			warning: 1,
			over: 1,
			incomplete: 1,
			totalBudgeted: 4000,
			totalSpent: 3200,
			problemCategories: [],
		};
		mocks.getBudgetHealthSummary.mockResolvedValue(health);

		await expect(getBudgetHealthSummaryAction(month)).resolves.toEqual({
			success: true,
			data: health,
		});
		expect(mocks.getAuthenticatedUser).toHaveBeenCalledOnce();
		expect(mocks.getBudgetHealthSummary).toHaveBeenCalledWith(
			'user-1',
			month
		);
	});

	it('returns a safe error when the summary cannot be loaded', async () => {
		const error = new Error('database details');
		const consoleError = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		mocks.getBudgetHealthSummary.mockRejectedValue(error);

		await expect(getBudgetHealthSummaryAction()).resolves.toEqual({
			error: 'Failed to load budget health',
		});
		expect(mocks.getBudgetHealthSummary).toHaveBeenCalledWith(
			'user-1',
			undefined
		);
		expect(consoleError).toHaveBeenCalledWith(
			'Failed to load budget health:',
			error
		);
		consoleError.mockRestore();
	});
});
