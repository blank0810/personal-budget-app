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

describe('GoalService.getGoalHealthMetrics — expense baseline', () => {
	const expectedExpenseCall = {
		where: {
			userId: 'user-1',
			date: {
				gte: new Date(2026, 4, 1),
				lte: new Date(2026, 6, 31, 23, 59, 59, 999),
			},
		},
		_sum: { amount: true },
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		// 2026-08-30: the three complete prior months are May, June, and July.
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

	it('averages the three complete prior months', async () => {
		mocks.expenseAggregate.mockResolvedValue({
			_sum: { amount: new Prisma.Decimal(30000) },
		});

		const result = await GoalService.getGoalHealthMetrics('user-1');

		expect(mocks.expenseAggregate).toHaveBeenCalledWith(expectedExpenseCall);
		expect(result.monthlyExpenseBaseline).toBe(10000);
		expect(result.emergencyFundMonths).toBe(12);
	});

	it('does not let current-month expenses dilute the baseline', async () => {
		const expenses = [
			{ date: new Date(2026, 4, 15), amount: new Prisma.Decimal(10000) },
			{ date: new Date(2026, 5, 15), amount: new Prisma.Decimal(10000) },
			{ date: new Date(2026, 6, 15), amount: new Prisma.Decimal(10000) },
			{ date: new Date(2026, 7, 10), amount: new Prisma.Decimal(31000) },
		];
		mocks.expenseAggregate.mockImplementation(async (args) => ({
			_sum: {
				amount: expenses
					.filter(
						(expense) =>
							expense.date >= args.where.date.gte &&
							expense.date <= args.where.date.lte
					)
					.reduce(
						(sum, expense) => sum.plus(expense.amount),
						new Prisma.Decimal(0)
					),
			},
		}));

		const result = await GoalService.getGoalHealthMetrics('user-1');

		expect(mocks.expenseAggregate).toHaveBeenCalledWith(expectedExpenseCall);
		expect(result.monthlyExpenseBaseline).toBe(10000);
	});

	it('includes expenses late on the final day of the window', async () => {
		const lastWindowExpense = {
			date: new Date(2026, 6, 31, 23, 30),
			amount: new Prisma.Decimal(3000),
		};
		mocks.expenseAggregate.mockImplementation(async (args) => ({
			_sum: {
				amount:
					lastWindowExpense.date >= args.where.date.gte &&
					lastWindowExpense.date <= args.where.date.lte
						? lastWindowExpense.amount
						: new Prisma.Decimal(0),
			},
		}));

		const result = await GoalService.getGoalHealthMetrics('user-1');

		expect(mocks.expenseAggregate).toHaveBeenCalledWith(expectedExpenseCall);
		expect(result.monthlyExpenseBaseline).toBe(1000);
	});

	it('falls back to the envelope total only when nothing has been logged', async () => {
		mocks.expenseAggregate.mockResolvedValue({ _sum: { amount: null } });
		mocks.budgetFindMany.mockResolvedValue([
			{ amount: new Prisma.Decimal(8000) },
			{ amount: new Prisma.Decimal(4000) },
		]);

		const result = await GoalService.getGoalHealthMetrics('user-1');

		expect(mocks.expenseAggregate).toHaveBeenCalledWith(expectedExpenseCall);
		expect(result.monthlyExpenseBaseline).toBe(12000);
		expect(result.emergencyFundExpenseSource).toBe('budget');
	});
});
