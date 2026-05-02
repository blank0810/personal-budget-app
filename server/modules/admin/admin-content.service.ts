import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

const PAGE_SIZE = 20;

export type FeatureRequestSortBy = 'title' | 'category' | 'email' | 'createdAt' | 'status';
export type FeatureRequestSortOrder = 'asc' | 'desc';

export const AdminContentService = {
	// --- Feature Requests ---
	async getFeatureRequests(
		page: number = 1,
		status?: string,
		category?: string,
		search?: string,
		sortBy: FeatureRequestSortBy = 'createdAt',
		sortOrder: FeatureRequestSortOrder = 'desc'
	) {
		const where: Prisma.FeatureRequestWhereInput = {};
		if (status) where.status = status;
		if (category) where.category = category as Prisma.EnumRequestCategoryFilter;

		// Free-text search: case-insensitive contains on title OR email.
		if (search && search.trim().length > 0) {
			where.OR = [
				{ title: { contains: search, mode: 'insensitive' } },
				{ email: { contains: search, mode: 'insensitive' } },
			];
		}

		const orderBy: Prisma.FeatureRequestOrderByWithRelationInput = {
			[sortBy]: sortOrder,
		};

		const [requests, total] = await Promise.all([
			prisma.featureRequest.findMany({
				where,
				orderBy,
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

	async bulkUpdateFeatureRequestStatus(ids: string[], status: string) {
		const result = await prisma.featureRequest.updateMany({
			where: { id: { in: ids } },
			data: { status },
		});
		return { count: result.count };
	},

	async bulkDeleteFeatureRequests(ids: string[]) {
		const result = await prisma.featureRequest.deleteMany({
			where: { id: { in: ids } },
		});
		return { count: result.count };
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
