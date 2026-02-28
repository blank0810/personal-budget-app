'use server';

import { auth } from '@/auth';
import { OnboardingService } from './onboarding.service';
import { clearCache } from '@/server/actions/cache';

export async function setUserCurrency(currency: string) {
	const session = await auth();
	if (!session?.user?.id)
		return { success: false, error: 'Not authenticated' };

	try {
		await OnboardingService.setCurrency(session.user.id, currency);
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
	await clearCache('/', 'layout');
	return { success: true };
}
