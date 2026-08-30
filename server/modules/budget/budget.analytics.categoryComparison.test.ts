import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

const mocks = vi.hoisted(() => ({
	expenseGroupBy: vi.fn(),
	categoryFindMany: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
	default: {
		expense: {
			groupBy: mocks.expenseGroupBy,
		},
		category: {
			findMany: mocks.categoryFindMany,
		},
	},
}));

import { BudgetAnalyticsService } from './budget.analytics.service';

describe('BudgetAnalyticsService.getCategorySpendComparison', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('compares adjacent months, preserves Decimal deltas, and sorts by absolute movement', async () => {
		mocks.expenseGroupBy
			.mockResolvedValueOnce([
				{
					categoryId: 'category-food',
					_sum: { amount: new Prisma.Decimal('500.10') },
				},
				{
					categoryId: 'category-rent',
					_sum: { amount: new Prisma.Decimal('150.25') },
				},
			])
			.mockResolvedValueOnce([
				{
					categoryId: 'category-food',
					_sum: { amount: new Prisma.Decimal('100.05') },
				},
				{
					categoryId: 'category-transit',
					_sum: { amount: new Prisma.Decimal('50.15') },
				},
			]);
		mocks.categoryFindMany.mockResolvedValue([
			{ id: 'category-food', name: 'Food' },
			{ id: 'category-rent', name: 'Rent' },
			{ id: 'category-transit', name: 'Transit' },
		]);

		const result = await BudgetAnalyticsService.getCategorySpendComparison(
			'user-1',
			new Date(2026, 7, 16)
		);

		expect(mocks.expenseGroupBy).toHaveBeenNthCalledWith(1, {
			by: ['categoryId'],
			where: {
				userId: 'user-1',
				date: {
					gte: new Date(2026, 7, 1),
					lte: new Date(2026, 7, 31, 23, 59, 59, 999),
				},
			},
			_sum: { amount: true },
		});
		expect(mocks.expenseGroupBy).toHaveBeenNthCalledWith(2, {
			by: ['categoryId'],
			where: {
				userId: 'user-1',
				date: {
					gte: new Date(2026, 6, 1),
					lte: new Date(2026, 6, 31, 23, 59, 59, 999),
				},
			},
			_sum: { amount: true },
		});
		expect(mocks.categoryFindMany).toHaveBeenCalledWith({
			where: {
				userId: 'user-1',
				id: {
					in: ['category-food', 'category-rent', 'category-transit'],
				},
			},
			select: { id: true, name: true },
		});
		expect(result).toEqual([
			{
				categoryId: 'category-food',
				categoryName: 'Food',
				currentTotal: 500.1,
				previousTotal: 100.05,
				amountDelta: 400.05,
				absoluteDelta: 400.05,
				percentDelta: 399.85007496251876,
			},
			{
				categoryId: 'category-rent',
				categoryName: 'Rent',
				currentTotal: 150.25,
				previousTotal: 0,
				amountDelta: 150.25,
				absoluteDelta: 150.25,
				percentDelta: null,
			},
			{
				categoryId: 'category-transit',
				categoryName: 'Transit',
				currentTotal: 0,
				previousTotal: 50.15,
				amountDelta: -50.15,
				absoluteDelta: 50.15,
				percentDelta: -100,
			},
		]);
	});

	it('returns no rows without issuing a category lookup when both months are empty', async () => {
		mocks.expenseGroupBy.mockResolvedValue([]);

		await expect(
			BudgetAnalyticsService.getCategorySpendComparison(
				'user-1',
				new Date(2026, 7, 16)
			)
		).resolves.toEqual([]);
		expect(mocks.categoryFindMany).not.toHaveBeenCalled();
	});
});
