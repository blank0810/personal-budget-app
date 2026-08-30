import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	queryRaw: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
	default: {
		$queryRaw: mocks.queryRaw,
	},
}));

import {
	BudgetAnalyticsService,
	deriveAnomaly,
	deriveBreakDay,
	deriveFixedVsDiscretionary,
	deriveRevealedBudget,
	deriveVolatility,
	deriveWeekOfMonthVelocity,
} from './budget.analytics.service';

describe('advanced budget analytics derivations', () => {
	it('reveals a trailing median only after three observed months', () => {
		expect(
			deriveRevealedBudget({
				categoryId: 'category-food',
				categoryName: 'Food',
				monthsObserved: 2,
				trailingMonths: 6,
				medianMonthlySpend: new Prisma.Decimal('125.50'),
			})
		).toEqual({
			categoryId: 'category-food',
			categoryName: 'Food',
			state: 'insufficient_data',
			monthsObserved: 2,
			trailingMonths: 6,
			revealedBudget: null,
		});

		expect(
			deriveRevealedBudget({
				categoryId: 'category-food',
				categoryName: 'Food',
				monthsObserved: 3,
				trailingMonths: 6,
				medianMonthlySpend: new Prisma.Decimal('125.50'),
			})
		).toEqual({
			categoryId: 'category-food',
			categoryName: 'Food',
			state: 'ready',
			monthsObserved: 3,
			trailingMonths: 6,
			revealedBudget: 125.5,
		});
	});

	it('guards volatility when history is short or average spend is zero', () => {
		const base = {
			categoryId: 'category-food',
			categoryName: 'Food',
			trailingMonths: 6,
			averageMonthlySpend: new Prisma.Decimal('100'),
			standardDeviation: new Prisma.Decimal('10'),
			coefficientOfVariation: new Prisma.Decimal('0.1'),
		};

		expect(
			deriveVolatility({ ...base, monthsObserved: 2 })
		).toEqual({
			categoryId: 'category-food',
			categoryName: 'Food',
			state: 'insufficient_data',
			monthsObserved: 2,
			trailingMonths: 6,
			averageMonthlySpend: null,
			standardDeviation: null,
			coefficientOfVariation: null,
		});

		expect(
			deriveVolatility({
				...base,
				monthsObserved: 3,
				averageMonthlySpend: new Prisma.Decimal(0),
			})
		).toEqual({
			categoryId: 'category-food',
			categoryName: 'Food',
			state: 'insufficient_data',
			monthsObserved: 3,
			trailingMonths: 6,
			averageMonthlySpend: null,
			standardDeviation: null,
			coefficientOfVariation: null,
		});
	});

	it('classifies fixed spending below CV 0.15 only with three of N months', () => {
		const base = {
			categoryId: 'category-rent',
			categoryName: 'Rent',
			trailingMonths: 6,
		};

		expect(
			deriveFixedVsDiscretionary({
				...base,
				monthsObserved: 2,
				coefficientOfVariation: new Prisma.Decimal('0.01'),
			})
		).toEqual({
			categoryId: 'category-rent',
			categoryName: 'Rent',
			state: 'insufficient_data',
			monthsObserved: 2,
			trailingMonths: 6,
			coefficientOfVariation: null,
			classification: null,
		});

		expect(
			deriveFixedVsDiscretionary({
				...base,
				monthsObserved: 3,
				coefficientOfVariation: new Prisma.Decimal('0.1499'),
			})
		).toEqual({
			categoryId: 'category-rent',
			categoryName: 'Rent',
			state: 'ready',
			monthsObserved: 3,
			trailingMonths: 6,
			coefficientOfVariation: 0.1499,
			classification: 'FIXED',
		});

		expect(
			deriveFixedVsDiscretionary({
				...base,
				monthsObserved: 3,
				coefficientOfVariation: new Prisma.Decimal('0.15'),
			})
		).toEqual({
			categoryId: 'category-rent',
			categoryName: 'Rent',
			state: 'ready',
			monthsObserved: 3,
			trailingMonths: 6,
			coefficientOfVariation: 0.15,
			classification: 'DISCRETIONARY',
		});
	});

	it('requires three months and non-zero deviation before evaluating an anomaly', () => {
		const base = {
			categoryId: 'category-food',
			categoryName: 'Food',
			trailingMonths: 6,
			currentMonthTotal: new Prisma.Decimal('130'),
			medianMonthlySpend: new Prisma.Decimal('100'),
		};

		expect(
			deriveAnomaly({
				...base,
				monthsObserved: 2,
				standardDeviation: new Prisma.Decimal('10'),
			})
		).toEqual({
			categoryId: 'category-food',
			categoryName: 'Food',
			state: 'insufficient_data',
			monthsObserved: 2,
			trailingMonths: 6,
			currentMonthTotal: 130,
			medianMonthlySpend: null,
			standardDeviation: null,
			threshold: null,
			isAnomaly: null,
		});

		expect(
			deriveAnomaly({
				...base,
				monthsObserved: 3,
				standardDeviation: new Prisma.Decimal(0),
			})
		).toEqual({
			categoryId: 'category-food',
			categoryName: 'Food',
			state: 'insufficient_data',
			monthsObserved: 3,
			trailingMonths: 6,
			currentMonthTotal: 130,
			medianMonthlySpend: null,
			standardDeviation: null,
			threshold: null,
			isAnomaly: null,
		});

		expect(
			deriveAnomaly({
				...base,
				monthsObserved: 3,
				standardDeviation: new Prisma.Decimal('10'),
			})
		).toEqual({
			categoryId: 'category-food',
			categoryName: 'Food',
			state: 'ready',
			monthsObserved: 3,
			trailingMonths: 6,
			currentMonthTotal: 130,
			medianMonthlySpend: 100,
			standardDeviation: 10,
			threshold: 120,
			isAnomaly: true,
		});

		expect(
			deriveAnomaly({
				...base,
				monthsObserved: 3,
				currentMonthTotal: new Prisma.Decimal('120'),
				standardDeviation: new Prisma.Decimal('10'),
			})
		).toMatchObject({ state: 'ready', isAnomaly: false });
	});

	it('withholds week velocity before three observed months', () => {
		expect(
			deriveWeekOfMonthVelocity({
				categoryId: 'category-food',
				categoryName: 'Food',
				monthsObserved: 2,
				trailingMonths: 6,
				weeklyAverages: [
					{ weekOfMonth: 0, averageSpend: new Prisma.Decimal('25') },
				],
			})
		).toEqual({
			categoryId: 'category-food',
			categoryName: 'Food',
			state: 'insufficient_data',
			monthsObserved: 2,
			trailingMonths: 6,
			weeks: [],
		});
	});

	it('distinguishes no evidence, no breach, and the first break day', () => {
		const base = {
			budgetId: 'budget-food',
			budgetName: 'Food',
			categoryId: 'category-food',
			month: new Date(Date.UTC(2026, 7, 1)),
		};

		expect(
			deriveBreakDay({ ...base, expenseCount: 0, breakDate: null })
		).toEqual({
			...base,
			state: 'insufficient_data',
			expenseCount: 0,
			breakDay: null,
		});
		expect(
			deriveBreakDay({ ...base, expenseCount: 4, breakDate: null })
		).toEqual({
			...base,
			state: 'not_breached',
			expenseCount: 4,
			breakDay: null,
		});
		expect(
			deriveBreakDay({
				...base,
				expenseCount: 4,
				breakDate: new Date(Date.UTC(2026, 7, 19, 8)),
			})
		).toEqual({
			...base,
			state: 'breached',
			expenseCount: 4,
			breakDay: 19,
		});
	});
});

