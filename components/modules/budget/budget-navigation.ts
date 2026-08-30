import {
	getUtcMonthKey,
	normalizeBudgetMonth,
} from '@/server/modules/budget/budget.month';

export function getBudgetMonthHref(month: Date): string {
	return `/budgets?month=${getUtcMonthKey(month)}`;
}

export function getBudgetYearHref(month: Date, year: number): string {
	const selectedMonth = normalizeBudgetMonth(month);
	return getBudgetMonthHref(
		new Date(
			Date.UTC(year, selectedMonth.getUTCMonth(), 1, 0, 0, 0, 0)
		)
	);
}
