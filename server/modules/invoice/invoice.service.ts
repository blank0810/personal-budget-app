import prisma from '@/lib/prisma';

import {
	CreateInvoiceInput,
	UpdateInvoiceInput,
	MarkAsPaidInput,
	GetInvoicesInput,
	GenerateFromEntriesInput,
	InvoiceSummary,
} from './invoice.types';
import { UserService } from '@/server/modules/user/user.service';
import { EmailService } from '@/server/modules/email/email.service';
import { renderInvoicePDF } from './invoice.templates';
import { formatCurrency } from '@/lib/formatters';
import { InvoiceStatus } from '@prisma/client';

/**
 * Compute subtotal, tax, and total from an array of line items and a tax rate.
 */
function computeInvoiceTotals(
	lineItems: { amount: number }[],
	taxRate: number
) {
	const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
	const taxAmount = subtotal * (taxRate / 100);
	const totalAmount = subtotal + taxAmount;
	return { subtotal, taxAmount, totalAmount };
}

import type { Prisma } from '@prisma/client';

type InvoiceForEmail = Prisma.InvoiceGetPayload<{
	include: {
		lineItems: true;
		user: { select: { name: true; email: true } };
	};
}>;

/**
 * Render an invoice PDF and email it to the client.
 * Caller decides which `status` is stamped on the rendered PDF (DRAFT / SENT /
 * PAID / OVERDUE / CANCELLED) so the watermark matches what the client receives.
 */
async function emailInvoiceToClient(
	invoice: InvoiceForEmail,
	currency: string,
	options: {
		status: InvoiceStatus;
		paidAt: Date | null;
		variant: 'invoice' | 'receipt';
	}
): Promise<string> {
	if (!invoice.clientEmail) {
		throw new Error('Cannot email invoice without a client email');
	}

	const pdfBuffer = await renderInvoicePDF(
		{
			id: invoice.id,
			invoiceNumber: invoice.invoiceNumber,
			status: options.status,
			userName: invoice.user?.name ?? null,
			userEmail: invoice.user?.email ?? null,
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
			paidAt: options.paidAt,
			lineItems: invoice.lineItems.map((li) => ({
				id: li.id,
				description: li.description,
				quantity: Number(li.quantity),
				unitPrice: Number(li.unitPrice),
				amount: Number(li.amount),
				date: li.date,
				sortOrder: li.sortOrder,
			})),
		},
		currency
	);

	const totalFormatted = formatCurrency(Number(invoice.totalAmount), {
		currency,
	});

	if (options.variant === 'receipt') {
		await EmailService.sendInvoiceReceipt({
			to: invoice.clientEmail,
			invoiceNumber: invoice.invoiceNumber,
			fromName: invoice.user?.name ?? null,
			fromEmail: invoice.user?.email ?? null,
			clientName: invoice.clientName,
			totalFormatted,
			paidAt: options.paidAt ?? new Date(),
			pdfBuffer,
		});
	} else {
		await EmailService.sendInvoice({
			to: invoice.clientEmail,
			invoiceNumber: invoice.invoiceNumber,
			fromName: invoice.user?.name ?? null,
			fromEmail: invoice.user?.email ?? null,
			clientName: invoice.clientName,
			totalFormatted,
			dueDate: invoice.dueDate,
			notes: invoice.notes,
			pdfBuffer,
		});
	}

	return invoice.clientEmail;
}

