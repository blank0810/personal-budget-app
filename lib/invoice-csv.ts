import type { InvoiceStatus } from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';
import Papa from 'papaparse';

/**
 * Invoice dates are calendar dates stored as UTC midnight, so they must be
 * rendered in UTC. date-fns `format` uses the server's local zone, which would
 * shift every date a day earlier anywhere west of UTC.
 */
function isoDate(value: Date): string {
	return value.toISOString().slice(0, 10);
}

export interface ExportRow {
	invoiceNumber: string;
	status: InvoiceStatus;
	companyName: string | null;
	clientName: string | null;
	issueDate: Date;
	dueDate: Date;
	paidAt: Date | null;
	currency: string;
	subtotal: Decimal;
	taxRate: Decimal | null;
	taxAmount: Decimal;
	totalAmount: Decimal;
}

const CSV_HEADERS = [
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

export function invoicesToCsv(rows: ExportRow[]): string {
	return Papa.unparse({
		fields: CSV_HEADERS,
		data: rows.map((row) => [
			row.invoiceNumber,
			row.status,
			row.companyName ?? '',
			row.clientName ?? '',
			isoDate(row.issueDate),
			isoDate(row.dueDate),
			row.paidAt ? isoDate(row.paidAt) : '',
			row.currency,
			row.subtotal.toNumber().toFixed(2),
			row.taxRate === null ? '' : row.taxRate.toNumber().toFixed(2),
			row.taxAmount.toNumber().toFixed(2),
			row.totalAmount.toNumber().toFixed(2),
		]),
	});
}
