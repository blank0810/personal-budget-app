import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
	addUtcMonths,
	differenceInUtcCalendarDays,
	getUtcCategoryMonthKey,
	getUtcMonthBounds,
	normalizeBudgetMonth,
} from './budget.month';
import type {
	AdvancedBudgetAnalytics,
	BudgetBreakDayInsight,
	BudgetCoverage,
	BudgetCoverageEnvelope,
	CategoryAnomalyInsight,
	CategorySpendComparison,
	CategoryVolatilityInsight,
	FixedVsDiscretionaryInsight,
	InferredEnvelopeOffer,
	RevealedBudgetInsight,
	WeekOfMonthVelocityInsight,
} from './budget.analytics.types';
import { getDecimalMedian } from './budget.analytics.math';
import type { AdvancedBudgetAnalyticsInput } from './budget.types';

export const MIN_LOGGING_DAYS_FOR_ENVELOPE_OFFER = 42;
const ENVELOPE_OFFER_TRAILING_MONTHS = 6;
export const MIN_MONTHS_FOR_ADVANCED_ANALYTICS = 3;
const FIXED_SPEND_CV_THRESHOLD = new Prisma.Decimal('0.15');

interface CategoryInsightBase {
	categoryId: string;
	categoryName: string;
	monthsObserved: number;
	trailingMonths: number;
}

interface RevealedBudgetInput extends CategoryInsightBase {
	medianMonthlySpend: Prisma.Decimal | null;
}

interface VolatilityInput extends CategoryInsightBase {
	averageMonthlySpend: Prisma.Decimal | null;
	standardDeviation: Prisma.Decimal | null;
	coefficientOfVariation: Prisma.Decimal | null;
}

interface FixedVsDiscretionaryInput extends CategoryInsightBase {
	coefficientOfVariation: Prisma.Decimal | null;
}

interface AnomalyInput extends CategoryInsightBase {
	currentMonthTotal: Prisma.Decimal;
	medianMonthlySpend: Prisma.Decimal | null;
	standardDeviation: Prisma.Decimal | null;
}

interface WeekOfMonthVelocityInput extends CategoryInsightBase {
	weeklyAverages: Array<{
		weekOfMonth: number;
		averageSpend: Prisma.Decimal;
	}>;
}

interface BreakDayInput {
	budgetId: string;
	budgetName: string;
	categoryId: string;
	month: Date;
	expenseCount: number;
	breakDate: Date | null;
}

type RawNumeric = Prisma.Decimal | string;

interface CategoryHistoryRow {
	categoryId: string;
	categoryName: string;
	monthsObserved: number;
	medianMonthlySpend: RawNumeric | null;
	averageMonthlySpend: RawNumeric | null;
	standardDeviation: RawNumeric | null;
	coefficientOfVariation: RawNumeric | null;
	currentMonthTotal: RawNumeric;
}

interface WeekOfMonthVelocityRow {
	categoryId: string;
	categoryName: string;
	monthsObserved: number;
	weekOfMonth: number;
	averageSpend: RawNumeric;
}

interface BreakDayRow {
	budgetId: string;
	budgetName: string;
	categoryId: string;
	month: Date;
	expenseCount: number;
	breakDate: Date | null;
}

function asDecimal(value: RawNumeric | null): Prisma.Decimal | null {
	return value === null ? null : new Prisma.Decimal(value);
}

export function deriveRevealedBudget(
	input: RevealedBudgetInput
): RevealedBudgetInsight {
	const ready =
		input.monthsObserved >= MIN_MONTHS_FOR_ADVANCED_ANALYTICS &&
		input.medianMonthlySpend !== null;

	return {
		categoryId: input.categoryId,
		categoryName: input.categoryName,
		state: ready ? 'ready' : 'insufficient_data',
		monthsObserved: input.monthsObserved,
		trailingMonths: input.trailingMonths,
		revealedBudget: ready ? input.medianMonthlySpend!.toNumber() : null,
	};
}

