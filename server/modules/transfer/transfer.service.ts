import prisma from '@/lib/prisma';
import { CreateTransferInput, GetTransfersInput } from './transfer.types';
import { CategoryService } from '../category/category.service';

export const TransferService = {
	/**
	 * Create a new transfer with optional fee
	 *
	 * Fee handling:
	 * - Source account is debited: amount + fee
	 * - Destination account is credited: amount only
	 * - Fee is recorded as an expense under "Bank Fees" category
	 */
	async createTransfer(userId: string, data: CreateTransferInput) {
		const fee = data.fee || 0;

		return await prisma.$transaction(async (tx) => {
			// 1. Create Transfer Record (including fee for audit trail)
			const transfer = await tx.transfer.create({
				data: {
					amount: data.amount,
					fee: fee,
					date: data.date,
					description: data.description,
					fromAccountId: data.fromAccountId,
					toAccountId: data.toAccountId,
					userId,
				},
			});

			// 2. Debit Source Account (amount only - fee handled separately)
			await tx.account.update({
				where: { id: data.fromAccountId, userId },
				data: { balance: { decrement: data.amount } },
			});

			// 3. Credit Destination Account
			await tx.account.update({
				where: { id: data.toAccountId, userId },
				data: { balance: { increment: data.amount } },
			});

			// 4. Handle Fee (if any)
			if (fee > 0) {
				// Get/Create 'Bank Fees' category
				const feeCategory = await CategoryService.getOrCreateCategory(
					userId,
					'Bank Fees',
					'EXPENSE'
				);

				// Create Expense Record for the fee
				await tx.expense.create({
					data: {
						amount: fee,
						description: `Transfer fee`,
						date: data.date,
						categoryId: feeCategory.id,
						accountId: data.fromAccountId,
						userId,
						isRecurring: false,
						notes: `Fee for transfer of $${data.amount} to ${data.toAccountId}`,
					},
				});

				// Debit Fee from Source Account
				await tx.account.update({
					where: { id: data.fromAccountId, userId },
					data: { balance: { decrement: fee } },
				});
			}

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
	 * Get a single transfer by ID
	 */
	async getTransferById(userId: string, transferId: string) {
		return await prisma.transfer.findUnique({
			where: { id: transferId, userId },
			include: {
				fromAccount: true,
				toAccount: true,
			},
		});
	},

	/**
	 * Delete a transfer and revert all balance changes
	 *
	 * Reverts:
	 * - Source account: credits back (amount + fee)
	 * - Destination account: debits back (amount)
	 * - Fee expense: deleted
	 */
	async deleteTransfer(userId: string, transferId: string) {
		return await prisma.$transaction(async (tx) => {
			const transfer = await tx.transfer.findUniqueOrThrow({
				where: { id: transferId, userId },
			});

			const fee = Number(transfer.fee) || 0;
			const amount = Number(transfer.amount);

			// 1. Revert Source Account (Credit back amount)
			await tx.account.update({
				where: { id: transfer.fromAccountId, userId },
				data: { balance: { increment: amount } },
			});

			// 2. Revert Destination Account (Debit back)
			await tx.account.update({
				where: { id: transfer.toAccountId, userId },
				data: { balance: { decrement: amount } },
			});

			// 3. Revert Fee if it was charged
			if (fee > 0) {
				// Credit fee back to source account
				await tx.account.update({
					where: { id: transfer.fromAccountId, userId },
					data: { balance: { increment: fee } },
				});

				// Delete the fee expense record
				// Note: We find by amount, date, and account to match the fee expense
				await tx.expense.deleteMany({
					where: {
						userId,
						accountId: transfer.fromAccountId,
						amount: transfer.fee,
						date: transfer.date,
						description: 'Transfer fee',
					},
				});
			}

			// 4. Delete Transfer Record
			return await tx.transfer.delete({
				where: { id: transferId, userId },
			});
		});
	},
};
