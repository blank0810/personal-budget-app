'use server';

import { auth } from '@/auth';
import { WorkEntryService } from './work-entry.service';
import {
	createWorkEntrySchema,
	updateWorkEntrySchema,
	getWorkEntriesSchema,
} from './work-entry.types';
import { clearCache } from '@/server/actions/cache';
import { serialize } from '@/lib/serialization';

async function getAuthenticatedUser() {
	const session = await auth();
	if (!session?.user?.id) throw new Error('Not authenticated');
	return session.user.id;
}

export async function createWorkEntryAction(data: unknown) {
	const userId = await getAuthenticatedUser();

	const parsed = createWorkEntrySchema.safeParse(data);
	if (!parsed.success) {
		return {
			error: parsed.error.issues[0]?.message || 'Validation failed',
		};
	}

	try {
		const entry = await WorkEntryService.create(userId, parsed.data);
		await clearCache('/entries');
		await clearCache('/clients');
		return { success: true, entry: serialize(entry) };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to create work entry',
		};
	}
}

export async function updateWorkEntryAction(data: unknown) {
	const userId = await getAuthenticatedUser();

	const parsed = updateWorkEntrySchema.safeParse(data);
	if (!parsed.success) {
		return {
			error: parsed.error.issues[0]?.message || 'Validation failed',
		};
	}

	try {
		const entry = await WorkEntryService.update(userId, parsed.data);
		await clearCache('/entries');
		await clearCache('/clients');
		return { success: true, entry: serialize(entry) };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to update work entry',
		};
	}
}

export async function deleteWorkEntryAction(entryId: string) {
	const userId = await getAuthenticatedUser();

	try {
		await WorkEntryService.delete(userId, entryId);
		await clearCache('/entries');
		await clearCache('/clients');
		return { success: true };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to delete work entry',
		};
	}
}

export async function getUnbilledByClientAction(clientId: string) {
	const userId = await getAuthenticatedUser();

	try {
		const entries = await WorkEntryService.getUnbilledByClient(userId, clientId);
		return { success: true, entries: serialize(entries) };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to fetch entries',
		};
	}
}

export async function getWorkEntriesAction(filters: unknown) {
	const userId = await getAuthenticatedUser();

	const parsed = getWorkEntriesSchema.safeParse(filters);
	if (!parsed.success) {
		return { error: parsed.error.issues[0]?.message || 'Invalid filters' };
	}

	try {
		const result = await WorkEntryService.getAll(userId, parsed.data);
		return {
			success: true,
			data: serialize(result.data),
			total: result.total,
		};
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to fetch entries',
		};
	}
}

export async function getUnbilledCountsAction() {
	const userId = await getAuthenticatedUser();
	try {
		const counts = await WorkEntryService.getUnbilledCountsByClient(userId);
		return { success: true, counts };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to fetch counts',
		};
	}
}