export function deriveVolatility(
	input: VolatilityInput
): CategoryVolatilityInsight {
	const ready =
		input.monthsObserved >= MIN_MONTHS_FOR_ADVANCED_ANALYTICS &&
		input.averageMonthlySpend !== null &&
		!input.averageMonthlySpend.isZero() &&
		input.standardDeviation !== null &&
		input.coefficientOfVariation !== null;

	return {
		categoryId: input.categoryId,
		categoryName: input.categoryName,
		state: ready ? 'ready' : 'insufficient_data',
		monthsObserved: input.monthsObserved,
		trailingMonths: input.trailingMonths,
		averageMonthlySpend: ready
			? input.averageMonthlySpend!.toNumber()
			: null,
		standardDeviation: ready
			? input.standardDeviation!.toNumber()
			: null,
		coefficientOfVariation: ready
			? input.coefficientOfVariation!.toNumber()
			: null,
	};
}

export function deriveFixedVsDiscretionary(
	input: FixedVsDiscretionaryInput
): FixedVsDiscretionaryInsight {
	const ready =
		input.monthsObserved >= MIN_MONTHS_FOR_ADVANCED_ANALYTICS &&
		input.coefficientOfVariation !== null;

	return {
		categoryId: input.categoryId,
		categoryName: input.categoryName,
		state: ready ? 'ready' : 'insufficient_data',
		monthsObserved: input.monthsObserved,
		trailingMonths: input.trailingMonths,
		coefficientOfVariation: ready
			? input.coefficientOfVariation!.toNumber()
			: null,
		classification: ready
			? input.coefficientOfVariation!.lessThan(FIXED_SPEND_CV_THRESHOLD)
				? 'FIXED'
				: 'DISCRETIONARY'
			: null,
	};
}

export function deriveAnomaly(input: AnomalyInput): CategoryAnomalyInsight {
	const ready =
		input.monthsObserved >= MIN_MONTHS_FOR_ADVANCED_ANALYTICS &&
		input.medianMonthlySpend !== null &&
		input.standardDeviation !== null &&
		!input.standardDeviation.isZero();
	const threshold = ready
		? input.medianMonthlySpend!.plus(input.standardDeviation!.times(2))
		: null;

	return {
		categoryId: input.categoryId,
		categoryName: input.categoryName,
		state: ready ? 'ready' : 'insufficient_data',
		monthsObserved: input.monthsObserved,
		trailingMonths: input.trailingMonths,
		currentMonthTotal: input.currentMonthTotal.toNumber(),
		medianMonthlySpend: ready
			? input.medianMonthlySpend!.toNumber()
			: null,
		standardDeviation: ready
			? input.standardDeviation!.toNumber()
			: null,
		threshold: threshold?.toNumber() ?? null,
		isAnomaly: threshold
			? input.currentMonthTotal.greaterThan(threshold)
			: null,
	};
}

export function deriveWeekOfMonthVelocity(
	input: WeekOfMonthVelocityInput
): WeekOfMonthVelocityInsight {
	const ready = input.monthsObserved >= MIN_MONTHS_FOR_ADVANCED_ANALYTICS;

	return {
		categoryId: input.categoryId,
		categoryName: input.categoryName,
		state: ready ? 'ready' : 'insufficient_data',
		monthsObserved: input.monthsObserved,
		trailingMonths: input.trailingMonths,
		weeks: ready
			? input.weeklyAverages
					.slice()
					.sort((a, b) => a.weekOfMonth - b.weekOfMonth)
					.map((week) => ({
						weekOfMonth: week.weekOfMonth,
						averageSpend: week.averageSpend.toNumber(),
					}))
			: [],
	};
}

export function deriveBreakDay(input: BreakDayInput): BudgetBreakDayInsight {
	return {
		budgetId: input.budgetId,
		budgetName: input.budgetName,
		categoryId: input.categoryId,
		month: input.month,
		state:
			input.expenseCount === 0
				? 'insufficient_data'
				: input.breakDate
					? 'breached'
					: 'not_breached',
		expenseCount: input.expenseCount,
		breakDay: input.breakDate?.getUTCDate() ?? null,
	};
}

