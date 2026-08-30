import { beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('BudgetService.getBudgets — spent edge cases', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('defaults spent to 0, never undefined, when a budget has no matching groupBy row at all', async () => {
		mocks.budgetFindMany.mockResolvedValue([
			{
				id: 'budget-1',
				name: 'Groceries',
				amount: new Prisma.Decimal(500),
				month: new Date(2026, 7, 1),
				categoryId: 'category-1',
				userId: 'user-1',
				category: { id: 'category-1', name: 'Food' },
			},
			{
				id: 'budget-2',
				name: 'Transport',
				amount: new Prisma.Decimal(200),
				month: new Date(2026, 7, 1),
				categoryId: 'category-2',
				userId: 'user-1',
				category: { id: 'category-2', name: 'Transport' },
			},
		]);
		mocks.expenseGroupBy.mockResolvedValue([]);

		const result = await BudgetService.getBudgets('user-1', {
			month: new Date(2026, 7, 16),
		});

		expect(result[0].spent).toBe(0);
		expect(result[1].spent).toBe(0);
		result.forEach((b) => expect(b.spent).not.toBeUndefined());
	});

	it('treats a null _sum.amount from groupBy as zero spent', async () => {
		mocks.budgetFindMany.mockResolvedValue([
			{
				id: 'budget-1',
				name: 'Groceries',
				amount: new Prisma.Decimal(500),
				month: new Date(2026, 7, 1),
				categoryId: 'category-1',
				userId: 'user-1',
				category: { id: 'category-1', name: 'Food' },
			},
		]);
		mocks.expenseGroupBy.mockResolvedValue([
			{ budgetId: 'budget-1', _sum: { amount: null } },
		]);

		const result = await BudgetService.getBudgets('user-1', {
			month: new Date(2026, 7, 16),
		});

		expect(result[0].spent).toBe(0);
	});

	it('preserves exact decimal precision when converting the aggregated sum, avoiding float drift', async () => {
		// Prisma performs this sum in Postgres as exact Decimal arithmetic. A
		// naive JS float accumulation of twenty-one 0.07 charges drifts away
		// from 1.47 (repeated float addition of 0.07 != 1.47 exactly).
		const exactSum = new Prisma.Decimal('0.07').times(21);
		mocks.budgetFindMany.mockResolvedValue([
			{
				id: 'budget-1',
				name: 'Coffee',
				amount: new Prisma.Decimal(100),
				month: new Date(2026, 7, 1),
				categoryId: 'category-1',
				userId: 'user-1',
				category: { id: 'category-1', name: 'Food' },
			},
		]);
		mocks.expenseGroupBy.mockResolvedValue([
			{ budgetId: 'budget-1', _sum: { amount: exactSum } },
		]);

		const result = await BudgetService.getBudgets('user-1', {
			month: new Date(2026, 7, 16),
		});

		expect(result[0].spent).toBe(1.47);
		expect(result[0].remaining).toBe(98.53);
		expect(result[0].percentage).toBe(1.47);
	});
});
