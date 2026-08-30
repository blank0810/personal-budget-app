import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
	CreateBudgetInput,
	GetBudgetsInput,
	UpdateBudgetInput,
	BudgetHealthSummary,
	MonthlyTrend,
	CategoryRecommendation,
	ProblemCategory,
	ReplicateBudgetsInput,
	BudgetReplicationItem,
} from './budget.types';
import { CategoryService } from '../category/category.service';
import { computeBurnMetrics, computeSafeToSpend } from './budget.burn';
import { BudgetAnalyticsService } from './budget.analytics.service';
import { getDecimalMedian } from './budget.analytics.math';
import {
	addUtcMonths,
	eachUtcMonth,
	formatUtcMonth,
	getUtcMonthBounds,
	getUtcMonthKey,
	normalizeBudgetMonth,
} from './budget.month';

type BudgetMonthReference = {
	id: string;
	month: Date;
};

const MIN_MONTHS_FOR_BUDGET_RECOMMENDATION = 3;

async function getSpendByBudgetMonth(
	userId: string,
	budgets: BudgetMonthReference[],
	windowStart: Date,
	windowEnd: Date
): Promise<Map<string, Prisma.Decimal>> {
	if (budgets.length === 0) return new Map();

	const spendGroups = await prisma.expense.groupBy({
		by: ['budgetId'],
		where: {
			userId,
			budgetId: { in: budgets.map((budget) => budget.id) },
			date: { gte: windowStart, lte: windowEnd },
			// Pair every envelope with its own month inside one query. A global
			// window alone would still count a misdated expense linked to another
			// month's envelope.
			OR: budgets.map((budget) => {
				const { start, end } = getUtcMonthBounds(budget.month);
				return {
					budgetId: budget.id,
					date: { gte: start, lte: end },
				};
			}),
		},
		_sum: { amount: true },
	});

	const spendByBudget = new Map<string, Prisma.Decimal>();
	for (const group of spendGroups) {
		if (group.budgetId) {
			spendByBudget.set(
				group.budgetId,
				group._sum.amount ?? new Prisma.Decimal(0)
			);
		}
	}

	return spendByBudget;
}

