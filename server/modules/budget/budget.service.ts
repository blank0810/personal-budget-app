import prisma from '@/lib/prisma';
import {
	CreateBudgetInput,
	GetBudgetsInput,
	UpdateBudgetInput,
	BudgetHealthSummary,
	MonthlyTrend,
	CategoryRecommendation,
	ProblemCategory,
} from './budget.types';
import { CategoryService } from '../category/category.service';
import { startOfMonth, endOfMonth, subMonths, format, eachMonthOfInterval } from 'date-fns';

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
		const budgets = await prisma.budget.findMany({
			where: {
				userId,
				month: filters?.month
					? {
							gte: startOfMonth(filters.month),
							lte: endOfMonth(filters.month),
						}
					: undefined,
			},
			include: {
				category: true,
				expenses: true, // To calculate spent amount
			},
			orderBy: {
				amount: 'desc',
			},
		});

		// Calculate spent amount for each budget
		return budgets.map((budget) => {
			const spent = budget.expenses.reduce(
				(sum, expense) => sum + expense.amount.toNumber(),
				0
			);
			return {
				...budget,
				spent,
				remaining: budget.amount.toNumber() - spent,
				percentage: (spent / budget.amount.toNumber()) * 100,
			};
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

		// Get expenses for this category in this budget's month
		const startOfMonth = new Date(budget.month);
		startOfMonth.setDate(1);
		startOfMonth.setHours(0, 0, 0, 0);

		const endOfMonth = new Date(startOfMonth);
		endOfMonth.setMonth(endOfMonth.getMonth() + 1);
		endOfMonth.setDate(0);
		endOfMonth.setHours(23, 59, 59, 999);

		const expenses = await prisma.expense.findMany({
			where: {
				userId,
				categoryId: budget.categoryId,
				date: {
					gte: startOfMonth,
					lte: endOfMonth,
				},
			},
			orderBy: { date: 'asc' },
			include: { account: true },
		});

		// Calculate metrics
		const totalSpent = expenses.reduce(
			(sum, e) => sum + Number(e.amount),
			0
		);
		const budgetLimit = Number(budget.amount);
		const remaining = budgetLimit - totalSpent;
		const percentage = (totalSpent / budgetLimit) * 100;

		// Calculate burn rate
		const today = new Date();
		const daysElapsed = Math.max(
			1,
			Math.ceil(
				(today.getTime() - startOfMonth.getTime()) /
					(1000 * 60 * 60 * 24)
			)
		);
		const daysInMonth = endOfMonth.getDate();
		const daysRemaining = Math.max(0, daysInMonth - daysElapsed);

		const dailyBurnRate = totalSpent / daysElapsed;
		const allowedDailyRate = budgetLimit / daysInMonth;

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
			metrics: {
				limit: budgetLimit,
				spent: totalSpent,
				remaining,
				percentage,
				daysElapsed,
				daysRemaining,
				daysInMonth,
				dailyBurnRate,
				allowedDailyRate,
				isOverBudget: percentage > 100,
				burnStatus:
					dailyBurnRate > allowedDailyRate
						? ('overpace' as const)
						: ('ontrack' as const),
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
				expenses: true,
			},
		});

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
				const spent = b.expenses.reduce(
					(sum, e) => sum + Number(e.amount),
					0
				);
				return spent > Number(b.amount);
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
				expenses: true,
			},
			orderBy: { month: 'asc' },
		});

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

			let totalBudgeted = 0;
			let totalSpent = 0;
			let categoriesOnTrack = 0;
			let categoriesOver = 0;

			for (const budget of monthBudgets) {
				const budgetAmount = Number(budget.amount);
				const spent = budget.expenses.reduce(
					(sum, e) => sum + Number(e.amount),
					0
				);
				const percentage =
					budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

				totalBudgeted += budgetAmount;
				totalSpent += spent;

				if (percentage <= 100) {
					categoriesOnTrack++;
				} else {
					categoriesOver++;
				}
			}

			const savings = totalBudgeted - totalSpent;
			const adherencePercent =
				totalBudgeted > 0
					? Math.min(100, (totalSpent / totalBudgeted) * 100)
					: 0;

			trends.push({
				month: monthDate,
				monthLabel: format(monthDate, 'MMM yyyy'),
				totalBudgeted,
				totalSpent,
				savings,
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
				expenses: true,
			},
		});

		// Group by category
		const categoryData = new Map<
			string,
			{
				name: string;
				budgets: Array<{
					amount: number;
					spent: number;
					percentage: number;
				}>;
			}
		>();

		for (const budget of allBudgets) {
			const budgetAmount = Number(budget.amount);
			const spent = budget.expenses.reduce(
				(sum, e) => sum + Number(e.amount),
				0
			);
			const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

			const existing = categoryData.get(budget.categoryId);
			if (existing) {
				existing.budgets.push({ amount: budgetAmount, spent, percentage });
			} else {
				categoryData.set(budget.categoryId, {
					name: budget.category.name,
					budgets: [{ amount: budgetAmount, spent, percentage }],
				});
			}
		}

		// Analyze each category and generate recommendations
		const recommendations: CategoryRecommendation[] = [];

		for (const [categoryId, data] of categoryData) {
			const monthsAnalyzed = data.budgets.length;
			const avgBudget =
				data.budgets.reduce((sum, b) => sum + b.amount, 0) / monthsAnalyzed;
			const avgSpent =
				data.budgets.reduce((sum, b) => sum + b.spent, 0) / monthsAnalyzed;
			const variance =
				avgBudget > 0 ? ((avgSpent - avgBudget) / avgBudget) * 100 : 0;

			const monthsOver = data.budgets.filter((b) => b.percentage > 100).length;
			const monthsUnder = data.budgets.filter((b) => b.percentage < 60).length;

			let recommendation: 'increase' | 'decrease' | 'stable';
			let suggestedAmount: number | null = null;
			let trend: string;

			// Determine recommendation based on patterns
			if (monthsOver >= 3) {
				// Consistently over budget - suggest increase
				recommendation = 'increase';
				// Suggest 10% above average spending, rounded to nearest 10
				suggestedAmount = Math.ceil((avgSpent * 1.1) / 10) * 10;
				trend = `Over ${monthsOver}/${monthsAnalyzed} months`;
			} else if (monthsUnder >= 3) {
				// Consistently under-utilizing - suggest decrease
				recommendation = 'decrease';
				// Suggest average spending + 20% buffer, rounded to nearest 10
				suggestedAmount = Math.ceil((avgSpent * 1.2) / 10) * 10;
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
				avgBudget: Math.round(avgBudget * 100) / 100,
				avgSpent: Math.round(avgSpent * 100) / 100,
				variance: Math.round(variance * 10) / 10,
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
};
