'use server';

import { auth, unstable_update } from '@/auth';
import { OnboardingService } from './onboarding.service';
import { clearCache } from '@/server/actions/cache';

export async function setUserCurrency(currency: string) {
	const session = await auth();
	if (!session?.user?.id)
		return { success: false, error: 'Not authenticated' };

	try {
		await OnboardingService.setCurrency(session.user.id, currency);
		// Update the JWT so middleware picks up the new currency
		await unstable_update({ user: { currency } });
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: 'Failed to set currency',
		};
	}
}

export async function completeOnboarding() {
	const session = await auth();
	if (!session?.user?.id)
		return { success: false, error: 'Not authenticated' };

	await OnboardingService.completeOnboarding(session.user.id);
	// Update the JWT so middleware knows the user is onboarded
	await unstable_update({ user: { isOnboarded: true } });
	await clearCache('/', 'layout');
	return { success: true };
}
