'use server';

import { getAuthenticatedUser } from '@/server/lib/auth-guard';
import { WorkEntryService } from './work-entry.service';
import {
	createWorkEntrySchema,
	updateWorkEntrySchema,
	getWorkEntriesSchema,
} from './work-entry.types';
import { invalidateTags } from '@/server/actions/cache';
import { CACHE_TAGS } from '@/server/lib/cache-tags';
import { serialize } from '@/lib/serialization';

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
		invalidateTags(CACHE_TAGS.WORK_ENTRIES, CACHE_TAGS.INVOICES);
		return { success: true as const, data: serialize(entry) };
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
		invalidateTags(CACHE_TAGS.WORK_ENTRIES, CACHE_TAGS.INVOICES);
		return { success: true as const, data: serialize(entry) };
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
		invalidateTags(CACHE_TAGS.WORK_ENTRIES, CACHE_TAGS.INVOICES);
		return { success: true as const };
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
		return { success: true as const, data: serialize(entries) };
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
			success: true as const,
			data: { entries: serialize(result.data), total: result.total },
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
		return { success: true as const, data: counts };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to fetch counts',
		};
	}
}
