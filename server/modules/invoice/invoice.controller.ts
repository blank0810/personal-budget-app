'use server';

import { auth } from '@/auth';
import { InvoiceService } from './invoice.service';
import {
	createInvoiceSchema,
	updateInvoiceSchema,
	markAsPaidSchema,
	generateFromEntriesSchema,
} from './invoice.types';
import { clearCache } from '@/server/actions/cache';

async function getAuthenticatedUser() {
	const session = await auth();
	if (!session?.user?.id) throw new Error('Not authenticated');
	return session.user.id;
}

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
		await clearCache('/invoices');
		return { success: true, invoice };
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
		await clearCache('/invoices');
		return { success: true, invoice };
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
		await clearCache('/invoices');
		return { success: true };
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
		await clearCache('/invoices');
		return { success: true };
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
		await clearCache('/invoices');
		return { success: true };
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
		await clearCache('/invoices');
		return { success: true };
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
		await clearCache('/invoices');
		await clearCache('/entries');
		await clearCache('/clients');
		return { success: true, invoiceId: invoice.id };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to generate invoice',
		};
	}
}
