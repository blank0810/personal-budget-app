import { put } from '@vercel/blob';
import { InvoiceStatus } from '@prisma/client';
import { metadata, task } from '@trigger.dev/sdk';

import {
	assembleInvoiceExportZip,
	invoiceExportFilename,
	type InvoicePdfArchiveEntry,
} from '@/lib/invoice-export';
import { invoicesToCsv } from '@/lib/invoice-csv';
import { urlToQrDataUri } from '@/lib/qr';
import { InvoiceService } from '@/server/modules/invoice/invoice.service';
import { renderInvoicePDF } from '@/server/modules/invoice/invoice.templates';
import { exportInvoicesSchema } from '@/server/modules/invoice/invoice.types';

const MAX_INVOICES_PER_EXPORT = 300;

interface InvoiceExportPayload {
	userId: string;
	from: string;
	to: string;
	payment: 'ALL' | 'PAID' | 'UNPAID';
	includeDrafts: boolean;
	includeCancelled: boolean;
	clientId?: string;
}

export const invoiceExportTask = task({
	id: 'invoice-export',
	run: async (payload: InvoiceExportPayload) => {
		const { userId, ...serializedInput } = payload;
		const input = exportInvoicesSchema.parse(serializedInput);
		const invoices = await InvoiceService.getForZipExport(userId, input);

		if (invoices.length === 0) {
			return { invoiceCount: 0 };
		}

		if (invoices.length > MAX_INVOICES_PER_EXPORT) {
			throw new Error(
				`This export contains ${invoices.length} invoices, exceeding the ${MAX_INVOICES_PER_EXPORT}-invoice limit. Narrow the date range and try again.`
			);
		}

		const pdfs: InvoicePdfArchiveEntry[] = [];

		for (const [index, invoice] of invoices.entries()) {
			const paymentQr = await urlToQrDataUri(invoice.paymentLink);
			const isReceipt = invoice.status === InvoiceStatus.PAID;
			const pdf = await renderInvoicePDF(
				{
					id: invoice.id,
					invoiceNumber: invoice.invoiceNumber,
					status: invoice.status,
					variant: isReceipt ? 'receipt' : 'invoice',
					paymentLink: invoice.paymentLink,
					paymentQr,
					userName: invoice.user?.name ?? null,
					userEmail: invoice.user?.email ?? null,
					userPhone: invoice.user?.phoneNumber ?? null,
					businessName: invoice.user?.businessName ?? null,
					businessAddress: invoice.user?.businessAddress ?? null,
					businessTaxId: invoice.user?.businessTaxId ?? null,
					paymentInstructions:
						invoice.user?.paymentInstructions ?? null,
					companyName: invoice.companyName,
					companyAddress: invoice.companyAddress,
					companyTaxId: invoice.companyTaxId,
					companyEmail: invoice.companyEmail,
					companyPhone: invoice.companyPhone,
					clientName: invoice.clientName,
					clientEmail: invoice.clientEmail,
					clientAddress: invoice.clientAddress,
					clientPhone: invoice.clientPhone,
					issueDate: invoice.issueDate,
					dueDate: invoice.dueDate,
					subtotal: Number(invoice.subtotal),
					taxRate: invoice.taxRate ? Number(invoice.taxRate) : null,
					taxAmount: Number(invoice.taxAmount),
					totalAmount: Number(invoice.totalAmount),
					notes: invoice.notes,
					paidAt: invoice.paidAt,
					lineItems: invoice.lineItems.map((lineItem) => ({
						id: lineItem.id,
						description: lineItem.description,
						quantity: Number(lineItem.quantity),
						unitPrice: Number(lineItem.unitPrice),
						amount: Number(lineItem.amount),
						date: lineItem.date,
						sortOrder: lineItem.sortOrder,
					})),
				},
				invoice.currency
			);

			pdfs.push({ invoiceNumber: invoice.invoiceNumber, pdf });
			metadata.set('progress', {
				done: index + 1,
				total: invoices.length,
			});
		}

		const archive = assembleInvoiceExportZip(
			pdfs,
			invoicesToCsv(invoices)
		);
		const filename = invoiceExportFilename(input, 'zip');
		const blob = await put(
			`invoice-exports/${userId}/${filename}`,
			Buffer.from(archive),
			{
				access: 'public',
				contentType: 'application/zip',
				// put() defaults to addRandomSuffix:false and throws when a
				// pathname already exists, so re-exporting the same range would
				// fail on the second attempt. The suffix also keeps the public
				// URL unguessable, which matters for financial documents.
				addRandomSuffix: true,
			}
		);

		return {
			url: blob.url,
			filename,
			invoiceCount: invoices.length,
			byteLength: archive.byteLength,
		};
	},
});
