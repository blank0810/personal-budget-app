import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/server/lib/auth-guard';
import { FeatureFlagService } from '@/server/modules/feature-flag/feature-flag.service';

/**
 * Guard a server component page behind a feature flag.
 * Redirects to /dashboard if the feature is disabled for the current user.
 *
 * Usage:
 *   await requireFeature('recurring_transactions');
 */
export async function requireFeature(featureKey: string) {
	const userId = await getAuthenticatedUser();

	const features = await FeatureFlagService.getResolvedFeaturesForUser(userId);
	if (!features[featureKey]) {
		redirect('/dashboard');
	}
}
