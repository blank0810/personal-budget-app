import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

const mocks = vi.hoisted(() => ({
	budgetFindMany: vi.fn(),
	expenseGroupBy: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
	default: {
		budget: {
			findMany: mocks.budgetFindMany,
		},
		expense: {
			groupBy: mocks.expenseGroupBy,
		},
	},
}));

vi.mock('../category/category.service', () => ({
	CategoryService: {},
}));

import { BudgetService } from './budget.service';

describe('BudgetService — budgets page query scope', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date(Date.UTC(2026, 7, 30, 12, 0, 0, 0)));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('bounds the month list and its spend aggregate to the selected UTC month', async () => {
		mocks.budgetFindMany.mockResolvedValue([]);
		mocks.expenseGroupBy.mockResolvedValue([]);

		await BudgetService.getBudgets('user-1', {
			month: new Date(Date.UTC(2026, 7, 16, 9, 30, 0, 0)),
		});

		expect(mocks.budgetFindMany).toHaveBeenCalledWith({
			where: {
				userId: 'user-1',
				month: {
					gte: new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0)),
					lte: new Date(Date.UTC(2026, 7, 31, 23, 59, 59, 999)),
				},
			},
			include: { category: true },
			orderBy: { amount: 'desc' },
		});
		expect(mocks.expenseGroupBy).toHaveBeenCalledWith({
			by: ['budgetId'],
			where: {
				userId: 'user-1',
				budgetId: { not: null },
				date: {
					gte: new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0)),
					lte: new Date(Date.UTC(2026, 7, 31, 23, 59, 59, 999)),
				},
			},
			_sum: { amount: true },
		});
	});

	it('bounds the year overview and its spend aggregate to the visible UTC year', async () => {
		mocks.budgetFindMany.mockResolvedValue([
			{
				id: 'budget-january',
				amount: new Prisma.Decimal('100.10'),
				month: new Date(Date.UTC(2026, 0, 1, 0, 0, 0, 0)),
			},
			{
				id: 'budget-august',
				amount: new Prisma.Decimal('800.20'),
				month: new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0)),
			},
		]);
		mocks.expenseGroupBy.mockResolvedValue([
			{
				budgetId: 'budget-january',
				_sum: { amount: new Prisma.Decimal('40.04') },
			},
			{
				budgetId: 'budget-august',
				_sum: { amount: new Prisma.Decimal('900.30') },
			},
		]);

		const result = await BudgetService.getBudgetYearOverview(
			'user-1',
			new Date(Date.UTC(2026, 7, 16, 9, 30, 0, 0))
		);

		expect(mocks.budgetFindMany).toHaveBeenCalledWith({
			where: {
				userId: 'user-1',
				month: {
					gte: new Date(Date.UTC(2026, 0, 1, 0, 0, 0, 0)),
					lt: new Date(Date.UTC(2027, 0, 1, 0, 0, 0, 0)),
				},
			},
			select: {
				id: true,
				amount: true,
				month: true,
			},
			orderBy: { month: 'asc' },
		});
		expect(mocks.expenseGroupBy).toHaveBeenCalledWith({
			by: ['budgetId'],
			where: {
				userId: 'user-1',
				budgetId: {
					in: ['budget-january', 'budget-august'],
				},
				date: {
					gte: new Date(Date.UTC(2026, 0, 1, 0, 0, 0, 0)),
					lt: new Date(Date.UTC(2027, 0, 1, 0, 0, 0, 0)),
				},
				OR: [
					{
						budgetId: 'budget-january',
						date: {
							gte: new Date(Date.UTC(2026, 0, 1, 0, 0, 0, 0)),
							lte: new Date(
								Date.UTC(2026, 0, 31, 23, 59, 59, 999)
							),
						},
					},
					{
						budgetId: 'budget-august',
						date: {
							gte: new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0)),
							lte: new Date(
								Date.UTC(2026, 7, 31, 23, 59, 59, 999)
							),
						},
					},
				],
			},
			_sum: { amount: true },
		});
		expect(result).toHaveLength(12);
		expect(result[0]).toEqual({
			month: new Date(Date.UTC(2026, 0, 1, 0, 0, 0, 0)),
			monthLabel: 'January 2026',
			totalBudget: 100.1,
			totalSpent: 40.04,
			count: 1,
			isOverBudget: false,
		});
		expect(result[7]).toEqual({
			month: new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0)),
			monthLabel: 'August 2026',
			totalBudget: 800.2,
			totalSpent: 900.3,
			count: 1,
			isOverBudget: true,
		});
	});
});
