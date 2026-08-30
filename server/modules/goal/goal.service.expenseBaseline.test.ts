import { beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('GoalService.getGoalHealthMetrics — expense baseline', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		// 2026-08-30: window is May 1 -> Aug 31 = 4 months
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

	it('divides the expense sum by the number of months the window actually spans', async () => {
		// 4 months of spending at 10,000/mo = 40,000 total
		mocks.expenseAggregate.mockResolvedValue({
			_sum: { amount: new Prisma.Decimal(40000) },
		});

		const result = await GoalService.getGoalHealthMetrics('user-1');

		// Correct: 40000 / 4 = 10000. Buggy old behaviour was 40000 / 3 = 13333.33
		expect(result.monthlyExpenseBaseline).toBe(10000);
		// 120000 / 10000 = 12 months of coverage, not 9
		expect(result.emergencyFundMonths).toBe(12);
	});

	it('falls back to the envelope total only when nothing has been logged', async () => {
		mocks.expenseAggregate.mockResolvedValue({ _sum: { amount: null } });
		mocks.budgetFindMany.mockResolvedValue([
			{ amount: new Prisma.Decimal(8000) },
			{ amount: new Prisma.Decimal(4000) },
		]);

		const result = await GoalService.getGoalHealthMetrics('user-1');

		expect(result.monthlyExpenseBaseline).toBe(12000);
		expect(result.emergencyFundExpenseSource).toBe('budget');
	});
});
