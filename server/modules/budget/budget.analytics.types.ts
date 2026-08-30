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
