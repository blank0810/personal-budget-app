import prisma from '@/lib/prisma';
import {
	CategoryBreakdown,
	MonthlySummary,
	FinancialStatement,
	DashboardKPIs,
} from './report.types';
import {
	endOfMonth,
	eachMonthOfInterval,
	format,
	differenceInDays,
	subDays,
} from 'date-fns';

export const ReportService = {
	/**
	 * Get spending breakdown by category for a specific period
	 */
	async getCategoryBreakdown(
		userId: string,
		startDate: Date,
		endDate: Date
	): Promise<CategoryBreakdown[]> {
		const expenses = await prisma.expense.groupBy({
			by: ['categoryId'],
			where: {
				userId,
				date: {
					gte: startDate,
					lte: endDate,
				},
			},
			_sum: {
				amount: true,
			},
		});

		const totalExpense = expenses.reduce(
			(sum, item) => sum + (item._sum.amount?.toNumber() || 0),
			0
		);

		// Fetch category details
		const categories = await prisma.category.findMany({
			where: {
				id: { in: expenses.map((e) => e.categoryId) },
			},
		});

		const breakdown = expenses.map((item) => {
			const category = categories.find((c) => c.id === item.categoryId);
			const amount = item._sum.amount?.toNumber() || 0;
			return {
				categoryId: item.categoryId,
				categoryName: category?.name || 'Unknown',
				color: category?.color,
				icon: category?.icon,
				amount,
				percentage:
					totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
			};
		});

		return breakdown.sort((a, b) => b.amount - a.amount);
	},

	/**
	 * Get monthly income vs expense summary for a range
	 */
	async getMonthlyComparison(
		userId: string,
		startDate: Date,
		endDate: Date
	): Promise<MonthlySummary[]> {
		const months = eachMonthOfInterval({ start: startDate, end: endDate });
		const summary: MonthlySummary[] = [];

		for (const monthStart of months) {
			const monthEnd = endOfMonth(monthStart);

			const [income, expense] = await Promise.all([
				prisma.income.aggregate({
					where: {
						userId,
						date: { gte: monthStart, lte: monthEnd },
					},
					_sum: { amount: true },
				}),
				prisma.expense.aggregate({
					where: {
						userId,
						date: { gte: monthStart, lte: monthEnd },
					},
					_sum: { amount: true },
				}),
			]);

			const incomeAmount = income._sum.amount?.toNumber() || 0;
			const expenseAmount = expense._sum.amount?.toNumber() || 0;

			summary.push({
				month: format(monthStart, 'MMM yyyy'),
				income: incomeAmount,
				expense: expenseAmount,
				savings: incomeAmount - expenseAmount,
			});
		}

		return summary;
	},

	/**
	 * Get Budget vs Actual spending for a specific month
	 */
	async getBudgetVsActual(userId: string, month: Date) {
		const start = new Date(month.getFullYear(), month.getMonth(), 1);
		const end = endOfMonth(start);

		// 1. Fetch Budgets for this month
		const budgets = await prisma.budget.findMany({
			where: {
				userId,
				month: start,
			},
			include: { category: true },
		});

		// 2. Fetch Expenses for this month, grouped by category
		const expenses = await prisma.expense.groupBy({
			by: ['categoryId'],
			where: {
				userId,
				date: { gte: start, lte: end },
			},
			_sum: { amount: true },
		});

		// 3. Merge and Calculate Variance
		const report = budgets.map((budget) => {
			const expenseEntry = expenses.find(
				(e) => e.categoryId === budget.categoryId
			);
			const actual = expenseEntry?._sum.amount?.toNumber() || 0;
			const budgeted = budget.amount.toNumber();

			return {
				categoryId: budget.categoryId,
				categoryName: budget.category.name,
				color: budget.category.color,
				icon: budget.category.icon,
				budgeted,
				actual,
				variance: budgeted - actual, // Positive = Under budget (Good), Negative = Over budget (Bad)
				percentUsed: budgeted > 0 ? (actual / budgeted) * 100 : 0,
			};
		});

		// Add categories with expenses but NO budget? (Optional improvement for later)
		// For now, focusing on "Budget Performance" implies tracking what *was* budgeted.

		return report.sort((a, b) => b.percentUsed - a.percentUsed);
	},

	/**
	 * Get detailed Financial Statement (Income Statement) for a period
	 */
	async getFinancialStatement(
		userId: string,
		startDate: Date,
		endDate: Date
	): Promise<FinancialStatement> {
		// 1. Fetch Income
		const incomeGroups = await prisma.income.groupBy({
			by: ['categoryId'],
			where: {
				userId,
				date: { gte: startDate, lte: endDate },
			},
			_sum: { amount: true },
		});

		// 2. Fetch Expenses
		const expenseGroups = await prisma.expense.groupBy({
			by: ['categoryId'],
			where: {
				userId,
				date: { gte: startDate, lte: endDate },
			},
			_sum: { amount: true },
		});

		// 3. Fetch Category Details (for both income and expense)
		const categoryIds = [
			...incomeGroups.map((i) => i.categoryId),
			...expenseGroups.map((e) => e.categoryId),
		];
		const categories = await prisma.category.findMany({
			where: { id: { in: categoryIds } },
		});

		// 4. Format Income Items
		let totalIncome = 0;
		const incomeItems = incomeGroups
			.map((group) => {
				const category = categories.find(
					(c) => c.id === group.categoryId
				);
				const amount = group._sum.amount?.toNumber() || 0;
				totalIncome += amount;
				return {
					categoryId: group.categoryId,
					categoryName: category?.name || 'Unknown',
					amount,
					color: category?.color,
					icon: category?.icon,
				};
			})
			.sort((a, b) => b.amount - a.amount);

		// 5. Format Expense Items
		let totalExpense = 0;
		const expenseItems = expenseGroups
			.map((group) => {
				const category = categories.find(
					(c) => c.id === group.categoryId
				);
				const amount = group._sum.amount?.toNumber() || 0;
				totalExpense += amount;
				return {
					categoryId: group.categoryId,
					categoryName: category?.name || 'Unknown',
					amount,
					color: category?.color,
					icon: category?.icon,
				};
			})
			.sort((a, b) => b.amount - a.amount);

		const netIncome = totalIncome - totalExpense;
		const savingsRate =
			totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0;

		return {
			income: incomeItems,
			totalIncome,
			expenses: expenseItems,
			totalExpense,
			netIncome,
			savingsRate,
		};
	},

	async getDashboardKPIs(
		userId: string,
		startDate: Date,
		endDate: Date
	): Promise<DashboardKPIs> {
		// Calculate previous period
		const daysDiff = differenceInDays(endDate, startDate) + 1;
		const prevEndDate = subDays(startDate, 1);
		const prevStartDate = subDays(prevEndDate, daysDiff - 1);

		// Helper to get metrics for a specific range
		const getMetrics = async (start: Date, end: Date) => {
			const [income, expense] = await Promise.all([
				prisma.income.aggregate({
					where: { userId, date: { gte: start, lte: end } },
					_sum: { amount: true },
				}),
				prisma.expense.aggregate({
					where: { userId, date: { gte: start, lte: end } },
					_sum: { amount: true },
				}),
			]);

			const incomeVal = income._sum.amount?.toNumber() || 0;
			const expenseVal = expense._sum.amount?.toNumber() || 0;
			const netVal = incomeVal - expenseVal;
			const savingsRate = incomeVal > 0 ? (netVal / incomeVal) * 100 : 0;

			return {
				income: incomeVal,
				expense: expenseVal,
				net: netVal,
				savingsRate,
			};
		};

		const current = await getMetrics(startDate, endDate);
		const previous = await getMetrics(prevStartDate, prevEndDate);

		// Helper to calculate change and sparkline
		const calcMetric = (
			curr: number,
			prev: number
		): { change: number; trend: 'up' | 'down' | 'neutral' } => {
			const change =
				prev !== 0 ? ((curr - prev) / Math.abs(prev)) * 100 : 0;
			const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
			return { change, trend };
		};

		// 6-period History for Sparklines (monthly granularity roughly inferred from range)
		// For simplicity, we'll just pull last 6 months equivalent segments relative to end date
		const historyPoints = [];
		for (let i = 5; i >= 0; i--) {
			// Create 6 equally sized buckets going back
			const end = subDays(endDate, i * daysDiff);
			const start = subDays(end, daysDiff - 1);
			const metrics = await getMetrics(start, end);
			historyPoints.push(metrics);
		}

		return {
			netIncome: {
				value: current.net,
				...calcMetric(current.net, previous.net),
				history: historyPoints.map((h) => h.net),
			},
			totalIncome: {
				value: current.income,
				...calcMetric(current.income, previous.income),
				history: historyPoints.map((h) => h.income),
			},
			totalExpenses: {
				value: current.expense,
				...calcMetric(current.expense, previous.expense),
				history: historyPoints.map((h) => h.expense),
			},
			savingsRate: {
				value: current.savingsRate,
				change: current.savingsRate - previous.savingsRate, // Absolute point change for %
				trend:
					current.savingsRate > previous.savingsRate ? 'up' : 'down',
				history: historyPoints.map((h) => h.savingsRate),
			},
		};
	},
};
