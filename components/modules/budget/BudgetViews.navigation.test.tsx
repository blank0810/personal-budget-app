import { describe, expect, it } from 'vitest';
import {
	getBudgetMonthHref,
	getBudgetYearHref,
} from './budget-navigation';

describe('budget route navigation', () => {
	it('writes the selected UTC month into the budgets URL', () => {
		expect(
			getBudgetMonthHref(
				new Date(Date.UTC(2026, 6, 1, 0, 0, 0, 0))
			)
		).toBe('/budgets?month=2026-07');
	});

	it('changes the visible UTC year while preserving the selected month', () => {
		expect(
			getBudgetYearHref(
				new Date(Date.UTC(2026, 6, 1, 0, 0, 0, 0)),
				2025
			)
		).toBe('/budgets?month=2025-07');
	});
});
