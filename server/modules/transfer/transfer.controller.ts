'use server';

import { getAuthenticatedUser } from '@/server/lib/auth-guard';
import { TransferService } from './transfer.service';
import { createTransferSchema } from './transfer.types';
import { invalidateTags } from '@/server/actions/cache';
import { CACHE_TAGS } from '@/server/lib/cache-tags';
import { coerceDateFields } from '@/server/lib/action-utils';

/**
 * Server Action: Create Transfer
 */
export async function createTransferAction(data: unknown) {
	const userId = await getAuthenticatedUser();

	const parsed = createTransferSchema.safeParse(coerceDateFields(data));
	if (!parsed.success) {
		return { error: parsed.error.issues[0]?.message || 'Validation failed' };
	}

	try {
		await TransferService.createTransfer(userId, parsed.data);
		invalidateTags(CACHE_TAGS.TRANSFERS, CACHE_TAGS.ACCOUNTS, CACHE_TAGS.DASHBOARD, CACHE_TAGS.TRANSACTIONS);
		return { success: true as const };
	} catch (error) {
		console.error('Failed to create transfer:', error);
		return { error: 'Failed to create transfer' };
	}
}

/**
 * Server Action: Delete Transfer
 */
export async function deleteTransferAction(transferId: string) {
	const userId = await getAuthenticatedUser();

	try {
		await TransferService.deleteTransfer(userId, transferId);
		invalidateTags(CACHE_TAGS.TRANSFERS, CACHE_TAGS.ACCOUNTS, CACHE_TAGS.DASHBOARD, CACHE_TAGS.TRANSACTIONS);
		return { success: true as const };
	} catch (error) {
		console.error('Failed to delete transfer:', error);
		return { error: 'Failed to delete transfer' };
	}
}
