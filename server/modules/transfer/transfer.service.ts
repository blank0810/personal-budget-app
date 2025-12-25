import prisma from '@/lib/prisma';
import { CreateTransferInput, GetTransfersInput } from './transfer.types';

export const TransferService = {
	/**
	 * Create a new transfer
	 * Atomic transaction: Create Transfer -> Debit From -> Credit To
	 */
	async createTransfer(userId: string, data: CreateTransferInput) {
		return await prisma.$transaction(async (tx) => {
			// 1. Create Transfer Record
			const transfer = await tx.transfer.create({
				data: {
					...data,
					userId,
				},
			});

			// 2. Debit Source Account
			await tx.account.update({
				where: { id: data.fromAccountId, userId },
				data: { balance: { decrement: data.amount } },
			});

			// 3. Credit Destination Account
			await tx.account.update({
				where: { id: data.toAccountId, userId },
				data: { balance: { increment: data.amount } },
			});

			return transfer;
		});
	},

	/**
	 * Get all transfers for a user
	 */
	async getTransfers(userId: string, filters?: GetTransfersInput) {
		return await prisma.transfer.findMany({
			where: {
				userId,
				date: {
					gte: filters?.startDate,
					lte: filters?.endDate,
				},
				OR: filters?.accountId
					? [
							{ fromAccountId: filters.accountId },
							{ toAccountId: filters.accountId },
					  ]
					: undefined,
			},
			include: {
				fromAccount: true,
				toAccount: true,
			},
			orderBy: {
				date: 'desc',
			},
		});
	},

	/**
	 * Delete a transfer
	 * Reverts the transaction: Credit From -> Debit To
	 */
	async deleteTransfer(userId: string, transferId: string) {
		return await prisma.$transaction(async (tx) => {
			const transfer = await tx.transfer.findUniqueOrThrow({
				where: { id: transferId, userId },
			});

			// 1. Revert Source Account (Credit back)
			await tx.account.update({
				where: { id: transfer.fromAccountId, userId },
				data: { balance: { increment: transfer.amount } },
			});

			// 2. Revert Destination Account (Debit back)
			await tx.account.update({
				where: { id: transfer.toAccountId, userId },
				data: { balance: { decrement: transfer.amount } },
			});

			// 3. Delete Transfer Record
			return await tx.transfer.delete({
				where: { id: transferId, userId },
			});
		});
	},
};
