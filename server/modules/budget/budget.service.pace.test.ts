import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

function budget(id: string, month: Date, amount: number) {
	return {
		id,
		name: id,
		amount: new Prisma.Decimal(amount),
		month,
		categoryId: `${id}-category`,
		userId: 'user-1',
		category: { id: `${id}-category`, name: id },
	};
}

describe('BudgetService.getBudgets — pace metrics', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date(Date.UTC(2026, 7, 16, 12, 0, 0, 0)));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('computes every unfiltered envelope against its own month', async () => {
		mocks.budgetFindMany.mockResolvedValue([
			budget(
				'january',
				new Date(Date.UTC(2026, 0, 1, 0, 0, 0, 0)),
				1000
			),
			budget(
				'october',
				new Date(Date.UTC(2026, 9, 1, 0, 0, 0, 0)),
				900
			),
		]);
		mocks.expenseGroupBy.mockResolvedValue([
			{
				budgetId: 'january',
				_sum: { amount: new Prisma.Decimal(500) },
			},
		]);

		const result = await BudgetService.getBudgets('user-1');

		expect(mocks.budgetFindMany).toHaveBeenCalledWith({
			where: {
				userId: 'user-1',
				month: undefined,
			},
			include: { category: true },
			orderBy: { amount: 'desc' },
		});
		expect(mocks.expenseGroupBy).toHaveBeenCalledWith({
			by: ['budgetId'],
			where: {
				userId: 'user-1',
				budgetId: { not: null },
				date: undefined,
			},
			_sum: { amount: true },
		});
		expect(result[0]).toMatchObject({
			id: 'january',
			daysElapsed: 31,
			daysRemaining: 0,
			daysInMonth: 31,
			expectedPercentage: 100,
			burnStatus: 'ontrack',
			burnStatusReason: null,
			safeToSpend: null,
		});
		expect(result[1]).toMatchObject({
			id: 'october',
			daysElapsed: 1,
			daysRemaining: 30,
			daysInMonth: 31,
			burnStatus: 'insufficient_data',
			burnStatusReason: 'future_month',
			safeToSpend: 30,
		});
		expect(result[1].expectedPercentage).toBeCloseTo(100 / 31, 10);
	});

	it('returns current-month pace and safe-to-spend on a filtered call', async () => {
		mocks.budgetFindMany.mockResolvedValue([
			budget(
				'august',
				new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0)),
				1000
			),
		]);
		mocks.expenseGroupBy.mockResolvedValue([
			{
				budgetId: 'august',
				_sum: { amount: new Prisma.Decimal(600) },
			},
		]);

		const result = await BudgetService.getBudgets('user-1', {
			month: new Date(Date.UTC(2026, 7, 16, 9, 30, 0, 0)),
		});

		expect(mocks.budgetFindMany).toHaveBeenCalledWith({
			where: {
				userId: 'user-1',
				month: {
					gte: new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0)),
					lte: new Date(Date.UTC(2026, 7, 31, 23, 59, 59, 999)),
				},
			},
			include: { category: true },
			orderBy: { amount: 'desc' },
		});
		expect(mocks.expenseGroupBy).toHaveBeenCalledWith({
			by: ['budgetId'],
			where: {
				userId: 'user-1',
				budgetId: { not: null },
				date: {
					gte: new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0)),
					lte: new Date(Date.UTC(2026, 7, 31, 23, 59, 59, 999)),
				},
			},
			_sum: { amount: true },
		});
		expect(result[0]).toMatchObject({
			id: 'august',
			daysElapsed: 16,
			daysRemaining: 15,
			daysInMonth: 31,
			burnStatus: 'overpace',
			burnStatusReason: null,
		});
		expect(result[0].expectedPercentage).toBeCloseTo((16 / 31) * 100, 10);
		expect(result[0].safeToSpend).toBeCloseTo(400 / 15, 10);
	});
});
