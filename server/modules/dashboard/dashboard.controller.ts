'use server';

import { getAuthenticatedUser } from '@/server/lib/auth-guard';
import { BudgetService } from '@/server/modules/budget/budget.service';
import { CategoryService } from '@/server/modules/category/category.service';
import { TransactionService } from '@/server/modules/transaction/transaction.service';
import { UserService } from '@/server/modules/user/user.service';
import { buildDashboardOverview } from './dashboard.presenter';
import { DashboardService } from './dashboard.service';
import type { DashboardOverview } from './dashboard.types';

type DashboardOverviewResult =
	| { success: true; data: DashboardOverview }
	| { error: string };

export async function getDashboardOverviewAction(): Promise<DashboardOverviewResult> {
	try {
		const userId = await getAuthenticatedUser();
		const now = new Date();
		const [
			dashboard,
			health,
			trend,
			budgets,
			transactions,
			currency,
			incomeCategories,
			expenseCategories,
		] = await Promise.all([
			DashboardService.getDashboardData(userId),
			DashboardService.getFinancialHealthScore(userId),
			DashboardService.getIncomeExpenseTrend(userId),
			BudgetService.getBudgets(userId, { month: now }),
			TransactionService.getUnifiedTransactions(userId, {
				page: 1,
				pageSize: 8,
				sortBy: 'date',
				sortOrder: 'desc',
			}),
			UserService.getCurrency(userId),
			CategoryService.getCategories(userId, 'INCOME'),
			CategoryService.getCategories(userId, 'EXPENSE'),
		]);

		const data = buildDashboardOverview(
			{
				currency,
				dashboard: {
					accounts: dashboard.accounts.map((account) => ({
						id: account.id,
						name: account.name,
						type: account.type,
						balance: Number(account.balance),
						isLiability: account.isLiability,
						isArchived: account.isArchived,
					})),
					netWorth: dashboard.netWorth,
					assets: dashboard.assets,
					liabilities: dashboard.liabilities,
					savingsRate: dashboard.savingsRate,
					runwayMonths: dashboard.runwayMonths,
					creditUtilization: dashboard.creditUtilization,
					totalCreditUsed: dashboard.totalCreditUsed,
					totalCreditLimit: dashboard.totalCreditLimit,
					totalDebt: dashboard.totalDebt,
					debtPaydown: dashboard.debtPaydown,
					debtToAssetRatio: dashboard.debtToAssetRatio,
					liquidAssets: dashboard.liquidAssets,
					ytdIncome: dashboard.ytdIncome,
					ytdExpense: dashboard.ytdExpense,
					income: dashboard.income,
					expense: dashboard.expense,
				},
				health: {
					overallScore: health.overallScore,
					overallLabel: health.overallLabel,
					pillars: health.pillars.map((pillar) => ({
						name: pillar.name,
						score: pillar.score,
						grade: pillar.grade,
						weight: pillar.weight,
						details: pillar.details,
						recommendation: pillar.recommendation,
					})),
				},
				trend: trend.map((point) => ({
					month: point.month,
					income: point.income,
					expense: point.expense,
				})),
				budgets: budgets.map((budget) => ({
					id: budget.id,
					name: budget.name,
					categoryId: budget.categoryId,
					categoryName: budget.category.name,
					amount: Number(budget.amount),
					spent: budget.spent,
					percentage: budget.percentage,
				})),
				incomeCategories: incomeCategories.map((category) => ({
					id: category.id,
					name: category.name,
				})),
				expenseCategories: expenseCategories.map((category) => ({
					id: category.id,
					name: category.name,
				})),
				transactions: transactions.data,
			},
			now
		);

		return { success: true, data };
	} catch (error) {
		console.error('Failed to load dashboard:', error);
		return { error: 'Failed to load dashboard' };
	}
}
