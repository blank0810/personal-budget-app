import prisma from '@/lib/prisma';
import type { ResolvedFeatures } from './feature-flag.types';

export const FeatureFlagService = {
	/**
	 * Resolve all feature flags for a user.
	 * Resolution order: user override > global default > disabled.
	 *
	 * Two small queries (global flags + user overrides) are simple and
	 * cache-friendly. Do NOT wrap in unstable_cache until profiling shows need.
	 */
	async getResolvedFeaturesForUser(
		userId: string
	): Promise<ResolvedFeatures> {
		const [globalFlags, userOverrides] = await Promise.all([
			prisma.featureFlag.findMany(),
			prisma.userFeature.findMany({ where: { userId } }),
		]);

		const result: ResolvedFeatures = {};

		// Start with global defaults
		for (const flag of globalFlags) {
			result[flag.key] = flag.enabled;
		}

		// Apply user overrides (wins over global)
		for (const override of userOverrides) {
			result[override.flagKey] = override.enabled;
		}

		return result;
	},

	/**
	 * Get user overrides only (for the admin UI to show which are custom vs default).
	 */
	async getUserOverrides(userId: string): Promise<Record<string, boolean>> {
		const overrides = await prisma.userFeature.findMany({
			where: { userId },
		});
		const result: Record<string, boolean> = {};
		for (const o of overrides) {
			result[o.flagKey] = o.enabled;
		}
		return result;
	},

	/**
	 * Set a per-user override for a feature flag.
	 * Creates or updates the UserFeature record.
	 */
	async setUserFeatureOverride(
		userId: string,
		flagKey: string,
		enabled: boolean
	) {
		return prisma.userFeature.upsert({
			where: { userId_flagKey: { userId, flagKey } },
			update: { enabled },
			create: { userId, flagKey, enabled },
		});
	},

	/**
	 * Remove a per-user override (reset to global default).
	 */
	async removeUserFeatureOverride(userId: string, flagKey: string) {
		return prisma.userFeature.deleteMany({
			where: { userId, flagKey },
		});
	},

	/**
	 * Bulk set all overrides for a user (used when toggling multiple at once).
	 * Deletes all existing overrides and creates new ones in a transaction.
	 */
	async bulkSetUserFeatures(
		userId: string,
		overrides: Array<{ flagKey: string; enabled: boolean }>
	) {
		// Only create records for actual overrides, not defaults
		return prisma.$transaction([
			prisma.userFeature.deleteMany({ where: { userId } }),
			...overrides.map((o) =>
				prisma.userFeature.create({
					data: { userId, flagKey: o.flagKey, enabled: o.enabled },
				})
			),
		]);
	},
};
