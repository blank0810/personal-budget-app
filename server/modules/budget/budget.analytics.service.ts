import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
	differenceInCalendarDays,
	endOfMonth,
	startOfMonth,
	subMonths,
} from 'date-fns';
import type {
	BudgetCoverage,
	BudgetCoverageEnvelope,
	CategorySpendComparison,
	InferredEnvelopeOffer,
} from './budget.analytics.types';
import { getDecimalMedian } from './budget.analytics.math';

export const MIN_LOGGING_DAYS_FOR_ENVELOPE_OFFER = 42;
const ENVELOPE_OFFER_TRAILING_MONTHS = 6;

function monthKey(date: Date): string {
	return startOfMonth(date).getTime().toString();
}

function categoryMonthKey(categoryId: string, date: Date): string {
	return `${categoryId}:${monthKey(date)}`;
}

export const BudgetAnalyticsService = {
	async getInferredEnvelopeOffer(
		userId: string,
		month: Date
	): Promise<InferredEnvelopeOffer> {
		const targetMonthEnd = endOfMonth(month);
		const historyBounds = await prisma.expense.aggregate({
			where: {
				userId,
				date: { lte: targetMonthEnd },
			},
			_min: { date: true },
			_max: { date: true },
		});
		const firstExpenseDate = historyBounds._min.date;
		const lastExpenseDate = historyBounds._max.date;
		const loggingDays =
			firstExpenseDate && lastExpenseDate
				? Math.max(
						0,
						differenceInCalendarDays(lastExpenseDate, firstExpenseDate)
					)
				: 0;

		if (loggingDays < MIN_LOGGING_DAYS_FOR_ENVELOPE_OFFER) {
			return {
				eligible: false,
				loggingDays,
				minimumLoggingDays: MIN_LOGGING_DAYS_FOR_ENVELOPE_OFFER,
				suggestions: [],
			};
		}

		const monthStarts = Array.from(
			{ length: ENVELOPE_OFFER_TRAILING_MONTHS },
			(_, index) =>
				startOfMonth(
					subMonths(month, ENVELOPE_OFFER_TRAILING_MONTHS - index - 1)
				)
		);
		const monthlyGroups = await Promise.all(
			monthStarts.map((monthStart) =>
				prisma.expense.groupBy({
					by: ['categoryId'],
					where: {
						userId,
						date: {
							gte: monthStart,
							lte: endOfMonth(monthStart),
						},
					},
					_sum: { amount: true },
				})
			)
		);

		const totalsByCategory = new Map<string, Prisma.Decimal[]>();
		for (const groups of monthlyGroups) {
			for (const group of groups) {
				const totals = totalsByCategory.get(group.categoryId) ?? [];
				totals.push(group._sum.amount ?? new Prisma.Decimal(0));
				totalsByCategory.set(group.categoryId, totals);
			}
		}

		const categoryIds = Array.from(totalsByCategory.keys());
		if (categoryIds.length === 0) {
			return {
				eligible: true,
				loggingDays,
				minimumLoggingDays: MIN_LOGGING_DAYS_FOR_ENVELOPE_OFFER,
				suggestions: [],
			};
		}

		const categories = await prisma.category.findMany({
			where: {
				userId,
				id: { in: categoryIds },
			},
			select: { id: true, name: true },
		});
		const categoryNames = new Map(
			categories.map((category) => [category.id, category.name])
		);

		const suggestions = categoryIds
			.map((categoryId) => {
				const monthlyTotals = totalsByCategory.get(categoryId) ?? [];
				return {
					categoryId,
					categoryName: categoryNames.get(categoryId) ?? 'Unknown category',
					recentAverage: getDecimalMedian(monthlyTotals),
					monthsObserved: monthlyTotals.length,
				};
			})
			.sort((a, b) =>
				b.recentAverage.comparedTo(a.recentAverage)
			)
			.map((suggestion) => ({
				categoryId: suggestion.categoryId,
				categoryName: suggestion.categoryName,
				recentAverage: suggestion.recentAverage.toNumber(),
				monthsObserved: suggestion.monthsObserved,
			}));

		return {
			eligible: true,
			loggingDays,
			minimumLoggingDays: MIN_LOGGING_DAYS_FOR_ENVELOPE_OFFER,
			suggestions,
		};
	},

	async getCategorySpendComparison(
		userId: string,
		month: Date
	): Promise<CategorySpendComparison[]> {
		const currentMonthStart = startOfMonth(month);
		const currentMonthEnd = endOfMonth(month);
		const previousMonth = subMonths(currentMonthStart, 1);
		const previousMonthStart = startOfMonth(previousMonth);
		const previousMonthEnd = endOfMonth(previousMonth);

		const [currentGroups, previousGroups] = await Promise.all([
			prisma.expense.groupBy({
				by: ['categoryId'],
				where: {
					userId,
					date: {
						gte: currentMonthStart,
						lte: currentMonthEnd,
					},
				},
				_sum: { amount: true },
			}),
			prisma.expense.groupBy({
				by: ['categoryId'],
				where: {
					userId,
					date: {
						gte: previousMonthStart,
						lte: previousMonthEnd,
					},
				},
				_sum: { amount: true },
			}),
		]);

		const categoryIds = Array.from(
			new Set([
				...currentGroups.map((group) => group.categoryId),
				...previousGroups.map((group) => group.categoryId),
			])
		);
		if (categoryIds.length === 0) return [];

		const categories = await prisma.category.findMany({
			where: {
				userId,
				id: { in: categoryIds },
			},
			select: { id: true, name: true },
		});
		const categoryNames = new Map(
			categories.map((category) => [category.id, category.name])
		);
		const currentByCategory = new Map(
			currentGroups.map((group) => [
				group.categoryId,
				group._sum.amount ?? new Prisma.Decimal(0),
			])
		);
		const previousByCategory = new Map(
			previousGroups.map((group) => [
				group.categoryId,
				group._sum.amount ?? new Prisma.Decimal(0),
			])
		);

		return categoryIds
			.map((categoryId) => {
				const currentTotal =
					currentByCategory.get(categoryId) ?? new Prisma.Decimal(0);
				const previousTotal =
					previousByCategory.get(categoryId) ?? new Prisma.Decimal(0);
				const amountDelta = currentTotal.minus(previousTotal);
				const absoluteDelta = amountDelta.abs();
				const percentDelta = previousTotal.isZero()
					? null
					: amountDelta.dividedBy(previousTotal).times(100);

				return {
					categoryId,
					categoryName: categoryNames.get(categoryId) ?? 'Unknown category',
					currentTotal,
					previousTotal,
					amountDelta,
					absoluteDelta,
					percentDelta,
				};
			})
			.sort((a, b) =>
				b.absoluteDelta.comparedTo(a.absoluteDelta)
			)
			.map((row) => ({
				categoryId: row.categoryId,
				categoryName: row.categoryName,
				currentTotal: row.currentTotal.toNumber(),
				previousTotal: row.previousTotal.toNumber(),
				amountDelta: row.amountDelta.toNumber(),
				absoluteDelta: row.absoluteDelta.toNumber(),
				percentDelta: row.percentDelta?.toNumber() ?? null,
			}));
	},

	async getCoverageRatios(
		userId: string,
		envelopes: BudgetCoverageEnvelope[]
	): Promise<BudgetCoverage[]> {
		if (envelopes.length === 0) return [];

		const categoryMonths = new Map<
			string,
			{ categoryId: string; month: Date }
		>();
		for (const envelope of envelopes) {
			const key = categoryMonthKey(envelope.categoryId, envelope.month);
			if (!categoryMonths.has(key)) {
				categoryMonths.set(key, {
					categoryId: envelope.categoryId,
					month: envelope.month,
				});
			}
		}

		const [linkedGroups, unlinkedGroups] = await Promise.all([
			prisma.expense.groupBy({
				by: ['budgetId'],
				where: {
					userId,
					OR: envelopes.map((envelope) => ({
						budgetId: envelope.id,
						date: {
							gte: startOfMonth(envelope.month),
							lte: endOfMonth(envelope.month),
						},
					})),
				},
				_sum: { amount: true },
			}),
			prisma.expense.groupBy({
				by: ['categoryId', 'date'],
				where: {
					userId,
					budgetId: null,
					OR: Array.from(categoryMonths.values()).map((categoryMonth) => ({
						categoryId: categoryMonth.categoryId,
						date: {
							gte: startOfMonth(categoryMonth.month),
							lte: endOfMonth(categoryMonth.month),
						},
					})),
				},
				_sum: { amount: true },
				_count: { id: true },
			}),
		]);

		const linkedByBudget = new Map<string, Prisma.Decimal>();
		for (const group of linkedGroups) {
			if (group.budgetId) {
				linkedByBudget.set(
					group.budgetId,
					group._sum.amount ?? new Prisma.Decimal(0)
				);
			}
		}

		const unlinkedByCategoryMonth = new Map<
			string,
			{ spend: Prisma.Decimal; count: number }
		>();
		for (const group of unlinkedGroups) {
			const key = categoryMonthKey(group.categoryId, group.date);
			if (!categoryMonths.has(key)) continue;

			const existing = unlinkedByCategoryMonth.get(key) ?? {
				spend: new Prisma.Decimal(0),
				count: 0,
			};
			unlinkedByCategoryMonth.set(key, {
				spend: existing.spend.plus(
					group._sum.amount ?? new Prisma.Decimal(0)
				),
				count: existing.count + group._count.id,
			});
		}

		return envelopes.map((envelope) => {
			const linkedSpend =
				linkedByBudget.get(envelope.id) ?? new Prisma.Decimal(0);
			const unlinked = unlinkedByCategoryMonth.get(
				categoryMonthKey(envelope.categoryId, envelope.month)
			) ?? { spend: new Prisma.Decimal(0), count: 0 };
			const categorySpend = linkedSpend.plus(unlinked.spend);

			return {
				budgetId: envelope.id,
				linkedSpend: linkedSpend.toNumber(),
				unlinkedSameCategorySpend: unlinked.spend.toNumber(),
				unlinkedExpenseCount: unlinked.count,
				coverageRatio: categorySpend.isZero()
					? null
					: linkedSpend.dividedBy(categorySpend).toNumber(),
			};
		});
	},
};
