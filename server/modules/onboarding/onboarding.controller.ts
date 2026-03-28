'use server';

import { auth, unstable_update } from '@/auth';
import { OnboardingService } from './onboarding.service';
import { invalidateTags } from '@/server/actions/cache';
import { CACHE_TAGS } from '@/server/lib/cache-tags';
import { setCurrencySchema } from './onboarding.types';

export async function setUserCurrency(currency: string) {
	const session = await auth();
	if (!session?.user?.id)
		return { error: 'Not authenticated' };

	const validatedFields = setCurrencySchema.safeParse({ currency });

	if (!validatedFields.success) {
		return { error: validatedFields.error.issues[0]?.message || 'Invalid fields' };
	}

	try {
		await OnboardingService.setCurrency(
			session.user.id,
			validatedFields.data.currency
		);
		// Update the JWT so middleware picks up the new currency
		await unstable_update({
			user: { currency: validatedFields.data.currency },
		});
		return { success: true as const };
	} catch (error) {
		return {
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
		return { error: 'Not authenticated' };

	await OnboardingService.completeOnboarding(session.user.id);
	// Update the JWT so middleware knows the user is onboarded
	await unstable_update({ user: { isOnboarded: true } });
	// Onboarding completion -- invalidate everything for fresh start
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
}
