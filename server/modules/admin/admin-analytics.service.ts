import prisma from '@/lib/prisma';
import { subDays, startOfMonth, subMonths } from 'date-fns';

export const AdminAnalyticsService = {
	async getPlatformStats() {
		const now = new Date();
		const sevenDaysAgo = subDays(now, 7);
		const thirtyDaysAgo = subDays(now, 30);
		const monthStart = startOfMonth(now);

		const [
			totalUsers,
			signupsThisWeek,
			signupsThisMonth,
			activeUsers7d,
			totalIncomes,
			totalExpenses,
			incomesThisMonth,
			expensesThisMonth,
			avgAccountsResult,
		] = await Promise.all([
			prisma.user.count(),
			prisma.user.count({
				where: { createdAt: { gte: sevenDaysAgo } },
			}),
			prisma.user.count({
				where: { createdAt: { gte: thirtyDaysAgo } },
			}),
			prisma.user.count({
				where: { lastLoginAt: { gte: sevenDaysAgo } },
			}),
			prisma.income.count(),
			prisma.expense.count(),
			prisma.income.count({
				where: { date: { gte: monthStart } },
			}),
			prisma.expense.count({
				where: { date: { gte: monthStart } },
			}),
			prisma.account.groupBy({
				by: ['userId'],
				_count: { id: true },
			}),
		]);

		const totalTransactions = totalIncomes + totalExpenses;
		const transactionsThisMonth = incomesThisMonth + expensesThisMonth;
		const avgAccountsPerUser =
			avgAccountsResult.length > 0
				? avgAccountsResult.reduce((s, r) => s + r._count.id, 0) /
					avgAccountsResult.length
				: 0;

		return {
			totalUsers,
			signupsThisWeek,
			signupsThisMonth,
			activeUsers7d,
			totalTransactions,
			transactionsThisMonth,
			avgAccountsPerUser: Math.round(avgAccountsPerUser * 10) / 10,
		};
	},

	async getPlatformFinancials() {
		const [totalMoneyTracked, topCategories, currencyDist] =
			await Promise.all([
				prisma.account.aggregate({
					_sum: { balance: true },
					where: { isLiability: false },
				}),
				prisma.expense.groupBy({
					by: ['categoryId'],
					_count: { id: true },
					orderBy: { _count: { id: 'desc' } },
					take: 5,
				}),
				prisma.user.groupBy({
					by: ['currency'],
					_count: { id: true },
					orderBy: { _count: { id: 'desc' } },
				}),
			]);

		// Resolve category names
		const categoryIds = topCategories.map((c) => c.categoryId);
		const categories = await prisma.category.findMany({
			where: { id: { in: categoryIds } },
			select: { id: true, name: true },
		});
		const catMap = new Map(categories.map((c) => [c.id, c.name]));

		return {
			totalMoneyTracked: Number(totalMoneyTracked._sum.balance || 0),
			topCategories: topCategories.map((c) => ({
				name: catMap.get(c.categoryId) || 'Unknown',
				count: c._count.id,
			})),
			currencyDistribution: currencyDist.map((c) => ({
				currency: c.currency,
				count: c._count.id,
			})),
		};
	},

	async getFeatureAdoption() {
		const totalUsers = await prisma.user.count();
		if (totalUsers === 0) {
			return {
				totalUsers: 0,
				budgets: 0,
				goals: 0,
				recurring: 0,
				imports: 0,
			};
		}

		const [budgetUsers, goalUsers, recurringUsers, importUsers] =
			await Promise.all([
				prisma.budget.groupBy({ by: ['userId'] }).then((r) => r.length),
				prisma.goal.groupBy({ by: ['userId'] }).then((r) => r.length),
				prisma.recurringTransaction
					.groupBy({ by: ['userId'] })
					.then((r) => r.length),
				prisma.income
					.groupBy({
						by: ['userId'],
						where: { source: 'IMPORT' },
					})
					.then((r) => r.length),
			]);

		return {
			totalUsers,
			budgets: Math.round((budgetUsers / totalUsers) * 100),
			goals: Math.round((goalUsers / totalUsers) * 100),
			recurring: Math.round((recurringUsers / totalUsers) * 100),
			imports: Math.round((importUsers / totalUsers) * 100),
		};
	},

	async getGrowthTimeline(months: number = 6) {
		const data: Array<{
			month: string;
			users: number;
			transactions: number;
		}> = [];

		for (let i = months - 1; i >= 0; i--) {
			const end = i === 0 ? new Date() : startOfMonth(subMonths(new Date(), i));
			const start = startOfMonth(subMonths(new Date(), i));

			const [users, incomes, expenses] = await Promise.all([
				prisma.user.count({
					where: { createdAt: { lte: end } },
				}),
				prisma.income.count({
					where: {
						date: { gte: start, lt: startOfMonth(subMonths(new Date(), i - 1)) },
					},
				}),
				prisma.expense.count({
					where: {
						date: { gte: start, lt: startOfMonth(subMonths(new Date(), i - 1)) },
					},
				}),
			]);

			data.push({
				month: start.toISOString().slice(0, 7),
				users,
				transactions: incomes + expenses,
			});
		}

		return data;
	},
};
