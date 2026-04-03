export interface NetWorthData {
	netWorth: number;
	assets: number;
	liabilities: number;
}

export interface CashFlowData {
	income: number;
	expense: number;
}

export interface FinancialHealthMetrics {
	savingsRate: number;
	debtToAssetRatio: number;
	debtPaydown: number;
	debtPaydownPercent: number;
	monthsToPayoff: number;
	runwayMonths: number | null;
	creditUtilization: number;
	totalCreditUsed: number;
	totalCreditLimit: number;
	availableCredit: number;
	totalDebt: number;
	income: number;
	expense: number;
	ytdIncome: number;
	ytdExpense: number;
	liquidAssets: number;
	avgMonthlyExpense: number;
}

export interface HealthPillar {
	name: string;
	score: number;
	grade: string;
	weight: number;
	details: string;
	recommendation: string;
}

export interface FinancialHealthScore {
	overallScore: number;
	overallLabel: string;
	pillars: HealthPillar[];
}

export interface IncomeExpenseTrendItem {
	month: string;
	income: number;
	expense: number;
}
