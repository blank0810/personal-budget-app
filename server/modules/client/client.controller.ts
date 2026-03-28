'use server';

import { getAuthenticatedUser } from '@/server/lib/auth-guard';
import { ClientService } from './client.service';
import { createClientSchema, updateClientSchema } from './client.types';
import { invalidateTags } from '@/server/actions/cache';
import { CACHE_TAGS } from '@/server/lib/cache-tags';
import { serialize } from '@/lib/serialization';

export async function createClientAction(data: unknown) {
	const userId = await getAuthenticatedUser();

	const parsed = createClientSchema.safeParse(data);
	if (!parsed.success) {
		return {
			error: parsed.error.issues[0]?.message || 'Validation failed',
		};
	}

	try {
		const client = await ClientService.create(userId, parsed.data);
		invalidateTags(CACHE_TAGS.CLIENTS);
		return { success: true as const, data: serialize(client) };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to create client',
		};
	}
}

export async function updateClientAction(data: unknown) {
	const userId = await getAuthenticatedUser();

	const parsed = updateClientSchema.safeParse(data);
	if (!parsed.success) {
		return {
			error: parsed.error.issues[0]?.message || 'Validation failed',
		};
	}

	try {
		const client = await ClientService.update(userId, parsed.data);
		invalidateTags(CACHE_TAGS.CLIENTS, CACHE_TAGS.WORK_ENTRIES, CACHE_TAGS.INVOICES);
		return { success: true as const, data: serialize(client) };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to update client',
		};
	}
}

export async function archiveClientAction(clientId: string) {
	const userId = await getAuthenticatedUser();

	try {
		await ClientService.archive(userId, clientId);
		invalidateTags(CACHE_TAGS.CLIENTS, CACHE_TAGS.WORK_ENTRIES, CACHE_TAGS.INVOICES);
		return { success: true as const };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to archive client',
		};
	}
}

export async function restoreClientAction(clientId: string) {
	const userId = await getAuthenticatedUser();

	try {
		await ClientService.restore(userId, clientId);
		invalidateTags(CACHE_TAGS.CLIENTS, CACHE_TAGS.WORK_ENTRIES, CACHE_TAGS.INVOICES);
		return { success: true as const };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to restore client',
		};
	}
}

export async function deleteClientAction(clientId: string) {
	const userId = await getAuthenticatedUser();

	try {
		await ClientService.delete(userId, clientId);
		invalidateTags(CACHE_TAGS.CLIENTS, CACHE_TAGS.WORK_ENTRIES, CACHE_TAGS.INVOICES);
		return { success: true as const };
	} catch (error) {
		// Prisma P2003 = foreign key constraint violation (Restrict)
		const message =
			error instanceof Error ? error.message : String(error);
		if (message.includes('Foreign key constraint')) {
			return {
				error: 'This client has work entries and cannot be deleted. Use archive instead.',
			};
		}
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to delete client',
		};
	}
}
