import prisma from '@/lib/prisma';
import { CreatePaymentInput, GetPaymentsInput } from './payment.types';
import { CategoryService } from '../category/category.service';

export const PaymentService = {
	/**
	 * Create a new liability payment
	 *
	 * Accounting logic:
	 * - Asset account: balance -= (amount + fee) — cash leaves
	 * - Liability account: balance -= amount — debt reduces
	 * - Fee (if any): recorded as expense under "Bank Fees" category
	 */
	async createPayment(userId: string, data: CreatePaymentInput) {
		const fee = data.fee || 0;

		return await prisma.$transaction(async (tx) => {
			// Verify source is an asset account
			const fromAccount = await tx.account.findUniqueOrThrow({
				where: { id: data.fromAccountId, userId },
			});

			if (fromAccount.isLiability) {
				throw new Error('Source account must be an asset account, not a liability');
			}

			// Verify destination is a liability account
			const toLiability = await tx.account.findUniqueOrThrow({
				where: { id: data.toLiabilityId, userId },
			});

			if (!toLiability.isLiability) {
				throw new Error('Destination must be a liability account');
			}

			// 1. Create Transfer Record (stores as transfer for consistency)
			const transfer = await tx.transfer.create({
				data: {
					amount: data.amount,
					fee: fee,
					date: data.date,
					description: data.description,
					fromAccountId: data.fromAccountId,
					toAccountId: data.toLiabilityId,
					userId,
				},
			});

			// 2. Deduct from asset account (amount only, fee handled separately)
			await tx.account.update({
				where: { id: data.fromAccountId, userId },
				data: {
					balance: { decrement: data.amount },
				},
			});

			// 3. Reduce liability balance (debt goes down)
			await tx.account.update({
				where: { id: data.toLiabilityId, userId },
				data: {
					balance: { decrement: data.amount },
				},
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
						description: 'Payment fee',
						date: data.date,
						categoryId: feeCategory.id,
						accountId: data.fromAccountId,
						userId,
						isRecurring: false,
						notes: `Fee for payment of $${data.amount} to ${toLiability.name}`,
					},
				});

				// Deduct fee from source asset account
				await tx.account.update({
					where: { id: data.fromAccountId, userId },
					data: {
						balance: { decrement: fee },
					},
				});
			}

			return transfer;
		});
	},

	/**
	 * Get all payments (transfers to liability accounts)
	 */
	async getPayments(userId: string, filters?: GetPaymentsInput) {
		return await prisma.transfer.findMany({
			where: {
				userId,
				toAccount: {
					isLiability: true,
				},
				date: {
					gte: filters?.startDate,
					lte: filters?.endDate,
				},
				toAccountId: filters?.liabilityId || undefined,
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
	 * Get a single payment by ID
	 */
	async getPaymentById(userId: string, paymentId: string) {
		return await prisma.transfer.findUnique({
			where: {
				id: paymentId,
				userId,
				toAccount: {
					isLiability: true,
				},
			},
			include: {
				fromAccount: true,
				toAccount: true,
			},
		});
	},

	/**
	 * Delete a payment and revert all balance changes
	 *
	 * Reverts:
	 * - Asset account: credits back (amount + fee)
	 * - Liability account: debits back (amount) — debt increases
	 * - Fee expense: deleted
	 */
	async deletePayment(userId: string, paymentId: string) {
		return await prisma.$transaction(async (tx) => {
			const payment = await tx.transfer.findUniqueOrThrow({
				where: { id: paymentId, userId },
				include: {
					fromAccount: true,
					toAccount: true,
				},
			});

			// Verify this is actually a payment (to a liability)
			if (!payment.toAccount.isLiability) {
				throw new Error('This is not a liability payment');
			}

			const fee = Number(payment.fee) || 0;
			const amount = Number(payment.amount);

			// 1. Revert asset account (credit back amount)
			await tx.account.update({
				where: { id: payment.fromAccountId, userId },
				data: {
					balance: { increment: amount },
				},
			});

			// 2. Revert liability account (debt increases back)
			await tx.account.update({
				where: { id: payment.toAccountId, userId },
				data: {
					balance: { increment: amount },
				},
			});

			// 3. Revert fee if it was charged
			if (fee > 0) {
				// Credit fee back to source account
				await tx.account.update({
					where: { id: payment.fromAccountId, userId },
					data: {
						balance: { increment: fee },
					},
				});

				// Delete the fee expense record
				await tx.expense.deleteMany({
					where: {
						userId,
						accountId: payment.fromAccountId,
						amount: payment.fee,
						date: payment.date,
						description: 'Payment fee',
					},
				});
			}

			// 4. Delete the transfer/payment record
			return await tx.transfer.delete({
				where: { id: paymentId, userId },
			});
		});
	},
};
