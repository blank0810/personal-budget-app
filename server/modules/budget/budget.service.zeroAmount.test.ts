import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

const mocks = vi.hoisted(() => ({
	budgetFindFirst: vi.fn(),
	budgetFindMany: vi.fn(),
	expenseFindMany: vi.fn(),
	expenseGroupBy: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
	default: {
		budget: {
			findFirst: mocks.budgetFindFirst,
			findMany: mocks.budgetFindMany,
		},
		expense: {
			findMany: mocks.expenseFindMany,
			groupBy: mocks.expenseGroupBy,
		},
	},
}));

vi.mock('../category/category.service', () => ({
	CategoryService: {},
}));

import { BudgetService } from './budget.service';

describe('BudgetService — zero-amount budgets', () => {
	const zeroBudget = {
		id: 'budget-zero',
		name: 'Zero envelope',
		amount: new Prisma.Decimal(0),
		month: new Date(2026, 7, 1),
		categoryId: 'category-1',
		userId: 'user-1',
		category: { id: 'category-1', name: 'Unallocated' },
	};
	const augustWindow = {
		gte: new Date(2026, 7, 1),
		lte: new Date(2026, 7, 31, 23, 59, 59, 999),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 7, 4, 12));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns 0 percent and keeps the health buckets exhaustive', async () => {
		mocks.budgetFindMany.mockResolvedValue([zeroBudget]);
		mocks.expenseGroupBy.mockResolvedValue([
			{
				budgetId: 'budget-zero',
				_sum: { amount: new Prisma.Decimal(0) },
			},
		]);

		const budgets = await BudgetService.getBudgets('user-1', {
			month: new Date(2026, 7, 16),
		});
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
		expect(mocks.expenseGroupBy).toHaveBeenNthCalledWith(1, {
			by: ['budgetId'],
			where: {
				userId: 'user-1',
				budgetId: { not: null },
				date: augustWindow,
			},
			_sum: { amount: true },
		});
		expect(budgets[0].percentage).toBe(0);
		expect(summary).toMatchObject({
			totalBudgets: 1,
			onTrack: 1,
			warning: 0,
			over: 0,
		});
		expect(summary.onTrack + summary.warning + summary.over).toBe(
			summary.totalBudgets
		);
	});

	it('returns 0 percent for a zero-limit budget ledger', async () => {
		mocks.budgetFindFirst.mockResolvedValue(zeroBudget);
		mocks.expenseFindMany
			.mockResolvedValueOnce([
				{
					id: 'expense-1',
					amount: new Prisma.Decimal(10),
					date: new Date(2026, 7, 2),
				},
			])
			.mockResolvedValueOnce([]);

		const result = await BudgetService.getBudgetWithExpenses(
			'user-1',
			'budget-zero'
		);

		expect(mocks.budgetFindFirst).toHaveBeenCalledWith({
			where: { id: 'budget-zero', userId: 'user-1' },
			include: { category: true },
		});
		expect(mocks.expenseFindMany).toHaveBeenNthCalledWith(1, {
			where: {
				userId: 'user-1',
				budgetId: 'budget-zero',
				date: augustWindow,
			},
			orderBy: { date: 'asc' },
			include: { account: true },
		});
		expect(mocks.expenseFindMany).toHaveBeenNthCalledWith(2, {
			where: {
				userId: 'user-1',
				categoryId: 'category-1',
				budgetId: null,
				date: augustWindow,
			},
			orderBy: { date: 'asc' },
			include: { account: true },
		});
		expect(result?.metrics.percentage).toBe(0);
	});
});
