import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

const PAGE_SIZE = 20;

export const AdminContentService = {
	// --- Feature Requests ---
	async getFeatureRequests(
		page: number = 1,
		status?: string,
		category?: string
	) {
		const where: Prisma.FeatureRequestWhereInput = {};
		if (status) where.status = status;
		if (category) where.category = category as Prisma.EnumRequestCategoryFilter;

		const [requests, total] = await Promise.all([
			prisma.featureRequest.findMany({
				where,
				orderBy: { createdAt: 'desc' },
				skip: (page - 1) * PAGE_SIZE,
				take: PAGE_SIZE,
			}),
			prisma.featureRequest.count({ where }),
		]);

		return {
			requests,
			total,
			pages: Math.ceil(total / PAGE_SIZE),
			page,
		};
	},

	async updateFeatureRequestStatus(
		id: string,
		status: string,
		adminNotes?: string
	) {
		return prisma.featureRequest.update({
			where: { id },
			data: { status, adminNotes },
		});
	},

	// --- Feature Flags ---
	async getFeatureFlags() {
		const flags = await prisma.featureFlag.findMany({
			orderBy: { key: 'asc' },
		});

		// Count per-flag how many users have overrides
		const overrideCounts = await prisma.userFeature.groupBy({
			by: ['flagKey'],
			_count: { flagKey: true },
		});

		const countMap = new Map(
			overrideCounts.map((o) => [o.flagKey, o._count.flagKey])
		);

		return flags.map((f) => ({
			...f,
			overrideCount: countMap.get(f.key) ?? 0,
		}));
	},

	async toggleFeatureFlag(key: string, enabled: boolean) {
		return prisma.featureFlag.update({
			where: { key },
			data: { enabled },
		});
	},
};
