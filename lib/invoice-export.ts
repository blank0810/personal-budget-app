import { strToU8, zipSync } from 'fflate';

export type InvoiceExportPayment = 'ALL' | 'PAID' | 'UNPAID';

interface InvoiceExportFilenameInput {
	payment: InvoiceExportPayment;
	from: Date;
	to: Date;
}

export interface InvoicePdfArchiveEntry {
	invoiceNumber: string;
	pdf: Uint8Array;
}

function isoDate(value: Date): string {
	return value.toISOString().slice(0, 10);
}

export function invoiceExportFilename(
	input: InvoiceExportFilenameInput,
	extension: 'csv' | 'zip'
): string {
	const basename = [
		'invoices',
		input.payment.toLowerCase(),
		isoDate(input.from),
		isoDate(input.to),
	].join('_');

	return `${basename}.${extension}`;
}

export function assembleInvoiceExportZip(
	pdfs: InvoicePdfArchiveEntry[],
	csv: string
): Uint8Array {
	const files: Record<string, Uint8Array> = {};

	for (const { invoiceNumber, pdf } of pdfs) {
		files[`${invoiceNumber}.pdf`] = pdf;
	}
	files['invoices.csv'] = strToU8(csv);

	// PDF streams are already compressed, so STORE avoids wasting task CPU.
	return zipSync(files, { level: 0 });
}
