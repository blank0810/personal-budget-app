import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

const mocks = vi.hoisted(() => ({
	budgetFindMany: vi.fn(),
	expenseGroupBy: vi.fn(),
	getCoverageRatios: vi.fn(),
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

vi.mock('./budget.analytics.service', () => ({
	BudgetAnalyticsService: {
		getCoverageRatios: mocks.getCoverageRatios,
	},
}));

import { BudgetService } from './budget.service';

describe('BudgetService.getBudgetRecommendations', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date(Date.UTC(2026, 7, 30, 12, 0, 0, 0)));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns a neutral building-history state for one observed month', async () => {
		mocks.budgetFindMany.mockResolvedValue([
			{
				id: 'budget-july',
				name: 'Groceries',
				amount: new Prisma.Decimal('500.00'),
				month: new Date(Date.UTC(2026, 6, 1, 0, 0, 0, 0)),
				categoryId: 'category-food',
				userId: 'user-1',
				category: { id: 'category-food', name: 'Food' },
			},
		]);
		mocks.expenseGroupBy.mockResolvedValue([
			{
				budgetId: 'budget-july',
				_sum: { amount: new Prisma.Decimal('400.00') },
			},
		]);

		const result = await BudgetService.getBudgetRecommendations('user-1', 6);

		expect(mocks.budgetFindMany).toHaveBeenCalledWith({
			where: {
				userId: 'user-1',
				month: {
					gte: new Date(Date.UTC(2026, 2, 1, 0, 0, 0, 0)),
					lte: new Date(Date.UTC(2026, 7, 31, 23, 59, 59, 999)),
				},
			},
			include: { category: true },
		});
		expect(mocks.expenseGroupBy).toHaveBeenCalledWith({
			by: ['budgetId'],
			where: {
				userId: 'user-1',
				budgetId: { in: ['budget-july'] },
				date: {
					gte: new Date(Date.UTC(2026, 2, 1, 0, 0, 0, 0)),
					lte: new Date(Date.UTC(2026, 7, 31, 23, 59, 59, 999)),
				},
				OR: [
					{
						budgetId: 'budget-july',
						date: {
							gte: new Date(Date.UTC(2026, 6, 1, 0, 0, 0, 0)),
							lte: new Date(
								Date.UTC(2026, 6, 31, 23, 59, 59, 999)
							),
						},
					},
				],
			},
			_sum: { amount: true },
		});
		expect(result).toEqual([
			{
				categoryId: 'category-food',
				categoryName: 'Food',
				monthsAnalyzed: 1,
				avgBudget: 500,
				avgSpent: 400,
				variance: -20,
				monthsOver: 0,
				monthsUnder: 0,
				recommendation: 'insufficient_history',
				suggestedAmount: null,
				trend: 'Building history (1/3 mo)',
			},
		]);
	});

	it('suggests the trailing Decimal median without inflating chronic overspend', async () => {
		const budgets = [
			{
				id: 'budget-june',
				name: 'Groceries',
				amount: new Prisma.Decimal('50.00'),
				month: new Date(Date.UTC(2026, 5, 1, 0, 0, 0, 0)),
				categoryId: 'category-food',
				userId: 'user-1',
				category: { id: 'category-food', name: 'Food' },
			},
			{
				id: 'budget-july',
				name: 'Groceries',
				amount: new Prisma.Decimal('50.00'),
				month: new Date(Date.UTC(2026, 6, 1, 0, 0, 0, 0)),
				categoryId: 'category-food',
				userId: 'user-1',
				category: { id: 'category-food', name: 'Food' },
			},
			{
				id: 'budget-august',
				name: 'Groceries',
				amount: new Prisma.Decimal('50.00'),
				month: new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0)),
				categoryId: 'category-food',
				userId: 'user-1',
				category: { id: 'category-food', name: 'Food' },
			},
		];
		mocks.budgetFindMany.mockResolvedValue(budgets);
		mocks.expenseGroupBy.mockResolvedValue([
			{
				budgetId: 'budget-june',
				_sum: { amount: new Prisma.Decimal('100.00') },
			},
			{
				budgetId: 'budget-july',
				_sum: { amount: new Prisma.Decimal('110.00') },
			},
			{
				budgetId: 'budget-august',
				_sum: { amount: new Prisma.Decimal('1000.00') },
			},
		]);

		const result = await BudgetService.getBudgetRecommendations('user-1', 6);

		expect(mocks.budgetFindMany).toHaveBeenCalledWith({
			where: {
				userId: 'user-1',
				month: {
					gte: new Date(Date.UTC(2026, 2, 1, 0, 0, 0, 0)),
					lte: new Date(Date.UTC(2026, 7, 31, 23, 59, 59, 999)),
				},
			},
			include: { category: true },
		});
		expect(mocks.expenseGroupBy).toHaveBeenCalledWith({
			by: ['budgetId'],
			where: {
				userId: 'user-1',
				budgetId: {
					in: ['budget-june', 'budget-july', 'budget-august'],
				},
				date: {
					gte: new Date(Date.UTC(2026, 2, 1, 0, 0, 0, 0)),
					lte: new Date(Date.UTC(2026, 7, 31, 23, 59, 59, 999)),
				},
				OR: [
					{
						budgetId: 'budget-june',
						date: {
							gte: new Date(Date.UTC(2026, 5, 1, 0, 0, 0, 0)),
							lte: new Date(
								Date.UTC(2026, 5, 30, 23, 59, 59, 999)
							),
						},
					},
					{
						budgetId: 'budget-july',
						date: {
							gte: new Date(Date.UTC(2026, 6, 1, 0, 0, 0, 0)),
							lte: new Date(
								Date.UTC(2026, 6, 31, 23, 59, 59, 999)
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
		expect(result).toEqual([
			{
				categoryId: 'category-food',
				categoryName: 'Food',
				monthsAnalyzed: 3,
				avgBudget: 50,
				avgSpent: 403.33,
				variance: 706.7,
				monthsOver: 3,
				monthsUnder: 0,
				recommendation: 'increase',
				suggestedAmount: 110,
				trend: 'Over 3/3 months',
			},
		]);
	});
});
