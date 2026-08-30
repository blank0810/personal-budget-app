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
import { startOfMonth, endOfMonth, subMonths, format, eachMonthOfInterval } from 'date-fns';
import { computeBurnMetrics } from './budget.burn';

type BudgetMonthReference = {
	id: string;
	month: Date;
};

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
			OR: budgets.map((budget) => ({
				budgetId: budget.id,
				date: {
					gte: startOfMonth(budget.month),
					lte: endOfMonth(budget.month),
				},
			})),
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
		const monthStart = startOfMonth(month);
		const monthEnd = endOfMonth(month);
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
			const amount = budget.amount.toNumber();
			const spent = (
				spentMap.get(budget.id) ?? new Prisma.Decimal(0)
			).toNumber();
			return {
				...budget,
				spent,
				remaining: amount - spent,
				percentage: (spent / amount) * 100,
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
		return await prisma.budget.findMany({
			where: {
				userId,
				month: { gte: startOfMonth(month), lte: endOfMonth(month) },
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
		const monthStart = new Date(budget.month);
		monthStart.setDate(1);
		monthStart.setHours(0, 0, 0, 0);

		const monthEnd = new Date(monthStart);
		monthEnd.setMonth(monthEnd.getMonth() + 1);
		monthEnd.setDate(0);
		monthEnd.setHours(23, 59, 59, 999);

		// Fetch only expenses linked to THIS specific budget (envelope isolation)
		const expenses = await prisma.expense.findMany({
			where: {
				userId,
				budgetId: budget.id,
				date: {
					gte: monthStart,
					lte: monthEnd,
				},
			},
			orderBy: { date: 'asc' },
			include: { account: true },
		});

		// Fetch unlinked expenses in the same category for transparency
		const unlinkedExpenses = await prisma.expense.findMany({
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
		});

		// Calculate metrics based on budget-linked expenses only
		const totalSpent = expenses.reduce(
			(sum, e) => sum + Number(e.amount),
			0
		);
		const budgetLimit = Number(budget.amount);
		const remaining = budgetLimit - totalSpent;
		const percentage = (totalSpent / budgetLimit) * 100;

		const burn = computeBurnMetrics({
			monthStart,
			monthEnd,
			totalSpent,
			budgetLimit,
		});

		// Add running total to expenses
		let runningTotal = 0;
		const expensesWithRunning = expenses.map((expense) => {
			runningTotal += Number(expense.amount);
			return {
				...expense,
				runningTotal,
				isOverBudget: runningTotal > budgetLimit,
			};
		});

		return {
			budget,
			expenses: expensesWithRunning,
			unlinkedExpenses,
			metrics: {
				limit: budgetLimit,
				spent: totalSpent,
				remaining,
				percentage,
				...burn,
				isOverBudget: percentage > 100,
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
		const targetMonth = month ? startOfMonth(month) : startOfMonth(new Date());

		// Get current month budgets with calculated metrics
		const currentBudgets = await this.getBudgets(userId, { month: targetMonth });

		// If no budgets, return empty summary
		if (currentBudgets.length === 0) {
			return {
				totalBudgets: 0,
				onTrack: 0,
				warning: 0,
				over: 0,
				totalBudgeted: 0,
				totalSpent: 0,
				problemCategories: [],
			};
		}

		// Calculate current month metrics
		const onTrack = currentBudgets.filter((b) => b.percentage < 80).length;
		const warning = currentBudgets.filter(
			(b) => b.percentage >= 80 && b.percentage <= 100
		).length;
		const over = currentBudgets.filter((b) => b.percentage > 100).length;
		const totalBudgeted = currentBudgets.reduce(
			(sum, b) => sum + Number(b.amount),
			0
		);
		const totalSpent = currentBudgets.reduce((sum, b) => sum + b.spent, 0);

		// Get 6 months of history for problem detection
		const sixMonthsAgo = startOfMonth(subMonths(targetMonth, 5));
		const historicalBudgets = await prisma.budget.findMany({
			where: {
				userId,
				month: {
					gte: sixMonthsAgo,
					lte: endOfMonth(targetMonth),
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
			endOfMonth(targetMonth)
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
			const isCurrentWarning =
				currentBudget &&
				currentBudget.percentage >= 80 &&
				currentBudget.percentage <= 100;
			const isCurrentOver =
				currentBudget && currentBudget.percentage > 100;

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
					detail: `at ${currentBudget.percentage.toFixed(0)}%`,
					monthsOver,
				});
			} else if (isCurrentWarning) {
				problemCategories.push({
					categoryId,
					name: data.name,
					status: 'warning',
					detail: `at ${currentBudget.percentage.toFixed(0)}%`,
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
			totalBudgets: currentBudgets.length,
			onTrack,
			warning,
			over,
			totalBudgeted,
			totalSpent,
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

		// Helper to get UTC-based month key (avoids timezone issues)
		const getMonthKey = (date: Date): string => {
			const year = date.getUTCFullYear();
			const month = String(date.getUTCMonth() + 1).padStart(2, '0');
			return `${year}-${month}`;
		};

		// Normalize dates - use endOfMonth for 'to' to capture all times within the month
		const startDate = startOfMonth(from);
		const endDate = endOfMonth(to);

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
			const monthKey = getMonthKey(budget.month);
			const existing = budgetsByMonth.get(monthKey) || [];
			existing.push(budget);
			budgetsByMonth.set(monthKey, existing);
		}

		// Build trends array for each month in the range
		const monthsInRange = eachMonthOfInterval({ start: startDate, end: endDate });
		for (const monthDate of monthsInRange) {
			const monthKey = getMonthKey(monthDate);
			const monthBudgets = budgetsByMonth.get(monthKey) || [];

			if (monthBudgets.length === 0) {
				// No budgets for this month
				trends.push({
					month: monthDate,
					monthLabel: format(monthDate, 'MMM yyyy'),
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
				monthLabel: format(monthDate, 'MMM yyyy'),
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
		const startDate = startOfMonth(subMonths(now, months - 1));
		const endDate = endOfMonth(now);

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

			let recommendation: 'increase' | 'decrease' | 'stable';
			let suggestedAmount: number | null = null;
			let trend: string;

			// Determine recommendation based on patterns
			if (monthsOver >= 3) {
				// Consistently over budget - suggest increase
				recommendation = 'increase';
				// Suggest 10% above average spending, rounded to nearest 10
				suggestedAmount = avgSpent
					.times('1.1')
					.dividedBy(10)
					.ceil()
					.times(10)
					.toNumber();
				trend = `Over ${monthsOver}/${monthsAnalyzed} months`;
			} else if (monthsUnder >= 3) {
				// Consistently under-utilizing - suggest decrease
				recommendation = 'decrease';
				// Suggest average spending + 20% buffer, rounded to nearest 10
				suggestedAmount = avgSpent
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
			const priority = { increase: 0, decrease: 1, stable: 2 };
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
		// Normalize to UTC midnight on 1st of month to match stored format
		const monthStart = new Date(Date.UTC(
			sourceMonth.getFullYear(),
			sourceMonth.getMonth(),
			1, 0, 0, 0, 0
		));
		const monthEnd = new Date(Date.UTC(
			sourceMonth.getFullYear(),
			sourceMonth.getMonth() + 1,
			0, 23, 59, 59, 999
		));

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
				recommendation: rec?.recommendation ?? 'stable',
				suggestedAmount: rec?.suggestedAmount ?? null,
				trend: rec?.trend ?? 'No history',
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
		// Use UTC methods to avoid timezone issues
		// The input date should already be UTC midnight on 1st of month
		const targetMonthStart = new Date(
			Date.UTC(
				input.targetMonth.getUTCFullYear(),
				input.targetMonth.getUTCMonth(),
				1,
				0,
				0,
				0,
				0
			)
		);
		const targetMonthEnd = new Date(
			Date.UTC(
				input.targetMonth.getUTCFullYear(),
				input.targetMonth.getUTCMonth() + 1,
				0,
				23,
				59,
				59,
				999
			)
		);

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
