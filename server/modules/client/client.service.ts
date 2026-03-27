import prisma from '@/lib/prisma';
import { CreateClientInput, UpdateClientInput } from './client.types';
import { InvoiceStatus } from '@prisma/client';

export const ClientService = {
	/**
	 * Create a new client for a user
	 */
	async create(userId: string, data: CreateClientInput) {
		// If no currency provided, default to user's currency
		let currency = data.currency;
		if (!currency) {
			const user = await prisma.user.findUniqueOrThrow({
				where: { id: userId },
				select: { currency: true },
			});
			currency = user.currency;
		}

		return await prisma.client.create({
			data: {
				name: data.name,
				email: data.email || null,
				phone: data.phone || null,
				address: data.address || null,
				defaultRate: data.defaultRate ?? null,
				currency,
				notes: data.notes || null,
				userId,
			},
		});
	},

	/**
	 * Update client fields — only if the client belongs to the user
	 */
	async update(userId: string, data: UpdateClientInput) {
		const { id, ...updateData } = data;

		return await prisma.client.update({
			where: { id, userId },
			data: {
				...(updateData.name !== undefined && { name: updateData.name }),
				...(updateData.email !== undefined && {
					email: updateData.email || null,
				}),
				...(updateData.phone !== undefined && {
					phone: updateData.phone || null,
				}),
				...(updateData.address !== undefined && {
					address: updateData.address || null,
				}),
				...(updateData.defaultRate !== undefined && {
					defaultRate: updateData.defaultRate ?? null,
				}),
				...(updateData.currency !== undefined && {
					currency: updateData.currency,
				}),
				...(updateData.notes !== undefined && {
					notes: updateData.notes || null,
				}),
			},
		});
	},

	/**
	 * Soft-archive a client
	 */
	async archive(userId: string, clientId: string) {
		return await prisma.client.update({
			where: { id: clientId, userId },
			data: { isArchived: true },
		});
	},

	/**
	 * Restore an archived client
	 */
	async restore(userId: string, clientId: string) {
		return await prisma.client.update({
			where: { id: clientId, userId },
			data: { isArchived: false },
		});
	},

	/**
	 * List all clients for a user with unbilled work entry stats
	 */
	async getAll(userId: string, includeArchived = false) {
		const clients = await prisma.client.findMany({
			where: {
				userId,
				...(includeArchived ? {} : { isArchived: false }),
			},
			include: {
				_count: { select: { workEntries: true, invoices: true } },
			},
			orderBy: { name: 'asc' },
		});

		// Get unbilled totals grouped by client
		const unbilledTotals = await prisma.workEntry.groupBy({
			by: ['clientId'],
			where: { userId, status: 'UNBILLED' },
			_sum: { amount: true },
			_count: true,
		});

		const unbilledMap = new Map(
			unbilledTotals.map((u) => [
				u.clientId,
				{
					count: u._count,
					total: u._sum.amount?.toNumber() ?? 0,
				},
			])
		);

		return clients.map((client) => ({
			...client,
			unbilled: unbilledMap.get(client.id) ?? { count: 0, total: 0 },
		}));
	},

	/**
	 * Get a single client with full stats (unbilled, invoiced, paid, outstanding)
	 */
	async getById(userId: string, clientId: string) {
		const client = await prisma.client.findUnique({
			where: { id: clientId, userId },
			include: {
				_count: { select: { workEntries: true, invoices: true } },
			},
		});

		if (!client) return null;

		// Unbilled work entries: count, total, and oldest date
		const unbilledAgg = await prisma.workEntry.aggregate({
			where: { clientId, userId, status: 'UNBILLED' },
			_sum: { amount: true },
			_count: true,
			_min: { date: true },
		});

		// Invoice totals grouped by status
		const invoiceStats = await prisma.invoice.groupBy({
			by: ['status'],
			where: { clientId, userId },
			_sum: { totalAmount: true },
		});

		const invoiceMap = new Map(
			invoiceStats.map((s) => [
				s.status,
				s._sum.totalAmount?.toNumber() ?? 0,
			])
		);

		const totalInvoiced = invoiceStats.reduce(
			(sum, s) => sum + (s._sum.totalAmount?.toNumber() ?? 0),
			0
		);

		return {
			...client,
			unbilled: {
				count: unbilledAgg._count,
				total: unbilledAgg._sum.amount?.toNumber() ?? 0,
				oldestDate: unbilledAgg._min.date ?? null,
			},
			totalInvoiced,
			totalPaid: invoiceMap.get(InvoiceStatus.PAID) ?? 0,
			outstanding:
				(invoiceMap.get(InvoiceStatus.SENT) ?? 0) +
				(invoiceMap.get(InvoiceStatus.OVERDUE) ?? 0),
		};
	},

	/**
	 * Hard-delete a client. Will fail if work entries exist (Restrict FK).
	 * Caller should catch and suggest archiving instead.
	 */
	async delete(userId: string, clientId: string) {
		return await prisma.client.delete({
			where: { id: clientId, userId },
		});
	},
};