function buildCategoryHistoryQuery(
	userId: string,
	historyStart: Date,
	monthStart: Date,
	monthEndExclusive: Date
): Prisma.Sql {
	return Prisma.sql`
		WITH "monthlySpend" AS (
			SELECT
				e."categoryId",
				DATE_TRUNC('month', e."date") AS "month",
				e."date" >= target."monthStart" AS "isCurrentMonth",
				SUM(e."amount")::numeric AS "monthlyTotal"
			FROM (
				SELECT "categoryId", "date", "amount"
				FROM "expenses"
				WHERE "userId" = ${userId}
					AND "date" >= ${historyStart}
					AND "date" < ${monthEndExclusive}
			) e
			CROSS JOIN (
				SELECT ${monthStart}::timestamp AS "monthStart"
			) target
			GROUP BY
				e."categoryId",
				DATE_TRUNC('month', e."date"),
				e."date" >= target."monthStart"
		),
		"historicalStats" AS (
			SELECT
				"categoryId",
				COUNT(*)::integer AS "monthsObserved",
				ROUND(
					PERCENTILE_CONT(0.5) WITHIN GROUP (
						ORDER BY "monthlyTotal"::double precision
					)::numeric,
					2
				) AS "medianMonthlySpend",
				AVG("monthlyTotal")::numeric AS "averageMonthlySpend",
				STDDEV_SAMP("monthlyTotal")::numeric AS "standardDeviation"
			FROM "monthlySpend"
			WHERE NOT "isCurrentMonth"
			GROUP BY "categoryId"
		),
		"currentSpend" AS (
			SELECT "categoryId", "monthlyTotal" AS "currentMonthTotal"
			FROM "monthlySpend"
			WHERE "isCurrentMonth"
		),
		"observedCategories" AS (
			SELECT DISTINCT "categoryId" FROM "monthlySpend"
		)
		SELECT
			c."id" AS "categoryId",
			c."name" AS "categoryName",
			COALESCE(h."monthsObserved", 0)::integer AS "monthsObserved",
			h."medianMonthlySpend",
			h."averageMonthlySpend",
			h."standardDeviation",
			CASE
				WHEN h."averageMonthlySpend" IS NULL
					OR h."averageMonthlySpend" = 0
					OR h."standardDeviation" IS NULL
				THEN NULL
				ELSE (
					h."standardDeviation" / h."averageMonthlySpend"
				)::numeric
			END AS "coefficientOfVariation",
			COALESCE(current_spend."currentMonthTotal", 0::numeric) AS "currentMonthTotal"
		FROM "observedCategories" observed
		JOIN "categories" c ON c."id" = observed."categoryId"
		LEFT JOIN "historicalStats" h ON h."categoryId" = c."id"
		LEFT JOIN "currentSpend" current_spend
			ON current_spend."categoryId" = c."id"
		WHERE c."userId" = ${userId}
		ORDER BY c."name", c."id"
	`;
}

