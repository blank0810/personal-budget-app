import prisma from '@/lib/prisma';
import {
	CreateIncomeInput,
	GetIncomesInput,
	UpdateIncomeInput,
} from './income.types';
import { CategoryService } from '../category/category.service';
import { AccountType } from '@prisma/client';

export const IncomeService = {
	/**
	 * Create a new income entry
	 */
	async createIncome(userId: string, data: CreateIncomeInput) {
		// Transaction to ensure account balance is updated if accountId is provided
		return await prisma.$transaction(async (tx) => {
			// Handle category: get existing or create new
			let categoryId = data.categoryId;

			if (!categoryId && data.categoryName) {
				// Create new category if categoryName is provided
				const category = await CategoryService.getOrCreateCategory(
					userId,
					data.categoryName,
					'INCOME'
				);
				categoryId = category.id;
			}

			if (!categoryId) {
				throw new Error('Category is required');
			}

			const income = await tx.income.create({
				data: {
					amount: data.amount,
					description: data.description,
					date: data.date,
					categoryId,
					accountId: data.accountId,
					isRecurring: data.isRecurring,
					recurringPeriod: data.recurringPeriod,
					userId,
				},
			});

			// If linked to an account, update the balance
			if (data.accountId) {
				// Check if this is a liability account (credit card, loan)
				const account = await tx.account.findUnique({
					where: { id: data.accountId, userId },
					select: { isLiability: true },
				});

				await tx.account.update({
					where: { id: data.accountId, userId },
					data: {
						balance: account?.isLiability
							? { decrement: data.amount } // Liability: income/payment reduces debt
							: { increment: data.amount }, // Asset: income increases balance
					},
				});

				// Handle Church Tithe (only for asset accounts, not liabilities)
				if (data.titheEnabled && data.tithePercentage && !account?.isLiability) {
					const titheAmount =
						data.amount * (data.tithePercentage / 100);

					// 1. Find or Create "Tithes" Account
					// Prioritize finding an account explicitly typed as TITHE
					let titheAccount = await tx.account.findFirst({
						where: { userId, type: AccountType.TITHE },
					});

					// Fallback: Find legacy Tithes account by name if no typed account exists
					if (!titheAccount) {
						titheAccount = await tx.account.findFirst({
							where: { userId, name: 'Tithes' },
						});
					}

					if (!titheAccount) {
						titheAccount = await tx.account.create({
							data: {
								userId,
								name: 'Tithes',
								type: AccountType.TITHE, // Enforce TITHE type for new accounts
								balance: 0,
								currency: 'USD',
							},
						});
					}

					// 2. Create Transfer from Main Account to Tithes Account
					await tx.transfer.create({
						data: {
							amount: titheAmount,
							date: data.date,
							description: `Tithe for ${
								data.description || 'Income'
							}`,
							fromAccountId: data.accountId,
							toAccountId: titheAccount.id,
							userId,
						},
					});

					// 3. Update Balances (Deduct from Main, Add to Tithes)
					// Deduct from Main (Income added full amount, now we remove tithe)
					await tx.account.update({
						where: { id: data.accountId, userId },
						data: { balance: { decrement: titheAmount } },
					});

					// Add to Tithes
					await tx.account.update({
						where: { id: titheAccount.id, userId },
						data: { balance: { increment: titheAmount } },
					});
				}
			}

			return income;
		});
	},

	/**
	 * Get all incomes for a user with optional filters
	 */
	async getIncomes(userId: string, filters?: GetIncomesInput) {
		return await prisma.income.findMany({
			where: {
				userId,
				date: {
					gte: filters?.startDate,
					lte: filters?.endDate,
				},
				categoryId: filters?.categoryId,
				accountId: filters?.accountId,
			},
			include: {
				category: true,
				account: true,
			},
			orderBy: {
				date: 'desc',
			},
		});
	},

	/**
	 * Get a single income by ID
	 */
	async getIncomeById(userId: string, incomeId: string) {
		return await prisma.income.findUnique({
			where: { id: incomeId, userId },
			include: {
				category: true,
				account: true,
			},
		});
	},

	/**
	 * Update an income entry
	 * Handles balance adjustments if amount or account changes
	 */
	async updateIncome(userId: string, data: UpdateIncomeInput) {
		const { id, ...updateData } = data;

		return await prisma.$transaction(async (tx) => {
			// 1. Get the old income to calculate balance difference
			const oldIncome = await tx.income.findUniqueOrThrow({
				where: { id, userId },
			});

			// 2. Update the income
			const updatedIncome = await tx.income.update({
				where: { id, userId },
				data: updateData,
			});

			// 3. Handle Balance Updates
			// Case A: Account didn't change, but amount might have
			if (
				!updateData.accountId ||
				updateData.accountId === oldIncome.accountId
			) {
				if (
					oldIncome.accountId &&
					updateData.amount &&
					updateData.amount !== oldIncome.amount.toNumber()
				) {
					const difference =
						updateData.amount - oldIncome.amount.toNumber();

					// Check if liability account
					const account = await tx.account.findUnique({
						where: { id: oldIncome.accountId, userId },
						select: { isLiability: true },
					});

					// For assets: more income = more balance (increment)
					// For liabilities: more income/payment = less debt (decrement)
					await tx.account.update({
						where: { id: oldIncome.accountId, userId },
						data: {
							balance: account?.isLiability
								? { decrement: difference }
								: { increment: difference },
						},
					});
				}
			}
			// Case B: Account changed
			else if (
				updateData.accountId &&
				updateData.accountId !== oldIncome.accountId
			) {
				// Revert old account balance
				if (oldIncome.accountId) {
					const oldAccount = await tx.account.findUnique({
						where: { id: oldIncome.accountId, userId },
						select: { isLiability: true },
					});

					await tx.account.update({
						where: { id: oldIncome.accountId, userId },
						data: {
							balance: oldAccount?.isLiability
								? { increment: oldIncome.amount } // Liability: revert = add back debt
								: { decrement: oldIncome.amount }, // Asset: revert = subtract
						},
					});
				}

				// Add to new account balance
				const newAccount = await tx.account.findUnique({
					where: { id: updateData.accountId, userId },
					select: { isLiability: true },
				});

				await tx.account.update({
					where: { id: updateData.accountId, userId },
					data: {
						balance: newAccount?.isLiability
							? { decrement: updateData.amount ?? oldIncome.amount } // Liability: income = reduce debt
							: { increment: updateData.amount ?? oldIncome.amount }, // Asset: income = add
					},
				});
			}

			return updatedIncome;
		});
	},

	/**
	 * Delete an income entry
	 * Reverts the account balance
	 */
	async deleteIncome(userId: string, incomeId: string) {
		return await prisma.$transaction(async (tx) => {
			const income = await tx.income.findUniqueOrThrow({
				where: { id: incomeId, userId },
			});

			if (income.accountId) {
				// Check if liability account
				const account = await tx.account.findUnique({
					where: { id: income.accountId, userId },
					select: { isLiability: true },
				});

				await tx.account.update({
					where: { id: income.accountId, userId },
					data: {
						balance: account?.isLiability
							? { increment: income.amount } // Liability: delete income = add back debt
							: { decrement: income.amount }, // Asset: delete income = subtract
					},
				});
			}

			return await tx.income.delete({
				where: { id: incomeId, userId },
			});
		});
	},
};
