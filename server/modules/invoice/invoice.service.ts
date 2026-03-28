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

/**
 * Revert linked work entries back to UNBILLED when an invoice is cancelled or deleted.
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

				// 3. Build line items from entries
				const lineItems = entries.map((entry, index) => ({
					description: entry.description,
					quantity: Number(entry.quantity),
					unitPrice: Number(entry.unitPrice),
					amount: Number(entry.amount),
					sortOrder: index,
				}));

				const { subtotal, taxAmount, totalAmount } =
					computeInvoiceTotals(lineItems, data.taxRate ?? 0);

				// 4. Create invoice with line items, linking workEntryId on each
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

				// 5. Flip entries to BILLED and set audit trail
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

				// Delete old line items
				await tx.invoiceLineItem.deleteMany({
					where: { invoiceId: id },
				});

				// Create new line items
				await tx.invoiceLineItem.createMany({
					data: lineItemsData.map((item) => ({
						...item,
						invoiceId: id,
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
	 * Transition invoice from DRAFT to SENT
	 */
	async markAsSent(userId: string, invoiceId: string) {
		const invoice = await prisma.invoice.findUniqueOrThrow({
			where: { id: invoiceId, userId },
		});

		if (invoice.status !== InvoiceStatus.DRAFT) {
			throw new Error('Only DRAFT invoices can be marked as sent');
		}

		return await prisma.invoice.update({
			where: { id: invoiceId, userId },
			data: { status: InvoiceStatus.SENT },
		});
	},

	/**
	 * Mark invoice as PAID — just updates status and paidAt.
	 * Does NOT create an income record (currency conversion between
	 * invoice currency and account currency is not yet supported).
	 */
	async markAsPaid(userId: string, data: MarkAsPaidInput) {
		const invoice = await prisma.invoice.findUniqueOrThrow({
			where: { id: data.invoiceId, userId },
		});

		if (
			invoice.status !== InvoiceStatus.SENT &&
			invoice.status !== InvoiceStatus.OVERDUE
		) {
			throw new Error('Only SENT or OVERDUE invoices can be marked as paid');
		}

		return await prisma.invoice.update({
			where: { id: data.invoiceId, userId },
			data: {
				status: InvoiceStatus.PAID,
				paidAt: data.date ?? new Date(),
			},
		});
	},

	/**
	 * Cancel an invoice (DRAFT or SENT only).
	 * Reverts any linked work entries back to UNBILLED.
	 */
	async cancel(userId: string, invoiceId: string) {
		const invoice = await prisma.invoice.findUniqueOrThrow({
			where: { id: invoiceId, userId },
		});

		if (
			invoice.status !== InvoiceStatus.DRAFT &&
			invoice.status !== InvoiceStatus.SENT
		) {
			throw new Error('Only DRAFT or SENT invoices can be cancelled');
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