export const BudgetService = {
	/**
	 * Create a new budget (envelope-style)
	 */
	async createBudget(userId: string, data: CreateBudgetInput) {
		// Handle category: get existing or create new
		let categoryId = data.categoryId;

		if (!categoryId && data.categoryName) {
			const category = await CategoryService.getOrCreateCategory(
				userId,
				data.categoryName,
				'EXPENSE' // Budgets are for expenses
			);
			categoryId = category.id;
		}

		if (!categoryId) {
			throw new Error('Category is required');
		}

		return await prisma.budget.create({
			data: {
				name: data.name,
				amount: data.amount,
				month: data.month,
				categoryId,
				userId,
			},
		});
	},

	/**
	 * Get all budgets for a user
	 * Includes category and calculated spent amount
	 */
	async getBudgets(userId: string, filters?: GetBudgetsInput) {
		const month = filters?.month ?? new Date();
		const { start: monthStart, end: monthEnd } = getUtcMonthBounds(month);
		const today = new Date();
		const where = {
			userId,
			month: filters?.month
				? {
						gte: monthStart,
						lte: monthEnd,
					}
				: undefined,
		};

		const [budgets, spentByBudget] = await Promise.all([
			prisma.budget.findMany({
				where,
				include: { category: true },
				orderBy: { amount: 'desc' },
			}),
			prisma.expense.groupBy({
				by: ['budgetId'],
				where: {
					userId,
					budgetId: { not: null },
					// Mirror the budget `where` above: an unfiltered call returns
					// budgets across ALL months, so date-scoping the aggregate
					// would report spent: 0 for every non-current envelope.
					date: filters?.month
						? { gte: monthStart, lte: monthEnd }
						: undefined,
				},
				_sum: { amount: true },
			}),
		]);

		const spentMap = new Map(
			spentByBudget.map((group) => [
				group.budgetId as string,
				group._sum.amount ?? new Prisma.Decimal(0),
			])
		);

		// Calculate spent amount for each budget
		return budgets.map((budget) => {
			const amount = budget.amount;
			const spent =
				spentMap.get(budget.id) ?? new Prisma.Decimal(0);
			const remaining = amount.minus(spent);
			const percentage = amount.greaterThan(0)
				? spent.dividedBy(amount).times(100)
				: new Prisma.Decimal(0);
			const budgetMonth = getUtcMonthBounds(budget.month);
			const burn = computeBurnMetrics({
				monthStart: budgetMonth.start,
				monthEnd: budgetMonth.end,
				totalSpent: spent,
				budgetLimit: amount,
				today,
			});
			const safeToSpend = computeSafeToSpend({
				budgetLimit: amount,
				totalSpent: spent,
				daysRemaining: burn.daysRemaining,
			});

			return {
				...budget,
				spent: spent.toNumber(),
				remaining: remaining.toNumber(),
				percentage: percentage.toNumber(),
				daysElapsed: burn.daysElapsed,
				daysRemaining: burn.daysRemaining,
				daysInMonth: burn.daysInMonth,
				expectedPercentage: burn.expectedPercentage,
				burnStatus: burn.burnStatus,
				burnStatusReason: burn.burnStatusReason,
				safeToSpend,
			};
		});
	},

	/**
	 * Get budgets with same-category coverage evidence for UI and health rollups.
	 * Coverage is resolved once for the complete result set, never per envelope.
	 */
	async getBudgetsWithCoverage(userId: string, filters?: GetBudgetsInput) {
		const budgets = await this.getBudgets(userId, filters);
		if (budgets.length === 0) return [];

		const coverage = await BudgetAnalyticsService.getCoverageRatios(
			userId,
			budgets.map((budget) => ({
				id: budget.id,
				categoryId: budget.categoryId,
				month: budget.month,
			}))
		);
		const coverageByBudget = new Map(
			coverage.map((item) => [item.budgetId, item])
		);

		return budgets.map((budget) => {
			const item = coverageByBudget.get(budget.id);
			return {
				...budget,
				coverageRatio: item?.coverageRatio ?? null,
				unlinkedSameCategorySpend:
					item?.unlinkedSameCategorySpend ?? 0,
				unlinkedExpenseCount: item?.unlinkedExpenseCount ?? 0,
			};
		});
	},

	/**
	 * Lean budget list for pickers — id/name/category only.
	 *
	 * `getBudgets` eagerly loads every linked expense to compute `spent`; callers
	 * that only need to render a dropdown must not pay for that.
	 */
	async getBudgetOptions(userId: string, month: Date) {
		const { start, end } = getUtcMonthBounds(month);
		return await prisma.budget.findMany({
			where: {
				userId,
				month: { gte: start, lte: end },
			},
			select: {
				id: true,
				name: true,
				categoryId: true,
				category: { select: { name: true } },
			},
			orderBy: { name: 'asc' },
		});
	},

	/**
	 * Get a single budget by ID
	 */
	async getBudgetById(userId: string, budgetId: string) {
		return await prisma.budget.findUnique({
			where: { id: budgetId, userId },
			include: {
				category: true,
			},
		});
	},

	/**
	 * Get a budget with all linked expenses and calculated metrics
	 * For the Budget Ledger view
	 */
	async getBudgetWithExpenses(userId: string, budgetId: string) {
		const budget = await prisma.budget.findFirst({
			where: { id: budgetId, userId },
			include: { category: true },
		});

		if (!budget) return null;

		// Define month boundaries for time-based metrics
		const { start: monthStart, end: monthEnd } = getUtcMonthBounds(
			budget.month
		);

		const linkedWhere = {
			userId,
			budgetId: budget.id,
			date: {
				gte: monthStart,
				lte: monthEnd,
			},
		};

		const [expenses, unlinkedExpenses, spentAggregate] = await Promise.all([
			// Fetch only expenses linked to THIS specific budget (envelope isolation)
			prisma.expense.findMany({
				where: linkedWhere,
				orderBy: { date: 'asc' },
				include: { account: true },
			}),
			// Fetch unlinked expenses in the same category for transparency
			prisma.expense.findMany({
				where: {
					userId,
					categoryId: budget.categoryId,
					budgetId: null,
					date: {
						gte: monthStart,
						lte: monthEnd,
					},
				},
				orderBy: { date: 'asc' },
				include: { account: true },
			}),
			// Let PostgreSQL total exact NUMERIC values rather than accumulating
			// binary floats in application code.
			prisma.expense.aggregate({
				where: linkedWhere,
				_sum: { amount: true },
			}),
		]);

		const totalSpent =
			spentAggregate._sum.amount ?? new Prisma.Decimal(0);
		const budgetLimit = budget.amount;
		const remaining = budgetLimit.minus(totalSpent);
		const percentage = budgetLimit.greaterThan(0)
			? totalSpent.dividedBy(budgetLimit).times(100)
			: new Prisma.Decimal(0);

		const burn = computeBurnMetrics({
			monthStart,
			monthEnd,
			totalSpent,
			budgetLimit,
		});
		const safeToSpend = computeSafeToSpend({
			budgetLimit,
			totalSpent,
			daysRemaining: burn.daysRemaining,
		});

		// Add running total to expenses
		let runningTotal = new Prisma.Decimal(0);
		const expensesWithRunning = expenses.map((expense) => {
			runningTotal = runningTotal.plus(expense.amount);
			return {
				...expense,
				runningTotal: runningTotal.toNumber(),
				isOverBudget: runningTotal.greaterThan(budgetLimit),
			};
		});

		return {
			budget,
			expenses: expensesWithRunning,
			unlinkedExpenses,
			metrics: {
				limit: budgetLimit.toNumber(),
				spent: totalSpent.toNumber(),
				remaining: remaining.toNumber(),
				percentage: percentage.toNumber(),
				...burn,
				safeToSpend,
				isOverBudget: percentage.greaterThan(100),
			},
		};
	},

	/**
	 * Update a budget
	 */
	async updateBudget(userId: string, data: UpdateBudgetInput) {
		const { id, ...updateData } = data;
		return await prisma.budget.update({
			where: { id, userId },
			data: updateData,
		});
	},

	/**
	 * Delete a budget
	 */
	async deleteBudget(userId: string, budgetId: string) {
		return await prisma.budget.delete({
			where: { id: budgetId, userId },
		});
	},

	/**
	 * Get budget health summary for a specific month
	 * Includes problem detection based on 6-month history
	 */
	async getBudgetHealthSummary(
		userId: string,
		month?: Date
	): Promise<BudgetHealthSummary> {
		const targetMonth = normalizeBudgetMonth(month ?? new Date());

		// Get current month budgets with calculated metrics
		const currentBudgets = await this.getBudgetsWithCoverage(userId, {
			month: targetMonth,
		});

		// If no budgets, return empty summary
		if (currentBudgets.length === 0) {
			return {
				hasBudgets: false,
				totalBudgets: 0,
				onTrack: 0,
				warning: 0,
				over: 0,
				incomplete: 0,
				totalBudgeted: 0,
				totalSpent: 0,
				problemCategories: [],
			};
		}

		// Calculate current month metrics
		const buckets = currentBudgets.reduce(
			(counts, budget) => {
				const amount = budget.amount;
				const spent = new Prisma.Decimal(budget.spent);
				const percentage = amount.greaterThan(0)
					? spent.dividedBy(amount).times(100)
					: new Prisma.Decimal(0);

				if (percentage.greaterThan(100)) {
					counts.over += 1;
				} else if (percentage.greaterThanOrEqualTo(80)) {
					counts.warning += 1;
				} else if (
					budget.coverageRatio !== null &&
					budget.coverageRatio < 1
				) {
					counts.incomplete += 1;
				} else {
					counts.onTrack += 1;
				}

				return counts;
			},
			{ onTrack: 0, warning: 0, over: 0, incomplete: 0 }
		);
		const totalBudgeted = currentBudgets.reduce(
			(sum, budget) => sum.plus(budget.amount),
			new Prisma.Decimal(0)
		);
		const totalSpent = currentBudgets.reduce(
			(sum, budget) => sum.plus(budget.spent),
			new Prisma.Decimal(0)
		);

		// Get 6 months of history for problem detection
		const sixMonthsAgo = addUtcMonths(targetMonth, -5);
		const targetMonthEnd = getUtcMonthBounds(targetMonth).end;
		const historicalBudgets = await prisma.budget.findMany({
			where: {
				userId,
				month: {
					gte: sixMonthsAgo,
					lte: targetMonthEnd,
				},
			},
			include: {
				category: true,
			},
		});
		const historicalSpend = await getSpendByBudgetMonth(
			userId,
			historicalBudgets,
			sixMonthsAgo,
			targetMonthEnd
		);

		// Group by category and analyze patterns
		const categoryHistory = new Map<
			string,
			{
				name: string;
				budgets: typeof historicalBudgets;
			}
		>();

		for (const budget of historicalBudgets) {
			const existing = categoryHistory.get(budget.categoryId);
			if (existing) {
				existing.budgets.push(budget);
			} else {
				categoryHistory.set(budget.categoryId, {
					name: budget.category.name,
					budgets: [budget],
				});
			}
		}

		// Identify problem categories
		const problemCategories: ProblemCategory[] = [];

		for (const [categoryId, data] of categoryHistory) {
			const monthsOver = data.budgets.filter((b) => {
				const spent =
					historicalSpend.get(b.id) ?? new Prisma.Decimal(0);
				return spent.greaterThan(b.amount);
			}).length;

			// Check current month status for warning
			const currentBudget = currentBudgets.find(
				(b) => b.categoryId === categoryId
			);
			const currentPercentage = currentBudget
				? currentBudget.amount.greaterThan(0)
					? new Prisma.Decimal(currentBudget.spent)
							.dividedBy(currentBudget.amount)
							.times(100)
					: new Prisma.Decimal(0)
				: null;
			const isCurrentWarning =
				currentPercentage !== null &&
				currentPercentage.greaterThanOrEqualTo(80) &&
				currentPercentage.lessThanOrEqualTo(100);
			const isCurrentOver =
				currentPercentage !== null &&
				currentPercentage.greaterThan(100);

			// Flag if over 3+ months historically OR current status is concerning
			if (monthsOver >= 3) {
				problemCategories.push({
					categoryId,
					name: data.name,
					status: 'over',
					detail: `over ${monthsOver} of last 6 months`,
					monthsOver,
				});
			} else if (isCurrentOver) {
				problemCategories.push({
					categoryId,
					name: data.name,
					status: 'over',
					detail: `at ${currentPercentage.toFixed(0)}%`,
					monthsOver,
				});
			} else if (isCurrentWarning) {
				problemCategories.push({
					categoryId,
					name: data.name,
					status: 'warning',
					detail: `at ${currentPercentage.toFixed(0)}%`,
					monthsOver,
				});
			}
		}

		// Sort by severity (over first, then by monthsOver)
		problemCategories.sort((a, b) => {
			if (a.status === 'over' && b.status !== 'over') return -1;
			if (a.status !== 'over' && b.status === 'over') return 1;
			return b.monthsOver - a.monthsOver;
		});

		return {
			hasBudgets: true,
			totalBudgets: currentBudgets.length,
			...buckets,
			totalBudgeted: totalBudgeted.toNumber(),
			totalSpent: totalSpent.toNumber(),
			problemCategories,
		};
	},

	/**
	 * Get budget trends over time
	 * Returns monthly breakdown for the specified date range
	 */
	async getBudgetTrends(
		userId: string,
		from: Date,
		to: Date
	): Promise<MonthlyTrend[]> {
		const trends: MonthlyTrend[] = [];
		const startDate = normalizeBudgetMonth(from);
		const endDate = getUtcMonthBounds(to).end;

		const allBudgets = await prisma.budget.findMany({
			where: {
				userId,
				month: {
					gte: startDate,
					lte: endDate,
				},
			},
			include: {
				category: true,
			},
			orderBy: { month: 'asc' },
		});
		const spendByBudget = await getSpendByBudgetMonth(
			userId,
			allBudgets,
			startDate,
			endDate
		);

		// Group budgets by month using UTC to avoid timezone shifts
		const budgetsByMonth = new Map<string, typeof allBudgets>();
		for (const budget of allBudgets) {
			const monthKey = getUtcMonthKey(budget.month);
			const existing = budgetsByMonth.get(monthKey) || [];
			existing.push(budget);
			budgetsByMonth.set(monthKey, existing);
		}

		// Build trends array for each month in the range
		const monthsInRange = eachUtcMonth(startDate, endDate);
		for (const monthDate of monthsInRange) {
			const monthKey = getUtcMonthKey(monthDate);
			const monthBudgets = budgetsByMonth.get(monthKey) || [];

			if (monthBudgets.length === 0) {
				// No budgets for this month
				trends.push({
					month: monthDate,
					monthLabel: formatUtcMonth(monthDate),
					totalBudgeted: 0,
					totalSpent: 0,
					savings: 0,
					adherencePercent: 0,
					categoriesOnTrack: 0,
					categoriesOver: 0,
					totalCategories: 0,
				});
				continue;
			}

			let totalBudgeted = new Prisma.Decimal(0);
			let totalSpent = new Prisma.Decimal(0);
			let categoriesOnTrack = 0;
			let categoriesOver = 0;

			for (const budget of monthBudgets) {
				const spent =
					spendByBudget.get(budget.id) ?? new Prisma.Decimal(0);
				const percentage = budget.amount.greaterThan(0)
					? spent.dividedBy(budget.amount).times(100)
					: new Prisma.Decimal(0);

				totalBudgeted = totalBudgeted.plus(budget.amount);
				totalSpent = totalSpent.plus(spent);

				if (percentage.lessThanOrEqualTo(100)) {
					categoriesOnTrack++;
				} else {
					categoriesOver++;
				}
			}

			const savings = totalBudgeted.minus(totalSpent);
			const adherencePercent =
				totalBudgeted.greaterThan(0)
					? Math.min(
							100,
							totalSpent.dividedBy(totalBudgeted).times(100).toNumber()
						)
					: 0;

			trends.push({
				month: monthDate,
				monthLabel: formatUtcMonth(monthDate),
				totalBudgeted: totalBudgeted.toNumber(),
				totalSpent: totalSpent.toNumber(),
				savings: savings.toNumber(),
				adherencePercent,
				categoriesOnTrack,
				categoriesOver,
				totalCategories: monthBudgets.length,
			});
		}

		return trends;
	},

	/**
	 * Get budget recommendations based on historical patterns
	 * Analyzes categories and suggests adjustments
	 */
	async getBudgetRecommendations(
		userId: string,
		months: number = 6
	): Promise<CategoryRecommendation[]> {
		const now = new Date();
		const startDate = addUtcMonths(now, -(months - 1));
		const endDate = getUtcMonthBounds(now).end;

		// Get all budgets in the date range
		const allBudgets = await prisma.budget.findMany({
			where: {
				userId,
				month: {
					gte: startDate,
					lte: endDate,
				},
			},
			include: {
				category: true,
			},
		});
		const spendByBudget = await getSpendByBudgetMonth(
			userId,
			allBudgets,
			startDate,
			endDate
		);

		// Group by category
		const categoryData = new Map<
			string,
			{
				name: string;
				budgets: Array<{
					amount: Prisma.Decimal;
					spent: Prisma.Decimal;
				}>;
			}
		>();

		for (const budget of allBudgets) {
			const spent =
				spendByBudget.get(budget.id) ?? new Prisma.Decimal(0);

			const existing = categoryData.get(budget.categoryId);
			if (existing) {
				existing.budgets.push({ amount: budget.amount, spent });
			} else {
				categoryData.set(budget.categoryId, {
					name: budget.category.name,
					budgets: [{ amount: budget.amount, spent }],
				});
			}
		}

		// Analyze each category and generate recommendations
		const recommendations: CategoryRecommendation[] = [];

		for (const [categoryId, data] of categoryData) {
			const monthsAnalyzed = data.budgets.length;
			const avgBudget = data.budgets
				.reduce(
					(sum, budget) => sum.plus(budget.amount),
					new Prisma.Decimal(0)
				)
				.dividedBy(monthsAnalyzed);
			const avgSpent = data.budgets
				.reduce(
					(sum, budget) => sum.plus(budget.spent),
					new Prisma.Decimal(0)
				)
				.dividedBy(monthsAnalyzed);
			const medianSpent = getDecimalMedian(
				data.budgets.map((budget) => budget.spent)
			);
			const variance =
				avgBudget.greaterThan(0)
					? avgSpent.minus(avgBudget).dividedBy(avgBudget).times(100)
					: new Prisma.Decimal(0);

			const monthsOver = data.budgets.filter(
				(budget) =>
					budget.amount.greaterThan(0) &&
					budget.spent.greaterThan(budget.amount)
			).length;
			const monthsUnder = data.budgets.filter((budget) =>
				budget.amount.greaterThan(0)
					? budget.spent
							.dividedBy(budget.amount)
							.times(100)
							.lessThan(60)
					: true
			).length;

			let recommendation: CategoryRecommendation['recommendation'];
			let suggestedAmount: number | null = null;
			let trend: string;

			// Determine recommendation based on patterns
			if (monthsAnalyzed < MIN_MONTHS_FOR_BUDGET_RECOMMENDATION) {
				recommendation = 'insufficient_history';
				trend = `Building history (${monthsAnalyzed}/${MIN_MONTHS_FOR_BUDGET_RECOMMENDATION} mo)`;
			} else if (monthsOver >= 3) {
				// Chronic overspend is evidence, not permission to raise the target
				// above observed behavior. Use the robust historical midpoint itself.
				recommendation = 'increase';
				suggestedAmount = medianSpent.toDecimalPlaces(2).toNumber();
				trend = `Over ${monthsOver}/${monthsAnalyzed} months`;
			} else if (monthsUnder >= 3) {
				// Consistently under-utilizing - suggest decrease
				recommendation = 'decrease';
				// Use the median so one blowout month cannot set the base.
				suggestedAmount = medianSpent
					.times('1.2')
					.dividedBy(10)
					.ceil()
					.times(10)
					.toNumber();
				trend = `Under ${monthsUnder}/${monthsAnalyzed} months`;
			} else {
				// Relatively stable
				recommendation = 'stable';
				suggestedAmount = null;
				const onTrack = monthsAnalyzed - monthsOver - monthsUnder;
				trend = `Stable ${onTrack}/${monthsAnalyzed} months`;
			}

			recommendations.push({
				categoryId,
				categoryName: data.name,
				monthsAnalyzed,
				avgBudget: avgBudget.toDecimalPlaces(2).toNumber(),
				avgSpent: avgSpent.toDecimalPlaces(2).toNumber(),
				variance: variance.toDecimalPlaces(1).toNumber(),
				monthsOver,
				monthsUnder,
				recommendation,
				suggestedAmount,
				trend,
			});
		}

		// Sort by recommendation priority (increase first, then decrease, then stable)
		recommendations.sort((a, b) => {
			const priority: Record<
				CategoryRecommendation['recommendation'],
				number
			> = {
				increase: 0,
				decrease: 1,
				stable: 2,
				insufficient_history: 3,
			};
			if (priority[a.recommendation] !== priority[b.recommendation]) {
				return priority[a.recommendation] - priority[b.recommendation];
			}
			// Within same priority, sort by variance (highest first for increase)
			return Math.abs(b.variance) - Math.abs(a.variance);
		});

		return recommendations;
	},

	/**
	 * Get budgets from a source month with recommendation data for replication preview
	 */
	async getBudgetsForReplication(
		userId: string,
		sourceMonth: Date
	): Promise<BudgetReplicationItem[]> {
		const { start: monthStart, end: monthEnd } = getUtcMonthBounds(
			sourceMonth
		);

		// Get budgets for the source month
		const budgets = await prisma.budget.findMany({
			where: {
				userId,
				month: {
					gte: monthStart,
					lte: monthEnd,
				},
			},
			include: {
				category: true,
			},
			orderBy: { name: 'asc' },
		});

		if (budgets.length === 0) {
			return [];
		}

		// Get recommendations for all categories (reuse existing logic)
		const recommendations = await this.getBudgetRecommendations(userId, 6);
		const recommendationMap = new Map(
			recommendations.map((r) => [r.categoryId, r])
		);

		// Merge budget data with recommendations
		return budgets.map((budget) => {
			const rec = recommendationMap.get(budget.categoryId);
			return {
				id: budget.id,
				name: budget.name,
				amount: Number(budget.amount),
				categoryId: budget.categoryId,
				categoryName: budget.category.name,
				recommendation: rec?.recommendation ?? 'insufficient_history',
				suggestedAmount: rec?.suggestedAmount ?? null,
				trend: rec?.trend ?? 'Building history (0/3 mo)',
			};
		});
	},

	/**
	 * Replicate budgets from source month to target month
	 * Skips budgets that already exist in target month (by name)
	 */
	async replicateBudgets(
		userId: string,
		input: ReplicateBudgetsInput
	): Promise<{ success: boolean; created: number; skipped: string[] }> {
		const { start: targetMonthStart, end: targetMonthEnd } =
			getUtcMonthBounds(input.targetMonth);

		// Get existing budgets in target month to check for duplicates
		const existingBudgets = await prisma.budget.findMany({
			where: {
				userId,
				month: {
					gte: targetMonthStart,
					lte: targetMonthEnd,
				},
			},
			select: { name: true },
		});

		const existingNames = new Set(existingBudgets.map((b) => b.name));

		// Separate items into create vs skip
		const toCreate: typeof input.budgetItems = [];
		const skipped: string[] = [];

		for (const item of input.budgetItems) {
			if (existingNames.has(item.name)) {
				skipped.push(item.name);
			} else {
				toCreate.push(item);
			}
		}

		// Batch create new budgets
		if (toCreate.length > 0) {
			await prisma.budget.createMany({
				data: toCreate.map((item) => ({
					name: item.name,
					amount: item.amount,
					categoryId: item.categoryId,
					month: targetMonthStart,
					userId,
				})),
			});
		}

		return {
			success: true,
			created: toCreate.length,
			skipped,
		};
	},

	/**
	 * Get all months that have budgets (for source month picker)
	 */
	async getMonthsWithBudgets(userId: string): Promise<Date[]> {
		const budgets = await prisma.budget.findMany({
			where: { userId },
			select: { month: true },
			distinct: ['month'],
			orderBy: { month: 'desc' },
		});

		return budgets.map((b) => b.month);
	},
};
