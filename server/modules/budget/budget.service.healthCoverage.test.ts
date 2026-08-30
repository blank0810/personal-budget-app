import { beforeEach, describe, expect, it, vi } from 'vitest';
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
import type { BudgetHealthSummary } from './budget.types';

const august = new Date(2026, 7, 1);
const augustWindow = {
	gte: new Date(2026, 7, 1),
	lte: new Date(2026, 7, 31, 23, 59, 59, 999),
};

function budget(
	id: string,
	categoryId: string,
	amount: number
) {
	return {
		id,
		name: id,
		amount: new Prisma.Decimal(amount),
		month: august,
		categoryId,
		userId: 'user-1',
		category: { id: categoryId, name: categoryId },
	};
}

function expectExhaustive(summary: BudgetHealthSummary) {
	expect(
		summary.onTrack +
			summary.warning +
			summary.over +
			summary.incomplete
	).toBe(summary.totalBudgets);
}

describe('BudgetService — coverage-aware health', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('applies utilization precedence and never calls partial coverage on track', async () => {
		const currentBudgets = [
			budget('full-low', 'category-1', 100),
			budget('partial-low', 'category-2', 100),
			budget('partial-warning', 'category-3', 100),
			budget('partial-over', 'category-4', 100),
			budget('zero-null', 'category-5', 0),
			budget('zero-partial', 'category-6', 0),
			budget('no-spend-null', 'category-7', 100),
		];
		mocks.budgetFindMany
			.mockResolvedValueOnce(currentBudgets)
			.mockResolvedValueOnce([]);
		mocks.expenseGroupBy.mockResolvedValue([
			{
				budgetId: 'full-low',
				_sum: { amount: new Prisma.Decimal(20) },
			},
			{
				budgetId: 'partial-low',
				_sum: { amount: new Prisma.Decimal(20) },
			},
			{
				budgetId: 'partial-warning',
				_sum: { amount: new Prisma.Decimal(80) },
			},
			{
				budgetId: 'partial-over',
				_sum: { amount: new Prisma.Decimal(101) },
			},
		]);
		mocks.getCoverageRatios.mockResolvedValue([
			{
				budgetId: 'full-low',
				linkedSpend: 20,
				unlinkedSameCategorySpend: 0,
				unlinkedExpenseCount: 0,
				coverageRatio: 1,
			},
			{
				budgetId: 'partial-low',
				linkedSpend: 20,
				unlinkedSameCategorySpend: 20,
				unlinkedExpenseCount: 1,
				coverageRatio: 0.5,
			},
			{
				budgetId: 'partial-warning',
				linkedSpend: 80,
				unlinkedSameCategorySpend: 20,
				unlinkedExpenseCount: 1,
				coverageRatio: 0.8,
			},
			{
				budgetId: 'partial-over',
				linkedSpend: 101,
				unlinkedSameCategorySpend: 1,
				unlinkedExpenseCount: 1,
				coverageRatio: 101 / 102,
			},
			{
				budgetId: 'zero-null',
				linkedSpend: 0,
				unlinkedSameCategorySpend: 0,
				unlinkedExpenseCount: 0,
				coverageRatio: null,
			},
			{
				budgetId: 'zero-partial',
				linkedSpend: 0,
				unlinkedSameCategorySpend: 10,
				unlinkedExpenseCount: 1,
				coverageRatio: 0,
			},
			{
				budgetId: 'no-spend-null',
				linkedSpend: 0,
				unlinkedSameCategorySpend: 0,
				unlinkedExpenseCount: 0,
				coverageRatio: null,
			},
		]);

		const summary = await BudgetService.getBudgetHealthSummary(
			'user-1',
			new Date(2026, 7, 16)
		);

		expect(mocks.budgetFindMany).toHaveBeenNthCalledWith(1, {
			where: {
				userId: 'user-1',
				month: augustWindow,
			},
			include: { category: true },
			orderBy: { amount: 'desc' },
		});
		expect(mocks.expenseGroupBy).toHaveBeenCalledWith({
			by: ['budgetId'],
			where: {
				userId: 'user-1',
				budgetId: { not: null },
				date: augustWindow,
			},
			_sum: { amount: true },
		});
		expect(mocks.getCoverageRatios).toHaveBeenCalledOnce();
		expect(mocks.getCoverageRatios).toHaveBeenCalledWith(
			'user-1',
			currentBudgets.map((item) => ({
				id: item.id,
				categoryId: item.categoryId,
				month: item.month,
			}))
		);
		expect(summary).toMatchObject({
			hasBudgets: true,
			totalBudgets: 7,
			onTrack: 3,
			warning: 1,
			over: 1,
			incomplete: 2,
		});
		expectExhaustive(summary);
	});

	it('keeps the four buckets exhaustive for an empty input', async () => {
		mocks.budgetFindMany.mockResolvedValue([]);
		mocks.expenseGroupBy.mockResolvedValue([]);

		const summary = await BudgetService.getBudgetHealthSummary(
			'user-1',
			new Date(2026, 7, 16)
		);

		expect(summary).toEqual({
			hasBudgets: false,
			totalBudgets: 0,
			onTrack: 0,
			warning: 0,
			over: 0,
			incomplete: 0,
			totalBudgeted: 0,
			totalSpent: 0,
			problemCategories: [],
		});
		expect(mocks.getCoverageRatios).not.toHaveBeenCalled();
		expectExhaustive(summary);
	});

	it('attaches unlinked evidence for UI callers in one batch', async () => {
		const currentBudgets = [
			budget('budget-1', 'category-1', 100),
			budget('budget-2', 'category-2', 200),
		];
		mocks.budgetFindMany.mockResolvedValue(currentBudgets);
		mocks.expenseGroupBy.mockResolvedValue([]);
		mocks.getCoverageRatios.mockResolvedValue([
			{
				budgetId: 'budget-1',
				linkedSpend: 0,
				unlinkedSameCategorySpend: 35,
				unlinkedExpenseCount: 2,
				coverageRatio: 0,
			},
		]);

		const result = await BudgetService.getBudgetsWithCoverage('user-1', {
			month: new Date(2026, 7, 16),
		});

		expect(mocks.getCoverageRatios).toHaveBeenCalledWith('user-1', [
			{ id: 'budget-1', categoryId: 'category-1', month: august },
			{ id: 'budget-2', categoryId: 'category-2', month: august },
		]);
		expect(result).toEqual([
			expect.objectContaining({
				id: 'budget-1',
				coverageRatio: 0,
				unlinkedSameCategorySpend: 35,
				unlinkedExpenseCount: 2,
			}),
			expect.objectContaining({
				id: 'budget-2',
				coverageRatio: null,
				unlinkedSameCategorySpend: 0,
				unlinkedExpenseCount: 0,
			}),
		]);
	});
});
