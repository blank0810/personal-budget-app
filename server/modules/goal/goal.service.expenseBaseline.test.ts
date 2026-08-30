import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

const mocks = vi.hoisted(() => ({
	goalFindMany: vi.fn(),
	expenseAggregate: vi.fn(),
	budgetFindMany: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
	default: {
		goal: { findMany: mocks.goalFindMany },
		expense: { aggregate: mocks.expenseAggregate },
		budget: { findMany: mocks.budgetFindMany },
	},
}));

import { GoalService } from './goal.service';

/** Aggregate call shape for one complete month. */
const monthCall = (gte: Date, lte: Date) => ({
	where: { userId: 'user-1', date: { gte, lte } },
	_sum: { amount: true },
});

/** Resolve the per-month aggregates in call order. */
const resolveMonths = (...totals: (number | null)[]) => {
	for (const total of totals) {
		mocks.expenseAggregate.mockResolvedValueOnce({
			_sum: { amount: total === null ? null : new Prisma.Decimal(total) },
		});
	}
};

describe('GoalService.getGoalHealthMetrics — expense baseline', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		// 2026-08-30: the three complete prior months are July, June, May.
		vi.setSystemTime(new Date(2026, 7, 30));

		mocks.goalFindMany.mockResolvedValue([
			{
				id: 'goal-1',
				goalType: 'MONTHS_COVERAGE',
				isEmergencyFund: true,
				targetAmount: new Prisma.Decimal(0),
				currentAmount: new Prisma.Decimal(0),
				thresholdLow: 2,
				thresholdMid: 4,
				thresholdHigh: 6,
				linkedAccount: { id: 'acc-1', balance: new Prisma.Decimal(120000) },
			},
		]);
		mocks.budgetFindMany.mockResolvedValue([]);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('queries each complete prior month separately, excluding the current one', async () => {
		resolveMonths(10000, 10000, 10000);

		await GoalService.getGoalHealthMetrics('user-1');

		expect(mocks.expenseAggregate).toHaveBeenCalledTimes(3);
		expect(mocks.expenseAggregate).toHaveBeenNthCalledWith(
			1,
			monthCall(new Date(2026, 6, 1), new Date(2026, 6, 31, 23, 59, 59, 999))
		);
		expect(mocks.expenseAggregate).toHaveBeenNthCalledWith(
			2,
			monthCall(new Date(2026, 5, 1), new Date(2026, 5, 30, 23, 59, 59, 999))
		);
		expect(mocks.expenseAggregate).toHaveBeenNthCalledWith(
			3,
			monthCall(new Date(2026, 4, 1), new Date(2026, 4, 31, 23, 59, 59, 999))
		);
	});

	it('averages three complete months of steady spending', async () => {
		resolveMonths(10000, 10000, 10000);

		const result = await GoalService.getGoalHealthMetrics('user-1');

		expect(result.monthlyExpenseBaseline).toBe(10000);
		expect(result.emergencyFundMonths).toBe(12);
		expect(result.emergencyFundExpenseSource).toBe('actual');
	});

	it('divides by the months that hold data, not a fixed three', async () => {
		// Only one complete month has spending. Dividing by 3 would report a
		// 10,000 baseline and treble the apparent runway.
		resolveMonths(30000, null, null);

		const result = await GoalService.getGoalHealthMetrics('user-1');

		expect(result.monthlyExpenseBaseline).toBe(30000);
		expect(result.emergencyFundMonths).toBe(4);
	});

	it('ignores months with no spending when averaging', async () => {
		resolveMonths(8000, 0, 12000);

		const result = await GoalService.getGoalHealthMetrics('user-1');

		expect(result.monthlyExpenseBaseline).toBe(10000);
	});

	it('falls back to the envelope total when nothing has been logged', async () => {
		resolveMonths(null, null, null);
		mocks.budgetFindMany.mockResolvedValue([
			{ amount: new Prisma.Decimal(8000) },
			{ amount: new Prisma.Decimal(4000) },
		]);

		const result = await GoalService.getGoalHealthMetrics('user-1');

		expect(result.monthlyExpenseBaseline).toBe(12000);
		expect(result.emergencyFundExpenseSource).toBe('budget');
	});

	it('reports insufficient data with neither expenses nor envelopes', async () => {
		resolveMonths(null, null, null);

		const result = await GoalService.getGoalHealthMetrics('user-1');

		expect(result.emergencyFundExpenseSource).toBeNull();
		expect(result.goals[0].healthStatus).toBe('insufficient_data');
	});

	it('rolls the window back across a year boundary', async () => {
		// January 2027: the three complete prior months are Dec, Nov, Oct 2026.
		vi.setSystemTime(new Date(2027, 0, 5));
		resolveMonths(9000, 9000, 9000);

		await GoalService.getGoalHealthMetrics('user-1');

		expect(mocks.expenseAggregate).toHaveBeenNthCalledWith(
			1,
			monthCall(new Date(2026, 11, 1), new Date(2026, 11, 31, 23, 59, 59, 999))
		);
		expect(mocks.expenseAggregate).toHaveBeenNthCalledWith(
			3,
			monthCall(new Date(2026, 9, 1), new Date(2026, 9, 31, 23, 59, 59, 999))
		);
	});

	it('keeps cent precision across months', async () => {
		resolveMonths(0.1, 0.2, 0.3);

		const result = await GoalService.getGoalHealthMetrics('user-1');

		// 0.6 / 3 — a float reduction would drift here.
		expect(result.monthlyExpenseBaseline).toBe(0.2);
	});
});
