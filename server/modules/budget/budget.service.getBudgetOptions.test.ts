import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	budgetFindMany: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
	default: {
		budget: {
			findMany: mocks.budgetFindMany,
		},
	},
}));

vi.mock('../category/category.service', () => ({
	CategoryService: {},
}));

import { BudgetService } from './budget.service';

describe('BudgetService.getBudgetOptions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.budgetFindMany.mockResolvedValue([
			{
				id: 'budget-1',
				name: 'Groceries',
				categoryId: 'category-1',
				category: { name: 'Food' },
			},
		]);
	});

	it('selects only current-month picker fields ordered by name', async () => {
		const result = await BudgetService.getBudgetOptions(
			'user-1',
			new Date(Date.UTC(2026, 7, 16, 9, 30, 0, 0))
		);

		expect(mocks.budgetFindMany).toHaveBeenCalledWith({
			where: {
				userId: 'user-1',
				month: {
					gte: new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0)),
					lte: new Date(Date.UTC(2026, 7, 31, 23, 59, 59, 999)),
				},
			},
			select: {
				id: true,
				name: true,
				categoryId: true,
				category: { select: { name: true } },
			},
			orderBy: { name: 'asc' },
		});
		expect(result).toEqual([
			{
				id: 'budget-1',
				name: 'Groceries',
				categoryId: 'category-1',
				category: { name: 'Food' },
			},
		]);
	});
});
