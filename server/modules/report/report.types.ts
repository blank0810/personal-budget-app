import { z } from 'zod';

export const getReportSchema = z.object({
	startDate: z.date(),
	endDate: z.date(),
});

export type GetReportInput = z.infer<typeof getReportSchema>;

export type CategoryBreakdown = {
	categoryId: string;
	categoryName: string;
	amount: number;
	percentage: number;
	color?: string | null;
	icon?: string | null;
};

export type MonthlySummary = {
	month: string; // "YYYY-MM"
	income: number;
	expense: number;
	savings: number;
};

export type FinancialStatementItem = {
	categoryId: string;
	categoryName: string;
	amount: number;
	color?: string | null;
	icon?: string | null;
};

export type FinancialStatement = {
	income: FinancialStatementItem[];
	totalIncome: number;
	expenses: FinancialStatementItem[];
	totalExpense: number;
	netIncome: number;
	savingsRate: number;
};

export type KPIMetric = {
	value: number;
	change: number; // Percentage change vs previous period
	trend: 'up' | 'down' | 'neutral';
	history: number[]; // Array of values for sparkline (e.g., last 6 periods)
};

export type DashboardKPIs = {
	netIncome: KPIMetric;
	totalIncome: KPIMetric;
	totalExpenses: KPIMetric;
	savingsRate: KPIMetric;
};

export type NetWorthHistoryPoint = {
	date: string;
	assets: number;
	liabilities: number;
	netWorth: number;
};

export type CashFlowWaterfallItem = {
	name: string;
	value: number;
	type: 'income' | 'expense' | 'net';
	color?: string;
};

export type CashFlowWaterfall = {
	items: CashFlowWaterfallItem[];
	totalIncome: number;
	totalExpenses: number;
	netResult: number;
};

export type TransactionStatementItem = {
	id: string;
	date: Date;
	description: string | null;
	categoryId: string;
	categoryName: string;
	type: 'INCOME' | 'EXPENSE';
	amount: number;
	budgetStatus: 'budgeted' | 'unbudgeted' | null;
	budgetName: string | null;
	runningBalance: number;
};

export type TransactionStatement = {
	transactions: TransactionStatementItem[];
	openingBalance: number;
	closingBalance: number;
	totalIncome: number;
	totalExpenses: number;
	netChange: number;
	periodStart: Date;
	periodEnd: Date;
};

// Payload for print page
export type StatementPrintPayload = {
	statement: TransactionStatement;
	accountName: string;
	userName: string;
};

// Monthly Digest types for PDF report generation
export type DigestHealthScore = {
	score: number;
	label: string;
	roast: string;
	topRecommendation: string;
	focusPillar: string;
};

export type DigestIncomeExpense = {
	totalIncome: number;
	totalExpense: number;
	netResult: number;
	savingsRate: number;
};

export type DigestTopCategory = {
	name: string;
	amount: number;
	percentage: number;
};

export type DigestBudgetPerformance = {
	totalBudgeted: number;
	totalSpent: number;
	overUnder: number;
};

export type DigestLiabilityAccount = {
	name: string;
	balance: number;
	creditLimit?: number;
	utilization?: number;
};

export type DigestLiabilities = {
	accounts: DigestLiabilityAccount[];
	totalDebt: number;
	monthlyPaydown: number;
};

export type DigestFundAccount = {
	name: string;
	balance: number;
	target?: number;
	progress?: number;
};

export type DigestFunds = {
	accounts: DigestFundAccount[];
	emergencyFundMonths?: number;
};

export type DigestNetWorth = {
	current: number;
	previousMonth: number;
	change: number;
	changePercent: number;
};

export type MonthlyDigest = {
	userName: string;
	userEmail: string;
	currency: string; // e.g. "USD", "PHP"
	month: string; // "January 2026"
	sections: {
		healthScore: DigestHealthScore;
		incomeExpense?: DigestIncomeExpense;
		topCategories?: DigestTopCategory[];
		budgetPerformance?: DigestBudgetPerformance;
		liabilities?: DigestLiabilities;
		funds?: DigestFunds;
		netWorth: DigestNetWorth;
	};
};
