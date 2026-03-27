import prisma from '@/lib/prisma';
import { WorkEntryStatus } from '@prisma/client';
import {
	CreateWorkEntryInput,
	UpdateWorkEntryInput,
	GetWorkEntriesInput,
} from './work-entry.types';

export const WorkEntryService = {
	/**
	 * Create a new work entry with server-computed amount
	 */
	async create(userId: string, data: CreateWorkEntryInput) {
		const amount = data.quantity * data.unitPrice;

		const user = await prisma.user.findUniqueOrThrow({
			where: { id: userId },
			select: { currency: true },
		});

		return await prisma.workEntry.create({
			data: {
				description: data.description,
				date: data.date,
				quantity: data.quantity,
				unitPrice: data.unitPrice,
				amount,
				currency: user.currency ?? 'USD',
				clientId: data.clientId,
				userId,
			},
			include: {
				client: {
					select: { id: true, name: true },
				},
			},
		});
	},

	/**
	 * Update an UNBILLED work entry — recomputes amount if quantity/unitPrice changed
	 */
	async update(userId: string, data: UpdateWorkEntryInput) {
		const { id, ...updateData } = data;

		const entry = await prisma.workEntry.findUniqueOrThrow({
			where: { id, userId },
		});

		if (entry.status !== WorkEntryStatus.UNBILLED) {
			throw new Error('Only UNBILLED entries can be edited');
		}

		const quantity =
			updateData.quantity ?? entry.quantity.toNumber();
		const unitPrice =
			updateData.unitPrice ?? entry.unitPrice.toNumber();
		const amount = quantity * unitPrice;

		return await prisma.workEntry.update({
			where: { id, userId },
			data: {
				...(updateData.description !== undefined && {
					description: updateData.description,
				}),
				...(updateData.date !== undefined && {
					date: updateData.date,
				}),
				...(updateData.clientId !== undefined && {
					clientId: updateData.clientId,
				}),
				quantity,
				unitPrice,
				amount,
			},
			include: {
				client: {
					select: { id: true, name: true },
				},
			},
		});
	},

	/**
	 * Delete an UNBILLED work entry
	 */
	async delete(userId: string, entryId: string) {
		const entry = await prisma.workEntry.findUniqueOrThrow({
			where: { id: entryId, userId },
		});

		if (entry.status !== WorkEntryStatus.UNBILLED) {
			throw new Error('Only UNBILLED entries can be deleted');
		}

		return await prisma.workEntry.delete({
			where: { id: entryId, userId },
		});
	},

	/**
	 * Get all work entries for a user with optional filters and pagination
	 */
	async getAll(userId: string, filters?: GetWorkEntriesInput) {
		return await prisma.workEntry.findMany({
			where: {
				userId,
				...(filters?.clientId && { clientId: filters.clientId }),
				...(filters?.status && { status: filters.status }),
				...((filters?.startDate || filters?.endDate) && {
					date: {
						...(filters?.startDate && { gte: filters.startDate }),
						...(filters?.endDate && { lte: filters.endDate }),
					},
				}),
			},
			include: {
				client: {
					select: { id: true, name: true },
				},
			},
			orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
			...(filters?.skip !== undefined && { skip: filters.skip }),
			...(filters?.take !== undefined && { take: filters.take }),
		});
	},

	/**
	 * Get all entries for a specific client, optionally filtered by status
	 */
	async getByClient(
		userId: string,
		clientId: string,
		status?: WorkEntryStatus
	) {
		return await prisma.workEntry.findMany({
			where: {
				userId,
				clientId,
				...(status && { status }),
			},
			include: {
				client: {
					select: { id: true, name: true },
				},
			},
			orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
		});
	},

	/**
	 * Get UNBILLED entries for a specific client (for invoice generation)
	 */
	async getUnbilledByClient(userId: string, clientId: string) {
		return await prisma.workEntry.findMany({
			where: {
				userId,
				clientId,
				status: WorkEntryStatus.UNBILLED,
			},
			include: {
				client: {
					select: { id: true, name: true },
				},
			},
			orderBy: [{ date: 'asc' }],
		});
	},
};
