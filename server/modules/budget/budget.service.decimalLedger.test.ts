import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

const mocks = vi.hoisted(() => ({
	budgetFindFirst: vi.fn(),
	expenseFindMany: vi.fn(),
	expenseAggregate: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
	default: {
		budget: {
			findFirst: mocks.budgetFindFirst,
		},
		expense: {
			findMany: mocks.expenseFindMany,
			aggregate: mocks.expenseAggregate,
		},
	},
}));

vi.mock('../category/category.service', () => ({
	CategoryService: {},
}));

import { BudgetService } from './budget.service';

const august = new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0));
const augustWindow = {
	gte: new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0)),
	lte: new Date(Date.UTC(2026, 7, 31, 23, 59, 59, 999)),
};

describe('BudgetService.getBudgetWithExpenses — Decimal ledger math', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.budgetFindFirst.mockResolvedValue({
			id: 'budget-1',
			name: 'Small purchases',
			amount: new Prisma.Decimal('0.30'),
			month: august,
			categoryId: 'category-1',
			userId: 'user-1',
			category: { id: 'category-1', name: 'Food' },
		});
		mocks.expenseFindMany
			.mockResolvedValueOnce([
				{
					id: 'expense-1',
					amount: new Prisma.Decimal('0.10'),
					date: new Date(Date.UTC(2026, 7, 10, 0, 0, 0, 0)),
				},
				{
					id: 'expense-2',
					amount: new Prisma.Decimal('0.20'),
					date: new Date(Date.UTC(2026, 7, 11, 0, 0, 0, 0)),
				},
			])
			.mockResolvedValueOnce([]);
		mocks.expenseAggregate.mockResolvedValue({
			_sum: { amount: new Prisma.Decimal('0.30') },
		});
	});

	it('uses the SQL sum and does not mark an exactly exhausted budget as over', async () => {
		const result = await BudgetService.getBudgetWithExpenses(
			'user-1',
			'budget-1'
		);

		expect(mocks.budgetFindFirst).toHaveBeenCalledWith({
			where: { id: 'budget-1', userId: 'user-1' },
			include: { category: true },
		});
		expect(mocks.expenseFindMany).toHaveBeenNthCalledWith(1, {
			where: {
				userId: 'user-1',
				budgetId: 'budget-1',
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
		expect(mocks.expenseAggregate).toHaveBeenCalledWith({
			where: {
				userId: 'user-1',
				budgetId: 'budget-1',
				date: augustWindow,
			},
			_sum: { amount: true },
		});
		expect(result?.expenses).toEqual([
			expect.objectContaining({
				id: 'expense-1',
				runningTotal: 0.1,
				isOverBudget: false,
			}),
			expect.objectContaining({
				id: 'expense-2',
				runningTotal: 0.3,
				isOverBudget: false,
			}),
		]);
		expect(result?.metrics).toMatchObject({
			limit: 0.3,
			spent: 0.3,
			remaining: 0,
			percentage: 100,
			isOverBudget: false,
		});
	});
});