function buildWeekOfMonthVelocityQuery(
	userId: string,
	historyStart: Date,
	monthStart: Date
): Prisma.Sql {
	return Prisma.sql`
		WITH "monthlyWeekSpend" AS (
			SELECT
				e."categoryId",
				DATE_TRUNC('month', e."date") AS "month",
				FLOOR((EXTRACT(DAY FROM e."date") - 1) / 7)::integer AS "weekOfMonth",
				SUM(e."amount")::numeric AS "weekTotal"
			FROM "expenses" e
			WHERE e."userId" = ${userId}
				AND e."date" >= ${historyStart}
				AND e."date" < ${monthStart}
			GROUP BY
				e."categoryId",
				DATE_TRUNC('month', e."date"),
				FLOOR((EXTRACT(DAY FROM e."date") - 1) / 7)
		),
		"categoryMonths" AS (
			SELECT DISTINCT "categoryId", "month"
			FROM "monthlyWeekSpend"
		),
		"expandedWeeks" AS (
			SELECT
				cm."categoryId",
				cm."month",
				buckets."weekOfMonth"
			FROM "categoryMonths" cm
			CROSS JOIN GENERATE_SERIES(0, 4) AS buckets("weekOfMonth")
		)
		SELECT
			c."id" AS "categoryId",
			c."name" AS "categoryName",
			COUNT(DISTINCT expanded."month")::integer AS "monthsObserved",
			expanded."weekOfMonth"::integer AS "weekOfMonth",
			AVG(COALESCE(spend."weekTotal", 0::numeric))::numeric AS "averageSpend"
		FROM "expandedWeeks" expanded
		JOIN "categories" c ON c."id" = expanded."categoryId"
		LEFT JOIN "monthlyWeekSpend" spend
			ON spend."categoryId" = expanded."categoryId"
			AND spend."month" = expanded."month"
			AND spend."weekOfMonth" = expanded."weekOfMonth"
		WHERE c."userId" = ${userId}
		GROUP BY c."id", c."name", expanded."weekOfMonth"
		ORDER BY c."name", c."id", expanded."weekOfMonth"
	`;
}

function buildBreakDayQuery(
	userId: string,
	monthStart: Date,
	monthEndExclusive: Date
): Prisma.Sql {
	return Prisma.sql`
		WITH "relevantBudgets" AS (
			SELECT b."id", b."name", b."categoryId", b."month", b."amount"
			FROM "budgets" b
			WHERE b."userId" = ${userId}
				AND b."month" >= ${monthStart}
				AND b."month" < ${monthEndExclusive}
		),
		"runningSpend" AS (
			SELECT
				e."budgetId",
				e."date",
				b."amount" AS "budgetAmount",
				(
					SUM(e."amount") OVER (PARTITION BY e."budgetId" ORDER BY e."date")
				)::numeric AS "runningTotal"
			FROM "expenses" e
			JOIN "relevantBudgets" b ON b."id" = e."budgetId"
			WHERE e."userId" = ${userId}
				AND e."date" >= b."month"
				AND e."date" < b."month" + INTERVAL '1 month'
		),
		"breakStats" AS (
			SELECT
				"budgetId",
				COUNT(*)::integer AS "expenseCount",
				MIN("date") FILTER (
					WHERE "runningTotal" > "budgetAmount"
				) AS "breakDate"
			FROM "runningSpend"
			GROUP BY "budgetId"
		)
		SELECT
			b."id" AS "budgetId",
			b."name" AS "budgetName",
			b."categoryId",
			b."month",
			COALESCE(stats."expenseCount", 0)::integer AS "expenseCount",
			stats."breakDate"
		FROM "relevantBudgets" b
		LEFT JOIN "breakStats" stats ON stats."budgetId" = b."id"
		ORDER BY b."name", b."id"
	`;
}

