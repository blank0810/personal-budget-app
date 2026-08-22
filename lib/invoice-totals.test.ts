import { describe, expect, it } from 'vitest';
import {
	computeInvoiceTotals,
	fromCents,
	lineAmount,
	normalizeTaxRate,
	toCents,
} from './invoice-totals';

describe('invoice totals', () => {
	it('derives the total from the rounded tax in the reported regression', () => {
		const totals = computeInvoiceTotals([{ amount: 62 }], 8.25);

		expect(totals).toEqual({
			subtotal: 62,
			taxAmount: 5.12,
			totalAmount: 67.12,
		});
		expect(totals.totalAmount).not.toBe(67.11);
		expect(totals.subtotal + totals.taxAmount).toBe(totals.totalAmount);
	});

	it.each([100.55, 179.35, 257.15, 334.95, 413.45])(
		'keeps a 10 percent total consistent for a subtotal of %s',
		(subtotal) => {
			const totals = computeInvoiceTotals([{ amount: subtotal }], 10);

			expect(totals.subtotal + totals.taxAmount).toBe(
				totals.totalAmount
			);
		}
	);

	it('rounds line amounts without exposing floating-point products', () => {
		expect(lineAmount(3, 0.1)).toBe(0.3);
		expect(lineAmount(1.1, 3)).toBe(3.3);
	});

	it('sums already-rounded line amounts into the subtotal', () => {
		const lineAmounts = [
			lineAmount(3, 0.1),
			lineAmount(1.1, 3),
			lineAmount(2, 29.2),
		];
		const totals = computeInvoiceTotals(
			lineAmounts.map((amount) => ({ amount })),
			0
		);

		expect(lineAmounts).toEqual([0.3, 3.3, 58.4]);
		expect(totals.subtotal).toBe(62);
		expect(
			lineAmounts.reduce((sum, amount) => sum + toCents(amount), 0)
		).toBe(toCents(totals.subtotal));
	});

	it('rounds an exact half-cent tax tie half-up', () => {
		expect(computeInvoiceTotals([{ amount: 0.1 }], 5)).toEqual({
			subtotal: 0.1,
			taxAmount: 0.01,
			totalAmount: 0.11,
		});
		expect(toCents(1.005)).toBe(101);
		expect(toCents(-1.005)).toBe(-101);
	});

	it('normalizes the tax rate before computing tax', () => {
		expect(normalizeTaxRate(8.333)).toBe(8.33);
		expect(computeInvoiceTotals([{ amount: 100 }], 8.333).taxAmount).toBe(
			computeInvoiceTotals([{ amount: 100 }], 8.33).taxAmount
		);
	});

	it.each([undefined, 0])(
		'keeps total equal to subtotal when the tax rate is %s',
		(taxRate) => {
			const totals = computeInvoiceTotals(
				[{ amount: 123.45 }],
				taxRate ?? 0
			);

			expect(totals.taxAmount).toBe(0);
			expect(totals.totalAmount).toBe(totals.subtotal);
		}
	);

	it('keeps every subtotal and tax total consistent in integer cents', () => {
		const taxRates = [5, 7.5, 8.25, 10, 12];

		for (let subtotalCents = 1; subtotalCents <= 50000; subtotalCents += 1) {
			for (const taxRate of taxRates) {
				const totals = computeInvoiceTotals(
					[{ amount: fromCents(subtotalCents) }],
					taxRate
				);

				expect(toCents(totals.subtotal) + toCents(totals.taxAmount)).toBe(
					toCents(totals.totalAmount)
				);
			}
		}
	});
});
