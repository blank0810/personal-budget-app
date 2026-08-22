import { describe, expect, it } from 'vitest';
import {
	fromCents,
	percentageOf,
	roundMoney,
	toCents,
} from './money';

describe('money', () => {
	it.each([
		{ amount: 100.55, percent: 10, expected: 10.06 },
		{ amount: 62, percent: 8.25, expected: 5.12 },
		{ amount: 0, percent: 10, expected: 0 },
	])(
		'calculates $amount at $percent percent as $expected',
		({ amount, percent, expected }) => {
			expect(percentageOf(amount, percent)).toBe(expected);
		}
	);

	it('snaps money to two decimal places with half-up rounding', () => {
		expect(roundMoney(100.555)).toBe(100.56);
		expect(roundMoney(-100.555)).toBe(-100.56);
	});

	it('keeps deductions and remaining amounts stable in cents', () => {
		const rates = [10, 12.5, 15];

		for (let amountCents = 1; amountCents <= 50000; amountCents += 1) {
			const amount = fromCents(amountCents);

			for (const rate of rates) {
				const deduction = percentageOf(amount, rate);

				expect(deduction).toBe(roundMoney(deduction));
				expect(toCents(amount - deduction)).toBe(
					amountCents - toCents(deduction)
				);
			}
		}
	});
});
