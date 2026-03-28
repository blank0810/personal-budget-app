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

		// Use the client's billing currency for the entry
		const client = await prisma.client.findUniqueOrThrow({
			where: { id: data.clientId, userId },
			select: { currency: true },
		});

		return await prisma.workEntry.create({
			data: {
				description: data.description,
				date: data.date,
				quantity: data.quantity,
				unitPrice: data.unitPrice,
				amount,
				currency: client.currency,
				clientId: data.clientId,
				userId,
			},
			include: {
				client: {
					select: { id: true, name: true, currency: true },
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

		// If client is changing, update the currency to match the new client
		let currency = entry.currency;
		if (updateData.clientId && updateData.clientId !== entry.clientId) {
			const newClient = await prisma.client.findUniqueOrThrow({
				where: { id: updateData.clientId, userId },
				select: { currency: true },
			});
			currency = newClient.currency;
		}

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
				currency,
			},
			include: {
				client: {
					select: { id: true, name: true, currency: true },
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
	 * Get all work entries for a user with optional filters, pagination, and sorting
	 */
	async getAll(userId: string, filters?: GetWorkEntriesInput) {
		const page = filters?.page ?? 1;
		const pageSize = filters?.pageSize ?? 20;
		const skip = (page - 1) * pageSize;
		const sortBy = filters?.sortBy ?? 'date';
		const sortOrder = filters?.sortOrder ?? 'desc';

		const where = {
			userId,
			...(filters?.clientId && { clientId: filters.clientId }),
			...(filters?.status && { status: filters.status }),
			...(filters?.startDate || filters?.endDate
				? {
						date: {
							...(filters?.startDate && { gte: filters.startDate }),
							...(filters?.endDate && { lte: filters.endDate }),
						},
					}
				: {}),
		};

		const orderBy =
			sortBy === 'clientName'
				? { client: { name: sortOrder } }
				: { [sortBy]: sortOrder };

		const [data, total] = await prisma.$transaction([
			prisma.workEntry.findMany({
				where,
				include: {
					client: {
						select: { id: true, name: true, currency: true },
					},
				},
				orderBy: [orderBy, { createdAt: 'desc' }],
				skip,
				take: pageSize,
			}),
			prisma.workEntry.count({ where }),
		]);

		return { data, total };
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
					select: { id: true, name: true, currency: true },
				},
			},
			orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
		});
	},

	/**
	 * Get unbilled entry counts and totals grouped by client
	 */
	async getUnbilledCountsByClient(userId: string) {
		const results = await prisma.workEntry.groupBy({
			by: ['clientId'],
			where: { userId, status: 'UNBILLED' },
			_count: true,
			_sum: { amount: true },
		});

		const clientIds = results.map((r) => r.clientId);
		const clients = await prisma.client.findMany({
			where: { id: { in: clientIds } },
			select: { id: true, name: true },
		});

		const clientMap = new Map(clients.map((c) => [c.id, c.name]));

		return results.map((r) => ({
			clientId: r.clientId,
			clientName: clientMap.get(r.clientId) || 'Unknown',
			count: r._count,
			total: r._sum.amount?.toNumber() ?? 0,
		}));
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
					select: { id: true, name: true, currency: true },
				},
			},
			orderBy: [{ date: 'asc' }],
		});
	},
};
