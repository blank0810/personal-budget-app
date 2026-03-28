'use server';

import { getAuthenticatedUser } from '@/server/lib/auth-guard';
import { AccountResetService } from './account-reset.service';
import { invalidateTags } from '@/server/actions/cache';
import { CACHE_TAGS } from '@/server/lib/cache-tags';

/**
 * Server Action: Export all user financial data as JSON
 */
export async function exportMyDataAction() {
	try {
		const userId = await getAuthenticatedUser();
		const data = await AccountResetService.exportUserData(userId);
		return { success: true as const, data };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to export data',
		};
	}
}

/**
 * Server Action: Verify password and generate reset token
 */
export async function verifyForResetAction(password: string) {
	try {
		const userId = await getAuthenticatedUser();
		const token = await AccountResetService.verifyForReset(userId, password);
		return { success: true as const, data: { token } };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Verification failed',
		};
	}
}

/**
 * Server Action: Execute reset with token, confirmation phrase, and tier
 */
export async function executeResetAction(
	resetToken: string,
	confirmationPhrase: string,
	tier: 'transactions' | 'full'
) {
	try {
		const userId = await getAuthenticatedUser();
		await AccountResetService.executeReset(
			userId,
			resetToken,
			confirmationPhrase,
			tier
		);
		// Account reset wipes financial data -- invalidate everything
		invalidateTags(
			CACHE_TAGS.INCOMES,
			CACHE_TAGS.EXPENSES,
			CACHE_TAGS.ACCOUNTS,
			CACHE_TAGS.BUDGETS,
			CACHE_TAGS.TRANSFERS,
			CACHE_TAGS.PAYMENTS,
			CACHE_TAGS.GOALS,
			CACHE_TAGS.DASHBOARD,
			CACHE_TAGS.RECURRING,
			CACHE_TAGS.CATEGORIES,
			CACHE_TAGS.REPORTS,
			CACHE_TAGS.CLIENTS,
			CACHE_TAGS.WORK_ENTRIES,
			CACHE_TAGS.INVOICES
		);
		return { success: true as const };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Reset failed',
		};
	}
}