describe('BudgetAnalyticsService.getAdvancedAnalytics', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('binds userId in every Prisma.sql query and converts NUMERIC values through Decimal', async () => {
		mocks.queryRaw
			.mockResolvedValueOnce([
				{
					categoryId: 'category-food',
					categoryName: 'Food',
					monthsObserved: 3,
					medianMonthlySpend: '100.10',
					averageMonthlySpend: '101.20',
					standardDeviation: '10.30',
					coefficientOfVariation: '0.10177865612648221344',
					currentMonthTotal: '130.40',
				},
			])
			.mockResolvedValueOnce([
				{
					categoryId: 'category-food',
					categoryName: 'Food',
					monthsObserved: 3,
					weekOfMonth: 0,
					averageSpend: '25.55',
				},
			])
			.mockResolvedValueOnce([
				{
					budgetId: 'budget-food',
					budgetName: 'Food',
					categoryId: 'category-food',
					month: new Date(Date.UTC(2026, 7, 1)),
					expenseCount: 4,
					breakDate: new Date(Date.UTC(2026, 7, 19, 8)),
				},
			]);

		const result = await BudgetAnalyticsService.getAdvancedAnalytics(
			'user-1',
			{
				month: new Date(Date.UTC(2026, 7, 16)),
				trailingMonths: 6,
			}
		);

		const historyStart = new Date(Date.UTC(2026, 1, 1));
		const monthStart = new Date(Date.UTC(2026, 7, 1));
		const monthEndExclusive = new Date(Date.UTC(2026, 8, 1));
		const calls = mocks.queryRaw.mock.calls.map(([query]) => ({
			text: query.text,
			values: query.values,
		}));

		expect(calls).toEqual([
			{
				text: expect.stringContaining('PERCENTILE_CONT(0.5)'),
				values: [
					'user-1',
					historyStart,
					monthEndExclusive,
					monthStart,
					'user-1',
				],
			},
			{
				text: expect.stringContaining(
					'FLOOR((EXTRACT(DAY FROM e."date") - 1) / 7)'
				),
				values: ['user-1', historyStart, monthStart, 'user-1'],
			},
			{
				text: expect.stringContaining(
					'SUM(e."amount") OVER (PARTITION BY e."budgetId" ORDER BY e."date")'
				),
				values: [
					'user-1',
					monthStart,
					monthEndExclusive,
					'user-1',
				],
			},
		]);
		for (const call of calls) {
			expect(call.text).not.toContain('user-1');
		}
		expect(result).toMatchObject({
			month: monthStart,
			trailingMonths: 6,
			revealedBudgets: [
				{ state: 'ready', revealedBudget: 100.1 },
			],
			volatility: [
				{
					state: 'ready',
					averageMonthlySpend: 101.2,
					standardDeviation: 10.3,
				},
			],
			fixedVsDiscretionary: [
				{ state: 'ready', classification: 'FIXED' },
			],
			anomalies: [{ state: 'ready', isAnomaly: true }],
			weekOfMonthVelocity: [
				{
					state: 'ready',
					weeks: [{ weekOfMonth: 0, averageSpend: 25.55 }],
				},
			],
			breakDays: [{ state: 'breached', breakDay: 19 }],
		});
	});
});
