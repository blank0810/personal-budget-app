import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import {
	assembleInvoiceExportZip,
	invoiceExportFilename,
} from './invoice-export';

describe('assembleInvoiceExportZip', () => {
	it('stores PDF and CSV bytes without changing their contents', () => {
		const firstPdf = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x01]);
		const secondPdf = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x02]);
		const csv = 'Invoice Number,Status\r\nINV-0001,PAID';

		const archive = assembleInvoiceExportZip(
			[
				{ invoiceNumber: 'INV-0001', pdf: firstPdf },
				{ invoiceNumber: 'INV-0002', pdf: secondPdf },
			],
			csv
		);
		const files = unzipSync(archive);

		expect(Object.keys(files).sort()).toEqual([
			'INV-0001.pdf',
			'INV-0002.pdf',
			'invoices.csv',
		]);
		expect(files['INV-0001.pdf']).toEqual(firstPdf);
		expect(files['INV-0002.pdf']).toEqual(secondPdf);
		expect(strFromU8(files['invoices.csv'])).toBe(csv);
	});
});

describe('invoiceExportFilename', () => {
	const from = new Date('2026-05-01T00:00:00.000Z');
	const to = new Date('2026-07-31T00:00:00.000Z');

	it.each([
		['ALL', 'invoices_all_2026-05-01_2026-07-31.zip'],
		['PAID', 'invoices_paid_2026-05-01_2026-07-31.zip'],
		['UNPAID', 'invoices_unpaid_2026-05-01_2026-07-31.zip'],
	] as const)('uses the phase-one convention for %s', (payment, expected) => {
		expect(invoiceExportFilename({ payment, from, to }, 'zip')).toBe(expected);
	});

	it('keeps the existing CSV filename convention', () => {
		expect(
			invoiceExportFilename({ payment: 'ALL', from, to }, 'csv')
		).toBe('invoices_all_2026-05-01_2026-07-31.csv');
	});
});
