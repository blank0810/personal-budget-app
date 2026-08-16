import type { HealthPillarName } from '@/lib/financial-health-copy';

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

export type DashboardDataQuality = 'empty' | 'partial' | 'complete';
export type DashboardTone = 'positive' | 'warning' | 'negative' | 'neutral';
export type DashboardQuickActionKind =
	| 'income'
	| 'expense'
	| 'transfer'
	| 'payment';

export type DashboardAction =
	| {
			kind: 'quick-action';
			action: DashboardQuickActionKind;
			label: string;
	  }
	| {
			kind: 'link';
			href:
				| '/accounts'
				| '/budgets'
				| '/goals'
				| '/reports'
				| '/transactions';
			label: string;
	  };

export interface DashboardPillarRow {
	name: HealthPillarName;
	question: string;
	weight: number;
	score: number | null;
	grade: string | null;
	status: 'supported' | 'needs-data';
	tone: DashboardTone;
	evidence: string;
	recommendation: string | null;
	action: DashboardAction;
}

export interface DashboardOverview {
	snapshotLabel: string;
	currency: string;
	dataQuality: DashboardDataQuality;
	quickActions: {
		accounts: Array<{
			id: string;
			name: string;
			type: string;
			balance: number;
			isLiability: boolean;
		}>;
		incomeCategories: Array<{ id: string; name: string }>;
		expenseCategories: Array<{ id: string; name: string }>;
		budgets: Array<{
			id: string;
			name: string;
			categoryId: string;
			categoryName: string;
		}>;
		availability: Record<
			DashboardQuickActionKind,
			{ enabled: boolean; disabledReason: string | null }
		>;
	};
	health: {
		verdict: {
			score: number;
			label: string;
			description: string;
			tone: DashboardTone;
			focus: {
				pillarName: HealthPillarName | null;
				grade: string | null;
				recommendation: string;
				action: DashboardAction;
			};
		} | null;
		pillars: DashboardPillarRow[];
	};
	evidence: {
		netWorth: number;
		income: number;
		expense: number;
		surplus: number;
	};
	cashFlow: {
		points: Array<{
			month: string;
			income: number;
			expense: number;
			surplus: number;
		}>;
		hasActivity: boolean;
		totalIncome: number;
		totalExpense: number;
		net: number;
	};
	budgetPressure: {
		hasBudgets: boolean;
		totalBudgeted: number;
		totalSpent: number;
		utilizationPercent: number | null;
		items: Array<{
			id: string;
			name: string;
			categoryName: string;
			amount: number;
			spent: number;
			percentage: number;
		}>;
	};
	accountsDebt: {
		liquidAssets: number;
		liabilities: number;
		netWorth: number;
		creditUtilization: number | null;
	};
	recentActivity: Array<{
		id: string;
		kind: 'income' | 'expense' | 'transfer' | 'payment';
		title: string;
		context: string;
		amount: number;
		direction: 'in' | 'out' | 'neutral';
		date: string;
	}>;
}
