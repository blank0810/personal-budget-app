import { InvoiceStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import Papa from 'papaparse';
import { describe, expect, it } from 'vitest';

import { ExportRow, invoicesToCsv } from './invoice-csv';

const EXPECTED_HEADERS = [
	'Invoice Number',
	'Status',
	'Company',
	'Contact',
	'Issue Date',
	'Due Date',
	'Paid Date',
	'Currency',
	'Subtotal',
	'Tax Rate',
	'Tax Amount',
	'Total',
];

function makeRow(overrides: Partial<ExportRow> = {}): ExportRow {
	return {
		invoiceNumber: 'INV-0001',
		status: InvoiceStatus.SENT,
		companyName: 'Acme Co',
		clientName: 'Demo Contact',
		issueDate: new Date(2026, 7, 1),
		dueDate: new Date(2026, 7, 31),
		paidAt: null,
		currency: 'USD',
		subtotal: new Decimal('1234.5'),
		taxRate: new Decimal('10'),
		taxAmount: new Decimal('123.45'),
		totalAmount: new Decimal('1357.95'),
		...overrides,
	};
}

function parseCsv(csv: string): Record<string, string>[] {
	const result = Papa.parse<Record<string, string>>(csv, {
		header: true,
		skipEmptyLines: true,
	});

	return result.data;
}

describe('invoicesToCsv', () => {
	it('writes the exact headers in the required order', () => {
		const csv = invoicesToCsv([makeRow()]);
		const parsed = Papa.parse<string[]>(csv);

		expect(parsed.data[0]).toEqual(EXPECTED_HEADERS);
	});

	it('keeps unpaid dates and null tax rates empty while preserving zero tax', () => {
		const csv = invoicesToCsv([
			makeRow({ taxRate: null }),
			makeRow({
				invoiceNumber: 'INV-0002',
				taxRate: new Decimal('0'),
			}),
		]);
		const rows = parseCsv(csv);

		expect(rows[0]['Paid Date']).toBe('');
		expect(rows[0]['Tax Rate']).toBe('');
		expect(rows[1]['Tax Rate']).toBe('0.00');
	});

	it('round-trips commas, double quotes, and newlines through papaparse', () => {
		const companyName = 'Acme, "International"\nHoldings';
		const csv = invoicesToCsv([makeRow({ companyName })]);

		expect(parseCsv(csv)[0].Company).toBe(companyName);
	});

	it('formats every money column to exactly two decimal places', () => {
		const csv = invoicesToCsv([
			makeRow({
				subtotal: new Decimal('1234.5'),
				taxAmount: new Decimal('0'),
				totalAmount: new Decimal('1234.5'),
			}),
		]);
		const row = parseCsv(csv)[0];

		expect(row.Subtotal).toBe('1234.50');
		expect(row['Tax Amount']).toBe('0.00');
		expect(row.Total).toBe('1234.50');
	});

	it('does not append a totals row', () => {
		const rows = parseCsv(invoicesToCsv([makeRow()]));

		expect(rows).toHaveLength(1);
		expect(rows[0]['Invoice Number']).toBe('INV-0001');
	});
});

describe('invoicesToCsv timezone safety', () => {
	// Calendar dates are stored as UTC midnight. Rendering them in a zone behind
	// UTC must not shift them to the previous day.
	it('renders dates in UTC regardless of the server zone', () => {
		const original = process.env.TZ;
		process.env.TZ = 'America/Los_Angeles';
		try {
			const csv = invoicesToCsv([
				makeRow({
					issueDate: new Date('2026-07-31T00:00:00.000Z'),
					dueDate: new Date('2026-08-30T00:00:00.000Z'),
					paidAt: new Date('2026-08-15T00:00:00.000Z'),
				}),
			]);
			expect(csv).toContain('2026-07-31');
			expect(csv).toContain('2026-08-30');
			expect(csv).toContain('2026-08-15');
			expect(csv).not.toContain('2026-07-30');
		} finally {
			process.env.TZ = original;
		}
	});
});

describe('invoicesToCsv spreadsheet formula safety', () => {
	it('neutralizes text cells that would parse as formulas', () => {
		const csv = invoicesToCsv([
			makeRow({ companyName: '+Post', clientName: '=SUM(A1:A9)' }),
		]);
		expect(csv).toContain("'+Post");
		expect(csv).toContain("'=SUM(A1:A9)");
	});

	it('leaves ordinary text untouched', () => {
		const csv = invoicesToCsv([
			makeRow({ companyName: 'Acme Corporation', clientName: 'Jane Dela Cruz' }),
		]);
		expect(csv).toContain('Acme Corporation');
		expect(csv).not.toContain("'Acme");
	});

	// Money must not be escaped: a negative amount starts with '-' and escaping
	// it would turn the cell into text and break every downstream sum.
	it('never escapes money columns', () => {
		const csv = invoicesToCsv([makeRow({})]);
		expect(csv).not.toMatch(/'-?\d+\.\d{2}/);
	});
});
