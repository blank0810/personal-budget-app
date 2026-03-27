'use server';

import { auth } from '@/auth';
import { AccountResetService } from './account-reset.service';
import { revalidatePath } from 'next/cache';

/**
 * Helper to authenticate user
 */
async function getAuthenticatedUser() {
	const session = await auth();
	if (!session?.user?.id) {
		throw new Error('Unauthorized');
	}
	return session.user.id;
}

/**
 * Server Action: Export all user financial data as JSON
 */
export async function exportMyDataAction() {
	try {
		const userId = await getAuthenticatedUser();
		const data = await AccountResetService.exportUserData(userId);
		return { data };
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
		return { token };
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
		revalidatePath('/', 'layout');
		return { success: true };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Reset failed',
		};
	}
}
