import { Prisma } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	budgetFindFirst: vi.fn(),
	expenseFindMany: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
	default: {
		budget: {
			findFirst: mocks.budgetFindFirst,
		},
		expense: {
			findMany: mocks.expenseFindMany,
		},
	},
}));

vi.mock('../category/category.service', () => ({
	CategoryService: {},
}));

import { BudgetService } from './budget.service';

describe('BudgetService — UTC month storage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date(Date.UTC(2026, 7, 16, 12, 0, 0, 0)));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('keeps a controller-stored August anchor in its UTC window on negative-offset servers', async () => {
		const storedMonth = new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0));
		const augustWindow = {
			gte: new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0)),
			lte: new Date(Date.UTC(2026, 7, 31, 23, 59, 59, 999)),
		};
		mocks.budgetFindFirst.mockResolvedValue({
			id: 'budget-august',
			name: 'Groceries',
			amount: new Prisma.Decimal('500.00'),
			month: storedMonth,
			categoryId: 'category-food',
			userId: 'user-1',
			category: { id: 'category-food', name: 'Food' },
		});
		mocks.expenseFindMany
			.mockResolvedValueOnce([
				{
					id: 'expense-august',
					amount: new Prisma.Decimal('125.00'),
					date: new Date(Date.UTC(2026, 7, 31, 23, 59, 59, 999)),
				},
			])
			.mockResolvedValueOnce([]);

		const result = await BudgetService.getBudgetWithExpenses(
			'user-1',
			'budget-august'
		);

		expect(mocks.budgetFindFirst).toHaveBeenCalledWith({
			where: { id: 'budget-august', userId: 'user-1' },
			include: { category: true },
		});
		expect(mocks.expenseFindMany).toHaveBeenNthCalledWith(1, {
			where: {
				userId: 'user-1',
				budgetId: 'budget-august',
				date: augustWindow,
			},
			orderBy: { date: 'asc' },
			include: { account: true },
		});
		expect(mocks.expenseFindMany).toHaveBeenNthCalledWith(2, {
			where: {
				userId: 'user-1',
				categoryId: 'category-food',
				budgetId: null,
				date: augustWindow,
			},
			orderBy: { date: 'asc' },
			include: { account: true },
		});
		expect(result?.metrics.spent).toBe(125);
	});
});
