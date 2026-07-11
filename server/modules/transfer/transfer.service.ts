import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
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
			// Fetch both accounts to check liability status
			const [fromAccount, toAccount] = await Promise.all([
				tx.account.findUniqueOrThrow({
					where: { id: data.fromAccountId, userId },
				}),
				tx.account.findUniqueOrThrow({
					where: { id: data.toAccountId, userId },
				}),
			]);

			// 1. Create fee Expense FIRST (if fee > 0) so the Transfer row
			// can hold the feeExpenseId FK. Prevents the ambiguous deleteMany
			// match that P0-2 solves.
			let feeExpenseId: string | null = null;
			if (fee > 0) {
				const feeCategory = await CategoryService.getOrCreateCategory(
					userId,
					'Bank Fees',
					'EXPENSE'
				);

				const feeExpense = await tx.expense.create({
					data: {
						amount: fee,
						description: `Transfer fee`,
						date: data.date,
						categoryId: feeCategory.id,
						accountId: data.fromAccountId,
						userId,
						notes: `Fee for transfer of $${data.amount} to ${data.toAccountId}`,
					},
				});
				feeExpenseId = feeExpense.id;
			}

			// 2. Create Transfer Record (with feeExpenseId FK when applicable)
			const transfer = await tx.transfer.create({
				data: {
					amount: data.amount,
					fee: fee,
					date: data.date,
					description: data.description,
					fromAccountId: data.fromAccountId,
					toAccountId: data.toAccountId,
					feeExpenseId,
					userId,
				},
			});

			// 3. Update Source Account
			// - Asset: decrement (money leaves)
			// - Liability: increment (borrowing more, debt increases)
			await tx.account.update({
				where: { id: data.fromAccountId, userId },
				data: {
					balance: fromAccount.isLiability
						? { increment: data.amount }
						: { decrement: data.amount },
				},
			});

			// 4. Update Destination Account
			// - Asset: increment (money arrives)
			// - Liability: decrement (paying off debt, debt decreases)
			await tx.account.update({
				where: { id: data.toAccountId, userId },
				data: {
					balance: toAccount.isLiability
						? { decrement: data.amount }
						: { increment: data.amount },
				},
			});

			// 5. Debit Fee from Source Account
			// - Asset: decrement (fee deducted)
			// - Liability: increment (fee adds to debt)
			if (fee > 0) {
				await tx.account.update({
					where: { id: data.fromAccountId, userId },
					data: {
						balance: fromAccount.isLiability
							? { increment: fee }
							: { decrement: fee },
					},
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
	 * Delete a transfer and revert all balance changes, inside an existing
	 * Prisma transaction. Used by the single-row `deleteTransfer` wrapper and
	 * by `TransactionService.bulkDelete`.
	 */
	async _deleteTransferInTx(
		tx: Prisma.TransactionClient,
		userId: string,
		transferId: string
	) {
		const transfer = await tx.transfer.findUniqueOrThrow({
			where: { id: transferId, userId },
			include: {
				fromAccount: true,
				toAccount: true,
			},
		});

		// Pass Decimals straight through to increment/decrement. Prisma accepts
		// them natively; coercing via Number() lost sub-cent precision on
		// values with non-terminating binary representations (e.g. 0.1, 0.3).
		const hasFee = transfer.fee.gt(0);

		// 1. Revert Source Account
		await tx.account.update({
			where: { id: transfer.fromAccountId, userId },
			data: {
				balance: transfer.fromAccount.isLiability
					? { decrement: transfer.amount }
					: { increment: transfer.amount },
			},
		});

		// 2. Revert Destination Account
		await tx.account.update({
			where: { id: transfer.toAccountId, userId },
			data: {
				balance: transfer.toAccount.isLiability
					? { increment: transfer.amount }
					: { decrement: transfer.amount },
			},
		});

		// 3. Revert Fee if it was charged. feeExpenseId FK points to the exact
		// Expense row created alongside this transfer (P0-2); fall back to null
		// for rows backfilled without a match.
		if (hasFee) {
			await tx.account.update({
				where: { id: transfer.fromAccountId, userId },
				data: {
					balance: transfer.fromAccount.isLiability
						? { decrement: transfer.fee }
						: { increment: transfer.fee },
				},
			});

			if (transfer.feeExpenseId) {
				await tx.expense.delete({
					where: { id: transfer.feeExpenseId, userId },
				});
			}
		}

		// 4. Delete Transfer Record
		return await tx.transfer.delete({
			where: { id: transferId, userId },
		});
	},

	/**
	 * Delete a transfer (single-row wrapper).
	 */
	async deleteTransfer(userId: string, transferId: string) {
		return await prisma.$transaction((tx) =>
			TransferService._deleteTransferInTx(tx, userId, transferId)
		);
	},
};