export const BudgetAnalyticsService = {
	async getAdvancedAnalytics(
		userId: string,
		input: AdvancedBudgetAnalyticsInput
	): Promise<AdvancedBudgetAnalytics> {
		const month = normalizeBudgetMonth(input.month);
		const historyStart = addUtcMonths(month, -input.trailingMonths);
		const { endExclusive: monthEndExclusive } = getUtcMonthBounds(month);

		const [categoryRows, weekRows, breakRows] = await Promise.all([
			prisma.$queryRaw<CategoryHistoryRow[]>(
				buildCategoryHistoryQuery(
					userId,
					historyStart,
					month,
					monthEndExclusive
				)
			),
			prisma.$queryRaw<WeekOfMonthVelocityRow[]>(
				buildWeekOfMonthVelocityQuery(userId, historyStart, month)
			),
			prisma.$queryRaw<BreakDayRow[]>(
				buildBreakDayQuery(userId, month, monthEndExclusive)
			),
		]);

		const categoryInputs = categoryRows.map((row) => ({
			categoryId: row.categoryId,
			categoryName: row.categoryName,
			monthsObserved: row.monthsObserved,
			trailingMonths: input.trailingMonths,
			medianMonthlySpend: asDecimal(row.medianMonthlySpend),
			averageMonthlySpend: asDecimal(row.averageMonthlySpend),
			standardDeviation: asDecimal(row.standardDeviation),
			coefficientOfVariation: asDecimal(row.coefficientOfVariation),
			currentMonthTotal:
				asDecimal(row.currentMonthTotal) ?? new Prisma.Decimal(0),
		}));

		const weeksByCategory = new Map<
			string,
			WeekOfMonthVelocityInput
		>();
		for (const row of weekRows) {
			const current = weeksByCategory.get(row.categoryId) ?? {
				categoryId: row.categoryId,
				categoryName: row.categoryName,
				monthsObserved: row.monthsObserved,
				trailingMonths: input.trailingMonths,
				weeklyAverages: [],
			};
			current.weeklyAverages.push({
				weekOfMonth: row.weekOfMonth,
				averageSpend:
					asDecimal(row.averageSpend) ?? new Prisma.Decimal(0),
			});
			weeksByCategory.set(row.categoryId, current);
		}

		return {
			month,
			trailingMonths: input.trailingMonths,
			revealedBudgets: categoryInputs.map(deriveRevealedBudget),
			volatility: categoryInputs.map(deriveVolatility),
			weekOfMonthVelocity: Array.from(weeksByCategory.values()).map(
				deriveWeekOfMonthVelocity
			),
			breakDays: breakRows.map(deriveBreakDay),
			fixedVsDiscretionary: categoryInputs.map(
				deriveFixedVsDiscretionary
			),
			anomalies: categoryInputs.map(deriveAnomaly),
		};
	},

	async getInferredEnvelopeOffer(
		userId: string,
		month: Date
	): Promise<InferredEnvelopeOffer> {
		const targetMonthEnd = getUtcMonthBounds(month).end;
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
						differenceInUtcCalendarDays(
							lastExpenseDate,
							firstExpenseDate
						)
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

		const targetMonth = normalizeBudgetMonth(month);
		const monthStarts = Array.from(
			{ length: ENVELOPE_OFFER_TRAILING_MONTHS },
			(_, index) =>
				addUtcMonths(
					targetMonth,
					-(ENVELOPE_OFFER_TRAILING_MONTHS - index - 1)
				)
		);
		const monthlyGroups = await Promise.all(
			monthStarts.map((monthStart) => {
				const { end: monthEnd } = getUtcMonthBounds(monthStart);
				return prisma.expense.groupBy({
					by: ['categoryId'],
					where: {
						userId,
						date: {
							gte: monthStart,
							lte: monthEnd,
						},
					},
					_sum: { amount: true },
				});
			})
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
		const {
			start: currentMonthStart,
			end: currentMonthEnd,
		} = getUtcMonthBounds(month);
		const {
			start: previousMonthStart,
			end: previousMonthEnd,
		} = getUtcMonthBounds(addUtcMonths(currentMonthStart, -1));

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
			const key = getUtcCategoryMonthKey(
				envelope.categoryId,
				envelope.month
			);
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
					OR: envelopes.map((envelope) => {
						const { start, end } = getUtcMonthBounds(envelope.month);
						return {
							budgetId: envelope.id,
							date: { gte: start, lte: end },
						};
					}),
				},
				_sum: { amount: true },
			}),
			prisma.expense.groupBy({
				by: ['categoryId', 'date'],
				where: {
					userId,
					budgetId: null,
					OR: Array.from(categoryMonths.values()).map((categoryMonth) => {
						const { start, end } = getUtcMonthBounds(
							categoryMonth.month
						);
						return {
							categoryId: categoryMonth.categoryId,
							date: { gte: start, lte: end },
						};
					}),
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
			const key = getUtcCategoryMonthKey(group.categoryId, group.date);
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
				getUtcCategoryMonthKey(envelope.categoryId, envelope.month)
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
