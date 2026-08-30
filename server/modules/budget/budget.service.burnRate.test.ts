import { describe, expect, it } from 'vitest';
import { computeBurnMetrics } from './budget.burn';

describe('computeBurnMetrics', () => {
	const monthStart = new Date(2026, 0, 1);
	const monthEnd = new Date(2026, 0, 31);

	it('clamps daysElapsed to the month length for past months', () => {
		const m = computeBurnMetrics({
			monthStart,
			monthEnd,
			totalSpent: 24000,
			budgetLimit: 8000,
			today: new Date(2026, 7, 30),
		});

		expect(m.daysElapsed).toBe(31);
		expect(m.daysRemaining).toBe(0);
		// 24000/31 = 774.19 vs allowed 8000/31 = 258.06
		expect(m.burnStatus).toBe('overpace');
	});

	it('reports a completed month at full elapsed, not partial', () => {
		const m = computeBurnMetrics({
			monthStart,
			monthEnd,
			totalSpent: 4000,
			budgetLimit: 8000,
			today: new Date(2026, 7, 30),
		});

		expect(m.daysElapsed).toBe(31);
		expect(m.burnStatus).toBe('ontrack');
	});

	it('keeps a future month with no spend at insufficient data', () => {
		const m = computeBurnMetrics({
			monthStart: new Date(2026, 9, 1),
			monthEnd: new Date(2026, 9, 31),
			totalSpent: 0,
			budgetLimit: 8000,
			today: new Date(2026, 7, 30),
		});

		expect(m.daysElapsed).toBe(1);
		expect(m.burnStatus).toBe('insufficient_data');
	});

	it('reports an actual overrun during the first week', () => {
		const m = computeBurnMetrics({
			monthStart: new Date(2026, 7, 1),
			monthEnd: new Date(2026, 7, 31),
			totalSpent: 12000,
			budgetLimit: 8000,
			today: new Date(2026, 7, 4),
		});

		expect(m.burnStatus).toBe('overpace');
	});

	it('still suppresses pace extrapolation early when the limit is intact', () => {
		const m = computeBurnMetrics({
			monthStart: new Date(2026, 7, 1),
			monthEnd: new Date(2026, 7, 31),
			totalSpent: 1600,
			budgetLimit: 8000,
			today: new Date(2026, 7, 4),
		});

		expect(m.burnStatus).toBe('insufficient_data');
	});

	it('gives a verdict once past day 7', () => {
		const m = computeBurnMetrics({
			monthStart: new Date(2026, 7, 1),
			monthEnd: new Date(2026, 7, 31),
			totalSpent: 6000,
			budgetLimit: 8000,
			today: new Date(2026, 7, 10),
		});

		expect(m.daysElapsed).toBe(10);
		expect(m.burnStatus).toBe('overpace');
	});

	it('reads month length with local getters, matching how callers build the dates', () => {
		// Regression: monthStart/monthEnd are built with local setters in
		// budget.service.ts. Reading monthEnd as UTC collapses daysInMonth to 1
		// under any negative-offset timezone, which zeroes daysRemaining and
		// pins expectedPercentage at 100.
		const localMonthEnd = new Date(2026, 0, 1);
		localMonthEnd.setMonth(localMonthEnd.getMonth() + 1);
		localMonthEnd.setDate(0);
		localMonthEnd.setHours(23, 59, 59, 999);

		const m = computeBurnMetrics({
			monthStart: new Date(2026, 0, 1),
			monthEnd: localMonthEnd,
			totalSpent: 0,
			budgetLimit: 8000,
			today: new Date(2026, 0, 15),
		});

		expect(m.daysInMonth).toBe(31);
		expect(m.daysRemaining).toBe(16);
		expect(m.expectedPercentage).toBeCloseTo((15 / 31) * 100, 5);
	});
});