/**
 * Revert linked work entries back to UNBILLED when an invoice is cancelled or deleted.
 * Also nulls out workEntryId on the line items to release the unique constraint,
 * allowing those work entries to be linked to a future invoice.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function revertLinkedEntries(tx: any, invoiceId: string) {
	const linkedLineItems = await tx.invoiceLineItem.findMany({
		where: { invoiceId, workEntryId: { not: null } },
		select: { workEntryId: true },
	});

	const workEntryIds = linkedLineItems
		.map((li: { workEntryId: string | null }) => li.workEntryId)
		.filter(Boolean);

	if (workEntryIds.length > 0) {
		await tx.workEntry.updateMany({
			where: { id: { in: workEntryIds } },
			data: { status: 'UNBILLED' },
		});

		// Release the unique constraint on workEntryId so entries can be re-invoiced
		await tx.invoiceLineItem.updateMany({
			where: { invoiceId, workEntryId: { not: null } },
			data: { workEntryId: null },
		});
	}
}

export const InvoiceService = {
	/**
	 * Get the next sequential invoice number for a user (INV-0001, INV-0002, etc.)
	 */
	async getNextInvoiceNumber(userId: string): Promise<string> {
		const lastInvoice = await prisma.invoice.findFirst({
			where: { userId },
			orderBy: { invoiceNumber: 'desc' },
			select: { invoiceNumber: true },
		});

		if (!lastInvoice) {
			return 'INV-0001';
		}

		const lastNumber = parseInt(
			lastInvoice.invoiceNumber.replace('INV-', ''),
			10
		);
		const nextNumber = (lastNumber + 1).toString().padStart(4, '0');
		return `INV-${nextNumber}`;
	},

	/**
	 * Create a new invoice with line items.
	 * Accepts an optional currency; defaults to the user's currency.
	 */
	async create(userId: string, data: CreateInvoiceInput & { currency?: string }) {
		const invoiceNumber = await this.getNextInvoiceNumber(userId);

		// Resolve currency: explicit param > user default
		let currency = data.currency;
		if (!currency) {
			currency = await UserService.getCurrency(userId);
		}

		// Compute line item amounts and totals
		const lineItems = data.lineItems.map((item, index) => ({
			description: item.description,
			quantity: item.quantity,
			unitPrice: item.unitPrice,
			amount: item.quantity * item.unitPrice,
			sortOrder: index,
		}));

		const { subtotal, taxAmount, totalAmount } = computeInvoiceTotals(
			lineItems,
			data.taxRate ?? 0
		);

		return await prisma.invoice.create({
			data: {
				invoiceNumber,
				clientName: data.clientName,
				clientEmail: data.clientEmail || null,
				clientAddress: data.clientAddress,
				clientPhone: data.clientPhone,
				currency,
				issueDate: data.issueDate,
				dueDate: data.dueDate,
				subtotal,
				taxRate: data.taxRate,
				taxAmount,
				totalAmount,
				notes: data.notes,
				userId,
				lineItems: {
					create: lineItems,
				},
			},
			include: {
				lineItems: {
					orderBy: { sortOrder: 'asc' },
				},
			},
		});
	},

	/**
	 * Create an invoice from existing work entries.
	 * Marks entries as BILLED and links them via line items.
	 * Uses the client's billing currency for the invoice.
	 */
	async createFromWorkEntries(userId: string, data: GenerateFromEntriesInput) {
		// Generate invoice number before transaction — a gap in numbering is acceptable
		const invoiceNumber = await this.getNextInvoiceNumber(userId);

		return prisma.$transaction(
			async (tx) => {
				// 1. Fetch and validate client
				const client = await tx.client.findUniqueOrThrow({
					where: { id: data.clientId, userId },
				});

				// 2. Fetch and validate all work entries
				const entries = await tx.workEntry.findMany({
					where: {
						id: { in: data.workEntryIds },
						userId,
						clientId: data.clientId,
						status: 'UNBILLED',
					},
				});

				if (entries.length !== data.workEntryIds.length) {
					throw new Error(
						'Some entries are not available for invoicing (already billed, wrong client, or not found)'
					);
				}

				// 3. Clear any stale workEntryId references from old cancelled/deleted invoices
				//    This handles data created before the cancel-fix was deployed
				await tx.invoiceLineItem.updateMany({
					where: {
						workEntryId: { in: data.workEntryIds },
						invoice: {
							status: { in: [InvoiceStatus.CANCELLED] },
						},
					},
					data: { workEntryId: null },
				});

				// 4. Build line items from entries
				const lineItems = entries.map((entry, index) => ({
					description: entry.description,
					quantity: Number(entry.quantity),
					unitPrice: Number(entry.unitPrice),
					amount: Number(entry.amount),
					date: entry.date,
					sortOrder: index,
				}));

				const { subtotal, taxAmount, totalAmount } =
					computeInvoiceTotals(lineItems, data.taxRate ?? 0);

				// 5. Create invoice with line items, linking workEntryId on each
				//    Use the client's billing currency
				const invoice = await tx.invoice.create({
					data: {
						invoiceNumber,
						userId,
						clientId: data.clientId,
						clientName: client.name,
						clientEmail: client.email,
						clientAddress: client.address,
						clientPhone: client.phone,
						currency: client.currency,
						issueDate: data.issueDate,
						dueDate: data.dueDate,
						taxRate: data.taxRate ?? null,
						notes: data.notes || null,
						subtotal,
						taxAmount,
						totalAmount,
						lineItems: {
							create: lineItems.map((item, idx) => ({
								...item,
								workEntryId: entries[idx].id,
							})),
						},
					},
					include: {
						lineItems: { orderBy: { sortOrder: 'asc' } },
					},
				});

				// 6. Flip entries to BILLED and set audit trail
				await tx.workEntry.updateMany({
					where: { id: { in: data.workEntryIds } },
					data: {
						status: 'BILLED',
						lastInvoiceId: invoice.id,
						lastInvoiceNumber: invoice.invoiceNumber,
					},
				});

				return invoice;
			},
			{ timeout: 30000 }
		);
	},

	/**
	 * Update a DRAFT invoice — deletes old line items and recreates them
	 */
	async update(userId: string, data: UpdateInvoiceInput) {
		const { id, ...updateData } = data;

		return await prisma.$transaction(async (tx) => {
			const invoice = await tx.invoice.findUniqueOrThrow({
				where: { id, userId },
			});

			if (invoice.status !== InvoiceStatus.DRAFT) {
				throw new Error('Only DRAFT invoices can be edited');
			}

			// Compute new line items and totals if line items are provided
			let lineItemsData:
				| {
						description: string;
						quantity: number;
						unitPrice: number;
						amount: number;
						sortOrder: number;
				  }[]
				| undefined;
			let subtotal: number | undefined;
			let taxAmount: number | undefined;
			let totalAmount: number | undefined;

			if (updateData.lineItems) {
				lineItemsData = updateData.lineItems.map((item, index) => ({
					description: item.description,
					quantity: item.quantity,
					unitPrice: item.unitPrice,
					amount: item.quantity * item.unitPrice,
					sortOrder: index,
				}));

				const taxRate =
					updateData.taxRate ?? invoice.taxRate?.toNumber() ?? 0;
				const totals = computeInvoiceTotals(lineItemsData, taxRate);
				subtotal = totals.subtotal;
				taxAmount = totals.taxAmount;
				totalAmount = totals.totalAmount;

				// --- Revert removed work entries to UNBILLED ---
				// 1. Get old line items with linked work entries
				const oldLinkedItems = await tx.invoiceLineItem.findMany({
					where: { invoiceId: id, workEntryId: { not: null } },
					select: { workEntryId: true },
				});
				const oldWorkEntryIds = new Set(
					oldLinkedItems.map(
						(i: { workEntryId: string | null }) => i.workEntryId!
					)
				);

				// 2. Get new line items' workEntryIds (from the incoming data)
				const newWorkEntryIds = new Set(
					updateData.lineItems
						.filter((i) => i.workEntryId)
						.map((i) => i.workEntryId!)
				);

				// 3. Find removed entries (in old but not in new)
				const removedWorkEntryIds = [...oldWorkEntryIds].filter(
					(wId) => !newWorkEntryIds.has(wId)
				);

				// 4. Revert removed entries to UNBILLED
				if (removedWorkEntryIds.length > 0) {
					await tx.workEntry.updateMany({
						where: { id: { in: removedWorkEntryIds } },
						data: { status: 'UNBILLED' },
					});
				}

				// Delete old line items
				await tx.invoiceLineItem.deleteMany({
					where: { invoiceId: id },
				});

				// Create new line items (preserving workEntryId and date links)
				await tx.invoiceLineItem.createMany({
					data: updateData.lineItems.map((item, index) => ({
						description: item.description,
						quantity: item.quantity,
						unitPrice: item.unitPrice,
						amount: item.quantity * item.unitPrice,
						sortOrder: index,
						invoiceId: id,
						...(item.workEntryId ? { workEntryId: item.workEntryId } : {}),
						...(item.date ? { date: item.date } : {}),
					})),
				});
			} else if (updateData.taxRate !== undefined) {
				// Tax rate changed but no new line items — recompute totals
				subtotal = invoice.subtotal.toNumber();
				taxAmount = subtotal * (updateData.taxRate / 100);
				totalAmount = subtotal + taxAmount;
			}

			return await tx.invoice.update({
				where: { id, userId },
				data: {
					...(updateData.clientName && {
						clientName: updateData.clientName,
					}),
					...(updateData.clientEmail !== undefined && {
						clientEmail: updateData.clientEmail || null,
					}),
					...(updateData.clientAddress !== undefined && {
						clientAddress: updateData.clientAddress,
					}),
					...(updateData.clientPhone !== undefined && {
						clientPhone: updateData.clientPhone,
					}),
					...(updateData.issueDate && {
						issueDate: updateData.issueDate,
					}),
					...(updateData.dueDate && { dueDate: updateData.dueDate }),
					...(updateData.taxRate !== undefined && {
						taxRate: updateData.taxRate,
					}),
					...(updateData.notes !== undefined && {
						notes: updateData.notes,
					}),
					...(subtotal !== undefined && { subtotal }),
					...(taxAmount !== undefined && { taxAmount }),
					...(totalAmount !== undefined && { totalAmount }),
				},
				include: {
					lineItems: {
						orderBy: { sortOrder: 'asc' },
					},
				},
			});
		});
	},

	/**
	 * Transition invoice from DRAFT to SENT.
	 * If the invoice has a clientEmail on file, also email the rendered PDF to
	 * the client. Returns the updated invoice plus the recipient when emailed.
	 */
	async markAsSent(userId: string, invoiceId: string) {
		const invoice = await prisma.invoice.findUnique({
			where: { id: invoiceId, userId },
			include: {
				lineItems: { orderBy: { sortOrder: 'asc' } },
				user: { select: { name: true, email: true } },
			},
		});

		if (!invoice) {
			throw new Error('Invoice not found');
		}

		if (invoice.status !== InvoiceStatus.DRAFT) {
			throw new Error('Only DRAFT invoices can be marked as sent');
		}

		let emailedTo: string | null = null;

		if (invoice.clientEmail) {
			const currency =
				invoice.currency || (await UserService.getCurrency(userId));

			emailedTo = await emailInvoiceToClient(invoice, currency, {
				status: InvoiceStatus.SENT,
				paidAt: null,
				variant: 'invoice',
			});
		}

		const updated = await prisma.invoice.update({
			where: { id: invoiceId, userId },
			data: { status: InvoiceStatus.SENT },
		});

		return { invoice: updated, emailedTo };
	},

	/**
	 * Mark invoice as PAID — updates status and paidAt.
	 * If `sendEmail` is true and the invoice has a clientEmail, also emails a
	 * PAID-stamped PDF receipt to the client.
	 *
	 * Does NOT create an income record (currency conversion between invoice
	 * currency and account currency is not yet supported).
	 */
	async markAsPaid(userId: string, data: MarkAsPaidInput) {
		const invoice = await prisma.invoice.findUnique({
			where: { id: data.invoiceId, userId },
			include: {
				lineItems: { orderBy: { sortOrder: 'asc' } },
				user: { select: { name: true, email: true } },
				linkedIncome: {
					include: { account: { select: { name: true } } },
				},
			},
		});

		if (!invoice) {
			throw new Error('Invoice not found');
		}

		if (
			invoice.status !== InvoiceStatus.SENT &&
			invoice.status !== InvoiceStatus.OVERDUE
		) {
			throw new Error('Only SENT or OVERDUE invoices can be marked as paid');
		}

		const paidAt = data.date ?? new Date();
		let emailedTo: string | null = null;

		if (data.sendEmail && invoice.clientEmail) {
			const currency =
				invoice.currency || (await UserService.getCurrency(userId));

			emailedTo = await emailInvoiceToClient(
				{ ...invoice, paidAt },
				currency,
				{
					status: InvoiceStatus.PAID,
					paidAt,
					variant: 'receipt',
				}
			);
		}

		const updated = await prisma.invoice.update({
			where: { id: data.invoiceId, userId },
			data: {
				status: InvoiceStatus.PAID,
				paidAt,
			},
		});

		return { invoice: updated, emailedTo };
	},

	/**
	 * Cancel an invoice (DRAFT, SENT, or OVERDUE).
	 * Reverts any linked work entries back to UNBILLED and unlinks them
	 * from the cancelled invoice's line items.
	 */
	async cancel(userId: string, invoiceId: string) {
		const invoice = await prisma.invoice.findUniqueOrThrow({
			where: { id: invoiceId, userId },
		});

		if (
			invoice.status !== InvoiceStatus.DRAFT &&
			invoice.status !== InvoiceStatus.SENT &&
			invoice.status !== InvoiceStatus.OVERDUE
		) {
			throw new Error('Only DRAFT, SENT, or OVERDUE invoices can be cancelled');
		}

		return await prisma.$transaction(async (tx) => {
			await revertLinkedEntries(tx, invoiceId);

			return await tx.invoice.update({
				where: { id: invoiceId, userId },
				data: { status: InvoiceStatus.CANCELLED },
			});
		});
	},

	/**
	 * Delete a DRAFT invoice.
	 * Reverts any linked work entries back to UNBILLED before deletion.
	 */
	async delete(userId: string, invoiceId: string) {
		const invoice = await prisma.invoice.findUniqueOrThrow({
			where: { id: invoiceId, userId },
		});

		if (invoice.status !== InvoiceStatus.DRAFT) {
			throw new Error('Only DRAFT invoices can be deleted');
		}

		return await prisma.$transaction(async (tx) => {
			await revertLinkedEntries(tx, invoiceId);

			return await tx.invoice.delete({
				where: { id: invoiceId, userId },
			});
		});
	},

	/**
	 * Get all invoices for a user with optional filters
	 */
	async getAll(userId: string, filters?: GetInvoicesInput) {
		return await prisma.invoice.findMany({
			where: {
				userId,
				...(filters?.status && { status: filters.status }),
				...(filters?.clientName && {
					clientName: {
						contains: filters.clientName,
						mode: 'insensitive' as const,
					},
				}),
				...(filters?.clientId && { clientId: filters.clientId }),
			},
			include: {
				_count: {
					select: { lineItems: true },
				},
			},
			orderBy: { createdAt: 'desc' },
		});
	},

	/**
	 * Get a single invoice by ID with full details
	 */
	async getById(userId: string, invoiceId: string) {
		return await prisma.invoice.findUnique({
			where: { id: invoiceId, userId },
			include: {
				lineItems: {
					orderBy: { sortOrder: 'asc' },
				},
				linkedIncome: {
					include: {
						account: {
							select: { name: true },
						},
					},
				},
				user: {
					select: { name: true, email: true },
				},
			},
		});
	},

	/**
	 * Bulk update SENT invoices past due date to OVERDUE
	 */
	async processOverdue(): Promise<{ processed: number }> {
		const result = await prisma.invoice.updateMany({
			where: {
				status: InvoiceStatus.SENT,
				dueDate: { lt: new Date() },
			},
			data: { status: InvoiceStatus.OVERDUE },
		});

		return { processed: result.count };
	},

	/**
	 * Get summary counts and amounts by status for dashboard cards.
	 * Groups by status AND currency so totals are never mixed across currencies.
	 */
	async getSummary(userId: string): Promise<InvoiceSummary> {
		const rows = await prisma.invoice.groupBy({
			by: ['status', 'currency'],
			where: { userId },
			_count: { id: true },
			_sum: { totalAmount: true },
		});

		const outstanding: Record<string, number> = {};
		const paid: Record<string, number> = {};
		let draftCount = 0;
		let overdueCount = 0;

		for (const row of rows) {
			const amount = row._sum.totalAmount?.toNumber() ?? 0;
			const currency = row.currency;

			switch (row.status) {
				case 'SENT':
					outstanding[currency] = (outstanding[currency] ?? 0) + amount;
					break;
				case 'OVERDUE':
					outstanding[currency] = (outstanding[currency] ?? 0) + amount;
					overdueCount += row._count.id;
					break;
				case 'PAID':
					paid[currency] = (paid[currency] ?? 0) + amount;
					break;
				case 'DRAFT':
					draftCount += row._count.id;
					break;
			}
		}

		return { outstanding, paid, draftCount, overdueCount };
	},
};
