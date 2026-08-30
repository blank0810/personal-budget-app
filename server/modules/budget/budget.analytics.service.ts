import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { endOfMonth, startOfMonth } from 'date-fns';
import type {
	BudgetCoverage,
	BudgetCoverageEnvelope,
} from './budget.analytics.types';

function monthKey(date: Date): string {
	return startOfMonth(date).getTime().toString();
}

function categoryMonthKey(categoryId: string, date: Date): string {
	return `${categoryId}:${monthKey(date)}`;
}

export const BudgetAnalyticsService = {
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
