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
		return prisma.featureFlag.findMany({
			orderBy: { key: 'asc' },
		});
	},

	async toggleFeatureFlag(key: string, enabled: boolean) {
		return prisma.featureFlag.update({
			where: { key },
			data: { enabled },
		});
	},
};
