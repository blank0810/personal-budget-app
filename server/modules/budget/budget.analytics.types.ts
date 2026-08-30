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
