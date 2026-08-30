import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	getAuthenticatedUser: vi.fn(),
	getBudgetsWithCoverage: vi.fn(),
	getBudgetYearOverview: vi.fn(),
	getMonthsWithBudgets: vi.fn(),
}));

vi.mock('@/server/lib/auth-guard', () => ({
	getAuthenticatedUser: mocks.getAuthenticatedUser,
}));

vi.mock('./budget.service', () => ({
	BudgetService: {
		getBudgetsWithCoverage: mocks.getBudgetsWithCoverage,
		getBudgetYearOverview: mocks.getBudgetYearOverview,
		getMonthsWithBudgets: mocks.getMonthsWithBudgets,
	},
}));

import { getBudgetsPageDataAction } from './budget.controller';

describe('getBudgetsPageDataAction', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date(Date.UTC(2026, 7, 30, 12, 0, 0, 0)));
		mocks.getAuthenticatedUser.mockResolvedValue('user-1');
		mocks.getBudgetsWithCoverage.mockResolvedValue([{ id: 'budget-1' }]);
		mocks.getBudgetYearOverview.mockResolvedValue([{ monthLabel: 'Aug 2026' }]);
		mocks.getMonthsWithBudgets.mockResolvedValue([
			new Date(Date.UTC(2026, 6, 1, 0, 0, 0, 0)),
		]);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('authenticates, validates, and normalizes the selected route month', async () => {
		const month = new Date(Date.UTC(2026, 6, 1, 0, 0, 0, 0));

		await expect(getBudgetsPageDataAction('2026-07')).resolves.toEqual({
			month,
			budgets: [{ id: 'budget-1' }],
			yearOverview: [{ monthLabel: 'Aug 2026' }],
			availableMonths: [month],
		});
		expect(mocks.getAuthenticatedUser).toHaveBeenCalledOnce();
		expect(mocks.getBudgetsWithCoverage).toHaveBeenCalledWith('user-1', {
			month,
		});
		expect(mocks.getBudgetYearOverview).toHaveBeenCalledWith(
			'user-1',
			month
		);
		expect(mocks.getMonthsWithBudgets).toHaveBeenCalledWith('user-1');
	});

	it.each([
		{ label: 'missing', value: undefined },
		{ label: 'invalid', value: '2026-13' },
	])('falls back to the current UTC month for a $label route month', async ({
		value,
	}) => {
		const currentMonth = new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0));

		const result = await getBudgetsPageDataAction(value);

		expect(result.month).toEqual(currentMonth);
		expect(mocks.getBudgetsWithCoverage).toHaveBeenCalledWith('user-1', {
			month: currentMonth,
		});
		expect(mocks.getBudgetYearOverview).toHaveBeenCalledWith(
			'user-1',
			currentMonth
		);
	});
});
