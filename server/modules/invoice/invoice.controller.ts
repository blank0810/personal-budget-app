'use server';

import { getAuthenticatedUser } from '@/server/lib/auth-guard';
import { InvoiceService } from './invoice.service';
import {
	createInvoiceSchema,
	updateInvoiceSchema,
	markAsPaidSchema,
	generateFromEntriesSchema,
} from './invoice.types';
import { invalidateTags } from '@/server/actions/cache';
import { CACHE_TAGS } from '@/server/lib/cache-tags';

export async function createInvoiceAction(data: unknown) {
	const userId = await getAuthenticatedUser();

	const parsed = createInvoiceSchema.safeParse(data);
	if (!parsed.success) {
		return {
			error: parsed.error.issues[0]?.message || 'Validation failed',
		};
	}

	try {
		const invoice = await InvoiceService.create(userId, parsed.data);
		invalidateTags(CACHE_TAGS.INVOICES, CACHE_TAGS.WORK_ENTRIES);
		return { success: true as const, data: invoice };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to create invoice',
		};
	}
}

export async function updateInvoiceAction(data: unknown) {
	const userId = await getAuthenticatedUser();

	const parsed = updateInvoiceSchema.safeParse(data);
	if (!parsed.success) {
		return {
			error: parsed.error.issues[0]?.message || 'Validation failed',
		};
	}

	try {
		const invoice = await InvoiceService.update(userId, parsed.data);
		invalidateTags(CACHE_TAGS.INVOICES, CACHE_TAGS.WORK_ENTRIES);
		return { success: true as const, data: invoice };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to update invoice',
		};
	}
}

export async function markAsSentAction(invoiceId: string) {
	const userId = await getAuthenticatedUser();

	try {
		await InvoiceService.markAsSent(userId, invoiceId);
		invalidateTags(CACHE_TAGS.INVOICES);
		return { success: true as const };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to mark invoice as sent',
		};
	}
}

export async function markAsPaidAction(data: unknown) {
	const userId = await getAuthenticatedUser();

	const parsed = markAsPaidSchema.safeParse(data);
	if (!parsed.success) {
		return {
			error: parsed.error.issues[0]?.message || 'Validation failed',
		};
	}

	try {
		await InvoiceService.markAsPaid(userId, parsed.data);
		// markAsPaid creates an Income record, so also invalidate income/account/dashboard
		invalidateTags(
			CACHE_TAGS.INVOICES,
			CACHE_TAGS.INCOMES,
			CACHE_TAGS.ACCOUNTS,
			CACHE_TAGS.DASHBOARD
		);
		return { success: true as const };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to mark invoice as paid',
		};
	}
}

export async function cancelInvoiceAction(invoiceId: string) {
	const userId = await getAuthenticatedUser();

	try {
		await InvoiceService.cancel(userId, invoiceId);
		// Cancelling reverts work entries to UNBILLED
		invalidateTags(CACHE_TAGS.INVOICES, CACHE_TAGS.WORK_ENTRIES);
		return { success: true as const };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to cancel invoice',
		};
	}
}

export async function deleteInvoiceAction(invoiceId: string) {
	const userId = await getAuthenticatedUser();

	try {
		await InvoiceService.delete(userId, invoiceId);
		// Deleting reverts work entries to UNBILLED
		invalidateTags(CACHE_TAGS.INVOICES, CACHE_TAGS.WORK_ENTRIES);
		return { success: true as const };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to delete invoice',
		};
	}
}

export async function generateInvoiceFromEntriesAction(data: unknown) {
	const userId = await getAuthenticatedUser();

	const parsed = generateFromEntriesSchema.safeParse(data);
	if (!parsed.success) {
		return {
			error: parsed.error.issues[0]?.message || 'Validation failed',
		};
	}

	try {
		const invoice = await InvoiceService.createFromWorkEntries(
			userId,
			parsed.data
		);
		invalidateTags(CACHE_TAGS.INVOICES, CACHE_TAGS.WORK_ENTRIES, CACHE_TAGS.CLIENTS);
		return { success: true as const, data: { invoiceId: invoice.id } };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to generate invoice',
		};
	}
}
