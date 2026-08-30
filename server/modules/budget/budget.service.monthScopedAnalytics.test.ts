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

describe('BudgetService — month-scoped analytics spend', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 7, 30, 12));
		mocks.getCoverageRatios.mockImplementation(
			async (
				_userId: string,
				envelopes: Array<{ id: string }>
			) =>
				envelopes.map((envelope) => ({
					budgetId: envelope.id,
					linkedSpend: 0,
					unlinkedSameCategorySpend: 0,
					unlinkedExpenseCount: 0,
					coverageRatio: null,
				}))
		);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('excludes spend outside each envelope month from budget trends', async () => {
		const januaryBudget = {
			id: 'budget-january',
			name: 'Groceries',
			amount: new Prisma.Decimal(1000),
			month: new Date(2026, 0, 1),
			categoryId: 'category-food',
			userId: 'user-1',
			category: { id: 'category-food', name: 'Food' },
			// Regression fixture: this linked expense belongs to February and must
			// not be read from an eager relation on the January envelope.
			expenses: [
				{ date: new Date(2026, 1, 2), amount: new Prisma.Decimal(900) },
			],
		};
		const februaryBudget = {
			...januaryBudget,
			id: 'budget-february',
			month: new Date(2026, 1, 1),
			expenses: [],
		};
		mocks.budgetFindMany.mockResolvedValue([
			januaryBudget,
			februaryBudget,
		]);
		mocks.expenseGroupBy.mockResolvedValue([
			{
				budgetId: 'budget-january',
				_sum: { amount: new Prisma.Decimal(400) },
			},
			{
				budgetId: 'budget-february',
				_sum: { amount: new Prisma.Decimal(200) },
			},
		]);

		const result = await BudgetService.getBudgetTrends(
			'user-1',
			new Date(2026, 0, 12),
			new Date(2026, 1, 12)
		);

		expect(mocks.budgetFindMany).toHaveBeenCalledWith({
			where: {
				userId: 'user-1',
				month: {
					gte: new Date(2026, 0, 1),
					lte: new Date(2026, 1, 28, 23, 59, 59, 999),
				},
			},
			include: { category: true },
			orderBy: { month: 'asc' },
		});
		expect(mocks.expenseGroupBy).toHaveBeenCalledWith({
			by: ['budgetId'],
			where: {
				userId: 'user-1',
				budgetId: { in: ['budget-january', 'budget-february'] },
				date: {
					gte: new Date(2026, 0, 1),
					lte: new Date(2026, 1, 28, 23, 59, 59, 999),
				},
				OR: [
					{
						budgetId: 'budget-january',
						date: {
							gte: new Date(2026, 0, 1),
							lte: new Date(2026, 0, 31, 23, 59, 59, 999),
						},
					},
					{
						budgetId: 'budget-february',
						date: {
							gte: new Date(2026, 1, 1),
							lte: new Date(2026, 1, 28, 23, 59, 59, 999),
						},
					},
				],
			},
			_sum: { amount: true },
		});
		expect(result.map((month) => month.totalSpent)).toEqual([400, 200]);
	});

	it('excludes spend outside the envelope month from recommendations', async () => {
		mocks.budgetFindMany.mockResolvedValue([
			{
				id: 'budget-july',
				name: 'Groceries',
				amount: new Prisma.Decimal(1000),
				month: new Date(2026, 6, 1),
				categoryId: 'category-food',
				userId: 'user-1',
				category: { id: 'category-food', name: 'Food' },
				expenses: [
					{ date: new Date(2026, 6, 12), amount: new Prisma.Decimal(400) },
					{ date: new Date(2026, 7, 2), amount: new Prisma.Decimal(900) },
				],
			},
		]);
		mocks.expenseGroupBy.mockResolvedValue([
			{
				budgetId: 'budget-july',
				_sum: { amount: new Prisma.Decimal(400) },
			},
		]);

		const result = await BudgetService.getBudgetRecommendations('user-1', 6);

		expect(mocks.budgetFindMany).toHaveBeenCalledWith({
			where: {
				userId: 'user-1',
				month: {
					gte: new Date(2026, 2, 1),
					lte: new Date(2026, 7, 31, 23, 59, 59, 999),
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
					gte: new Date(2026, 2, 1),
					lte: new Date(2026, 7, 31, 23, 59, 59, 999),
				},
				OR: [
					{
						budgetId: 'budget-july',
						date: {
							gte: new Date(2026, 6, 1),
							lte: new Date(2026, 6, 31, 23, 59, 59, 999),
						},
					},
				],
			},
			_sum: { amount: true },
		});
		expect(result).toHaveLength(1);
		expect(result[0].avgSpent).toBe(400);
	});

	it('uses month-scoped spend for health history', async () => {
		const category = { id: 'category-food', name: 'Food' };
		const historicalBudgets = [
			{
				id: 'budget-june',
				name: 'Groceries',
				amount: new Prisma.Decimal(100),
				month: new Date(2026, 5, 1),
				categoryId: 'category-food',
				userId: 'user-1',
				category,
				expenses: [
					{ date: new Date(2026, 6, 1), amount: new Prisma.Decimal(200) },
				],
			},
			{
				id: 'budget-july',
				name: 'Groceries',
				amount: new Prisma.Decimal(100),
				month: new Date(2026, 6, 1),
				categoryId: 'category-food',
				userId: 'user-1',
				category,
				expenses: [
					{ date: new Date(2026, 7, 1), amount: new Prisma.Decimal(200) },
				],
			},
			{
				id: 'budget-august',
				name: 'Groceries',
				amount: new Prisma.Decimal(100),
				month: new Date(2026, 7, 1),
				categoryId: 'category-food',
				userId: 'user-1',
				category,
				expenses: [
					{ date: new Date(2026, 8, 1), amount: new Prisma.Decimal(200) },
				],
			},
		];
		mocks.budgetFindMany
			.mockResolvedValueOnce([historicalBudgets[2]])
			.mockResolvedValueOnce(historicalBudgets);
		mocks.expenseGroupBy
			.mockResolvedValueOnce([
				{
					budgetId: 'budget-august',
					_sum: { amount: new Prisma.Decimal(50) },
				},
			])
			.mockResolvedValueOnce(
				historicalBudgets.map((budget) => ({
					budgetId: budget.id,
					_sum: { amount: new Prisma.Decimal(50) },
				}))
			);

		const result = await BudgetService.getBudgetHealthSummary(
			'user-1',
			new Date(2026, 7, 16)
		);

		expect(mocks.budgetFindMany).toHaveBeenNthCalledWith(2, {
			where: {
				userId: 'user-1',
				month: {
					gte: new Date(2026, 2, 1),
					lte: new Date(2026, 7, 31, 23, 59, 59, 999),
				},
			},
			include: { category: true },
		});
		expect(mocks.expenseGroupBy).toHaveBeenNthCalledWith(2, {
			by: ['budgetId'],
			where: {
				userId: 'user-1',
				budgetId: {
					in: ['budget-june', 'budget-july', 'budget-august'],
				},
				date: {
					gte: new Date(2026, 2, 1),
					lte: new Date(2026, 7, 31, 23, 59, 59, 999),
				},
				OR: [
					{
						budgetId: 'budget-june',
						date: {
							gte: new Date(2026, 5, 1),
							lte: new Date(2026, 5, 30, 23, 59, 59, 999),
						},
					},
					{
						budgetId: 'budget-july',
						date: {
							gte: new Date(2026, 6, 1),
							lte: new Date(2026, 6, 31, 23, 59, 59, 999),
						},
					},
					{
						budgetId: 'budget-august',
						date: {
							gte: new Date(2026, 7, 1),
							lte: new Date(2026, 7, 31, 23, 59, 59, 999),
						},
					},
				],
			},
			_sum: { amount: true },
		});
		expect(result.problemCategories).toEqual([]);
	});

	it('includes an expense at the last millisecond of the envelope month, excludes one at the first millisecond of next month, with exact decimal precision', async () => {
		const budget = {
			id: 'budget-january',
			name: 'Groceries',
			amount: new Prisma.Decimal(1000),
			month: new Date(2026, 0, 1),
			categoryId: 'category-food',
			userId: 'user-1',
			category: { id: 'category-food', name: 'Food' },
		};
		mocks.budgetFindMany.mockResolvedValue([budget]);

		// Twenty-one 0.07 charges land exactly at the last millisecond of
		// January (IN); a single 700.00 charge lands at the first millisecond
		// of February (OUT). If the boundary is wrong, totalSpent silently
		// gains 700. If Decimal precision is lost, it drifts off 1.47.
		const candidateExpenses = [
			{
				date: new Date(2026, 0, 31, 23, 59, 59, 999),
				amount: new Prisma.Decimal('0.07').times(21),
			},
			{
				date: new Date(2026, 1, 1, 0, 0, 0, 0),
				amount: new Prisma.Decimal(700),
			},
		];

		mocks.expenseGroupBy.mockImplementation(async (args) => {
			const orClause = args.where.OR as Array<{
				budgetId: string;
				date: { gte: Date; lte: Date };
			}>;
			const rows: Array<{ budgetId: string; _sum: { amount: Prisma.Decimal } }> = [];
			for (const clause of orClause) {
				const sum = candidateExpenses
					.filter(
						(e) => e.date >= clause.date.gte && e.date <= clause.date.lte
					)
					.reduce(
						(acc, e) => acc.plus(e.amount),
						new Prisma.Decimal(0)
					);
				if (sum.greaterThan(0)) {
					rows.push({ budgetId: clause.budgetId, _sum: { amount: sum } });
				}
			}
			return rows;
		});

		const result = await BudgetService.getBudgetTrends(
			'user-1',
			new Date(2026, 0, 1),
			new Date(2026, 0, 31)
		);

		expect(result[0].totalSpent).toBe(1.47);
	});
});
