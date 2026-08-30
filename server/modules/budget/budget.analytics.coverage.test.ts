import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	expenseGroupBy: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
	default: {
		expense: {
			groupBy: mocks.expenseGroupBy,
		},
	},
}));

import { BudgetAnalyticsService } from './budget.analytics.service';

describe('BudgetAnalyticsService.getCoverageRatios', () => {
	const augustEnvelope = {
		id: 'budget-groceries-august',
		categoryId: 'category-groceries',
		month: new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0)),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns the linked share of same-category spend in the envelope month', async () => {
		mocks.expenseGroupBy
			.mockResolvedValueOnce([
				{
					budgetId: augustEnvelope.id,
					_sum: { amount: new Prisma.Decimal(300) },
				},
			])
			.mockResolvedValueOnce([
				{
					categoryId: augustEnvelope.categoryId,
					date: new Date(Date.UTC(2026, 7, 12, 0, 0, 0, 0)),
					_sum: { amount: new Prisma.Decimal(200) },
					_count: { id: 2 },
				},
			]);

		const result = await BudgetAnalyticsService.getCoverageRatios(
			'user-1',
			[augustEnvelope]
		);

		expect(mocks.expenseGroupBy).toHaveBeenNthCalledWith(1, {
			by: ['budgetId'],
			where: {
				userId: 'user-1',
				OR: [
					{
						budgetId: augustEnvelope.id,
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
		expect(mocks.expenseGroupBy).toHaveBeenNthCalledWith(2, {
			by: ['categoryId', 'date'],
			where: {
				userId: 'user-1',
				budgetId: null,
				OR: [
					{
						categoryId: augustEnvelope.categoryId,
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
			_count: { id: true },
		});
		expect(result).toEqual([
			{
				budgetId: augustEnvelope.id,
				linkedSpend: 300,
				unlinkedSameCategorySpend: 200,
				unlinkedExpenseCount: 2,
				coverageRatio: 0.6,
			},
		]);
	});

	it('returns null when no category spend exists', async () => {
		mocks.expenseGroupBy
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([]);

		const [coverage] = await BudgetAnalyticsService.getCoverageRatios(
			'user-1',
			[augustEnvelope]
		);

		expect(coverage).toEqual({
			budgetId: augustEnvelope.id,
			linkedSpend: 0,
			unlinkedSameCategorySpend: 0,
			unlinkedExpenseCount: 0,
			coverageRatio: null,
		});
	});

	it('ignores unlinked spend from a different category', async () => {
		mocks.expenseGroupBy
			.mockResolvedValueOnce([
				{
					budgetId: augustEnvelope.id,
					_sum: { amount: new Prisma.Decimal(300) },
				},
			])
			.mockResolvedValueOnce([
				{
					categoryId: 'category-transport',
					date: new Date(Date.UTC(2026, 7, 12, 0, 0, 0, 0)),
					_sum: { amount: new Prisma.Decimal(200) },
					_count: { id: 2 },
				},
			]);

		const [coverage] = await BudgetAnalyticsService.getCoverageRatios(
			'user-1',
			[augustEnvelope]
		);

		expect(coverage.coverageRatio).toBe(1);
		expect(coverage.unlinkedExpenseCount).toBe(0);
	});

	it('ignores unlinked spend from a different month', async () => {
		mocks.expenseGroupBy
			.mockResolvedValueOnce([
				{
					budgetId: augustEnvelope.id,
					_sum: { amount: new Prisma.Decimal(300) },
				},
			])
			.mockResolvedValueOnce([
				{
					categoryId: augustEnvelope.categoryId,
					date: new Date(Date.UTC(2026, 8, 1, 0, 0, 0, 0)),
					_sum: { amount: new Prisma.Decimal(200) },
					_count: { id: 2 },
				},
			]);

		const [coverage] = await BudgetAnalyticsService.getCoverageRatios(
			'user-1',
			[augustEnvelope]
		);

		expect(coverage.coverageRatio).toBe(1);
		expect(coverage.unlinkedExpenseCount).toBe(0);
	});
});
