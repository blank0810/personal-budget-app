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

/**
 * Spreadsheets treat a leading =, +, -, @, tab or CR as the start of a formula.
 * That is a data-integrity problem here rather than a security one: every value
 * in this file was typed by the person downloading it, so there is no injection
 * path. But a legitimate company name like "+Post" would render as #NAME? in the
 * accountant's spreadsheet, so text cells get a leading apostrophe that Excel
 * consumes on display.
 *
 * Applied only to text columns. Money columns must never be escaped — a future
 * negative amount starts with "-" and would become text, silently breaking sums.
 */
function csvSafeText(value: string): string {
	return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
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
			csvSafeText(row.invoiceNumber),
			row.status,
			csvSafeText(row.companyName ?? ''),
			csvSafeText(row.clientName ?? ''),
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
