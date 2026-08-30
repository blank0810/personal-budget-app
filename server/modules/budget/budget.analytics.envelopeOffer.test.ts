import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

const mocks = vi.hoisted(() => ({
	expenseAggregate: vi.fn(),
	expenseGroupBy: vi.fn(),
	categoryFindMany: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
	default: {
		expense: {
			aggregate: mocks.expenseAggregate,
			groupBy: mocks.expenseGroupBy,
		},
		category: {
			findMany: mocks.categoryFindMany,
		},
	},
}));

import { BudgetAnalyticsService } from './budget.analytics.service';

describe('BudgetAnalyticsService.getInferredEnvelopeOffer', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('withholds the offer before 42 days of recorded expense history', async () => {
		mocks.expenseAggregate.mockResolvedValue({
			_min: { date: new Date(Date.UTC(2026, 6, 1, 0, 0, 0, 0)) },
			_max: { date: new Date(Date.UTC(2026, 7, 11, 0, 0, 0, 0)) },
		});

		const result = await BudgetAnalyticsService.getInferredEnvelopeOffer(
			'user-1',
			new Date(Date.UTC(2026, 7, 16, 0, 0, 0, 0))
		);

		expect(mocks.expenseAggregate).toHaveBeenCalledWith({
			where: {
				userId: 'user-1',
				date: {
					lte: new Date(Date.UTC(2026, 7, 31, 23, 59, 59, 999)),
				},
			},
			_min: { date: true },
			_max: { date: true },
		});
		expect(mocks.expenseGroupBy).not.toHaveBeenCalled();
		expect(mocks.categoryFindMany).not.toHaveBeenCalled();
		expect(result).toEqual({
			eligible: false,
			loggingDays: 41,
			minimumLoggingDays: 42,
			suggestions: [],
		});
	});

	it('offers category envelopes from trailing Decimal medians after the threshold', async () => {
		mocks.expenseAggregate.mockResolvedValue({
			_min: { date: new Date(Date.UTC(2026, 2, 1, 0, 0, 0, 0)) },
			_max: { date: new Date(Date.UTC(2026, 7, 12, 0, 0, 0, 0)) },
		});
		mocks.expenseGroupBy
			.mockResolvedValueOnce([
				{
					categoryId: 'category-food',
					_sum: { amount: new Prisma.Decimal('100.00') },
				},
			])
			.mockResolvedValueOnce([
				{
					categoryId: 'category-food',
					_sum: { amount: new Prisma.Decimal('110.00') },
				},
				{
					categoryId: 'category-rent',
					_sum: { amount: new Prisma.Decimal('200.00') },
				},
			])
			.mockResolvedValueOnce([
				{
					categoryId: 'category-food',
					_sum: { amount: new Prisma.Decimal('1000.00') },
				},
			])
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([
				{
					categoryId: 'category-rent',
					_sum: { amount: new Prisma.Decimal('300.00') },
				},
			])
			.mockResolvedValueOnce([
				{
					categoryId: 'category-food',
					_sum: { amount: new Prisma.Decimal('105.00') },
				},
			]);
		mocks.categoryFindMany.mockResolvedValue([
			{ id: 'category-food', name: 'Food' },
			{ id: 'category-rent', name: 'Rent' },
		]);

		const result = await BudgetAnalyticsService.getInferredEnvelopeOffer(
			'user-1',
			new Date(Date.UTC(2026, 7, 16, 0, 0, 0, 0))
		);

		expect(mocks.expenseAggregate).toHaveBeenCalledWith({
			where: {
				userId: 'user-1',
				date: {
					lte: new Date(Date.UTC(2026, 7, 31, 23, 59, 59, 999)),
				},
			},
			_min: { date: true },
			_max: { date: true },
		});

		const expectedWindows = [
			{
				gte: new Date(Date.UTC(2026, 2, 1, 0, 0, 0, 0)),
				lte: new Date(Date.UTC(2026, 2, 31, 23, 59, 59, 999)),
			},
			{
				gte: new Date(Date.UTC(2026, 3, 1, 0, 0, 0, 0)),
				lte: new Date(Date.UTC(2026, 3, 30, 23, 59, 59, 999)),
			},
			{
				gte: new Date(Date.UTC(2026, 4, 1, 0, 0, 0, 0)),
				lte: new Date(Date.UTC(2026, 4, 31, 23, 59, 59, 999)),
			},
			{
				gte: new Date(Date.UTC(2026, 5, 1, 0, 0, 0, 0)),
				lte: new Date(Date.UTC(2026, 5, 30, 23, 59, 59, 999)),
			},
			{
				gte: new Date(Date.UTC(2026, 6, 1, 0, 0, 0, 0)),
				lte: new Date(Date.UTC(2026, 6, 31, 23, 59, 59, 999)),
			},
			{
				gte: new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0)),
				lte: new Date(Date.UTC(2026, 7, 31, 23, 59, 59, 999)),
			},
		];
		for (const [index, date] of expectedWindows.entries()) {
			expect(mocks.expenseGroupBy).toHaveBeenNthCalledWith(index + 1, {
				by: ['categoryId'],
				where: {
					userId: 'user-1',
					date,
				},
				_sum: { amount: true },
			});
		}
		expect(mocks.categoryFindMany).toHaveBeenCalledWith({
			where: {
				userId: 'user-1',
				id: { in: ['category-food', 'category-rent'] },
			},
			select: { id: true, name: true },
		});
		expect(result).toEqual({
			eligible: true,
			loggingDays: 164,
			minimumLoggingDays: 42,
			suggestions: [
				{
					categoryId: 'category-rent',
					categoryName: 'Rent',
					recentAverage: 250,
					monthsObserved: 2,
				},
				{
					categoryId: 'category-food',
					categoryName: 'Food',
					recentAverage: 107.5,
					monthsObserved: 4,
				},
			],
		});
	});
});
