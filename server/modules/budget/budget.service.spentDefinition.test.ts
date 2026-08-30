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

describe('BudgetService.getBudgets — spent definition', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.budgetFindMany.mockResolvedValue([
			{
				id: 'budget-1',
				name: 'Groceries',
				amount: new Prisma.Decimal(1000),
				month: new Date(2026, 7, 1),
				categoryId: 'category-1',
				userId: 'user-1',
				category: { id: 'category-1', name: 'Food' },
				expenses: [
					{
						amount: new Prisma.Decimal(900),
						date: new Date(2026, 8, 1),
					},
				],
			},
		]);
		mocks.expenseGroupBy.mockResolvedValue([
			{
				budgetId: 'budget-1',
				_sum: { amount: new Prisma.Decimal(250) },
			},
		]);
	});

	it('uses only linked expenses dated inside the envelope month', async () => {
		const result = await BudgetService.getBudgets('user-1', {
			month: new Date(2026, 7, 16, 9, 30),
		});

		expect(mocks.expenseGroupBy).toHaveBeenCalledWith({
			by: ['budgetId'],
			where: {
				userId: 'user-1',
				budgetId: { not: null },
				date: {
					gte: new Date(2026, 7, 1),
					lte: new Date(2026, 7, 31, 23, 59, 59, 999),
				},
			},
			_sum: { amount: true },
		});
		expect(mocks.budgetFindMany).toHaveBeenCalledWith({
			where: {
				userId: 'user-1',
				month: {
					gte: new Date(2026, 7, 1),
					lte: new Date(2026, 7, 31, 23, 59, 59, 999),
				},
			},
			include: { category: true },
			orderBy: { amount: 'desc' },
		});
		expect(result[0].spent).toBe(250);
		expect(result[0].remaining).toBe(750);
		expect(result[0].percentage).toBe(25);
	});
});
