import { describe, expect, it } from 'vitest';
import { computeBurnMetrics } from './budget.burn';

describe('computeBurnMetrics', () => {
	const monthStart = new Date(Date.UTC(2026, 0, 1));
	const monthEnd = new Date(Date.UTC(2026, 0, 31));

	it('clamps daysElapsed to the month length for past months', () => {
		const m = computeBurnMetrics({
			monthStart,
			monthEnd,
			totalSpent: 24000,
			budgetLimit: 8000,
			today: new Date(Date.UTC(2026, 7, 30)),
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
			today: new Date(Date.UTC(2026, 7, 30)),
		});

		expect(m.daysElapsed).toBe(31);
		expect(m.burnStatus).toBe('ontrack');
	});

	it('clamps to 1 day for a future month and suppresses the verdict', () => {
		const m = computeBurnMetrics({
			monthStart: new Date(Date.UTC(2026, 9, 1)),
			monthEnd: new Date(Date.UTC(2026, 9, 31)),
			totalSpent: 500,
			budgetLimit: 8000,
			today: new Date(Date.UTC(2026, 7, 30)),
		});

		expect(m.daysElapsed).toBe(1);
		expect(m.burnStatus).toBe('insufficient_data');
	});

	it('suppresses the verdict in the first week of the current month', () => {
		const m = computeBurnMetrics({
			monthStart: new Date(Date.UTC(2026, 7, 1)),
			monthEnd: new Date(Date.UTC(2026, 7, 31)),
			totalSpent: 6000,
			budgetLimit: 8000,
			today: new Date(Date.UTC(2026, 7, 2)),
		});

		// A day-1 rent posting must not produce a confident "overpace"
		expect(m.burnStatus).toBe('insufficient_data');
	});

	it('gives a verdict once past day 7', () => {
		const m = computeBurnMetrics({
			monthStart: new Date(Date.UTC(2026, 7, 1)),
			monthEnd: new Date(Date.UTC(2026, 7, 31)),
			totalSpent: 6000,
			budgetLimit: 8000,
			today: new Date(Date.UTC(2026, 7, 10)),
		});

		expect(m.daysElapsed).toBe(10);
		expect(m.burnStatus).toBe('overpace');
	});
});
