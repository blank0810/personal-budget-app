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
