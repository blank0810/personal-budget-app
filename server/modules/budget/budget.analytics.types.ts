export interface BudgetCoverageEnvelope {
	id: string;
	categoryId: string;
	month: Date;
}

export interface BudgetCoverage {
	budgetId: string;
	linkedSpend: number;
	unlinkedSameCategorySpend: number;
	unlinkedExpenseCount: number;
	coverageRatio: number | null;
}

export interface CategorySpendComparison {
	categoryId: string;
	categoryName: string;
	currentTotal: number;
	previousTotal: number;
	amountDelta: number;
	absoluteDelta: number;
	percentDelta: number | null;
}

export interface InferredEnvelopeSuggestion {
	categoryId: string;
	categoryName: string;
	recentAverage: number;
	monthsObserved: number;
}

export interface InferredEnvelopeOffer {
	eligible: boolean;
	loggingDays: number;
	minimumLoggingDays: number;
	suggestions: InferredEnvelopeSuggestion[];
}

export type BudgetAnalyticsDataState = 'ready' | 'insufficient_data';

export interface RevealedBudgetInsight {
	categoryId: string;
	categoryName: string;
	state: BudgetAnalyticsDataState;
	monthsObserved: number;
	trailingMonths: number;
	revealedBudget: number | null;
}

export interface CategoryVolatilityInsight {
	categoryId: string;
	categoryName: string;
	state: BudgetAnalyticsDataState;
	monthsObserved: number;
	trailingMonths: number;
	averageMonthlySpend: number | null;
	standardDeviation: number | null;
	coefficientOfVariation: number | null;
}

export interface FixedVsDiscretionaryInsight {
	categoryId: string;
	categoryName: string;
	state: BudgetAnalyticsDataState;
	monthsObserved: number;
	trailingMonths: number;
	coefficientOfVariation: number | null;
	classification: 'FIXED' | 'DISCRETIONARY' | null;
}

export interface CategoryAnomalyInsight {
	categoryId: string;
	categoryName: string;
	state: BudgetAnalyticsDataState;
	monthsObserved: number;
	trailingMonths: number;
	currentMonthTotal: number;
	medianMonthlySpend: number | null;
	standardDeviation: number | null;
	threshold: number | null;
	isAnomaly: boolean | null;
}

export interface WeekOfMonthSpend {
	weekOfMonth: number;
	averageSpend: number;
}

export interface WeekOfMonthVelocityInsight {
	categoryId: string;
	categoryName: string;
	state: BudgetAnalyticsDataState;
	monthsObserved: number;
	trailingMonths: number;
	weeks: WeekOfMonthSpend[];
}

export interface BudgetBreakDayInsight {
	budgetId: string;
	budgetName: string;
	categoryId: string;
	month: Date;
	state: 'breached' | 'not_breached' | 'insufficient_data';
	expenseCount: number;
	breakDay: number | null;
}

export interface AdvancedBudgetAnalytics {
	month: Date;
	trailingMonths: number;
	revealedBudgets: RevealedBudgetInsight[];
	volatility: CategoryVolatilityInsight[];
	weekOfMonthVelocity: WeekOfMonthVelocityInsight[];
	breakDays: BudgetBreakDayInsight[];
	fixedVsDiscretionary: FixedVsDiscretionaryInsight[];
	anomalies: CategoryAnomalyInsight[];
}
