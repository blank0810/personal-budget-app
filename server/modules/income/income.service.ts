import prisma from '@/lib/prisma';
import {
	CreateIncomeInput,
	GetIncomesInput,
	UpdateIncomeInput,
} from './income.types';
import { CategoryService } from '../category/category.service';
import { AccountType } from '@prisma/client';
import { subMonths, format } from 'date-fns';

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

				// Handle Emergency Fund (only for asset accounts with EF account)
				if (
					data.emergencyFundEnabled &&
					data.emergencyFundPercentage &&
					!account?.isLiability
				) {
					const efAmount =
						data.amount * (data.emergencyFundPercentage / 100);

					// Find Emergency Fund account (must exist - user opted in)
					const efAccount = await tx.account.findFirst({
						where: {
							userId,
							type: AccountType.EMERGENCY_FUND,
							isArchived: false,
						},
					});

					if (efAccount) {
						// Create Transfer record for audit trail
						await tx.transfer.create({
							data: {
								amount: efAmount,
								date: data.date,
								description: `Emergency Fund contribution for ${data.description || 'Income'}`,
								fromAccountId: data.accountId,
								toAccountId: efAccount.id,
								userId,
							},
						});

						// Deduct from income account
						await tx.account.update({
							where: { id: data.accountId, userId },
							data: { balance: { decrement: efAmount } },
						});

						// Add to Emergency Fund
						await tx.account.update({
							where: { id: efAccount.id, userId },
							data: { balance: { increment: efAmount } },
						});
					}
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

	/**
	 * Analyze income stability to suggest Emergency Fund percentage
	 * Uses Coefficient of Variation (CV) to measure income consistency
	 */
	async analyzeIncomeStability(
		userId: string,
		months: number = 6
	): Promise<{
		suggestedPercentage: number;
		reasoning: string;
		isStable: boolean;
		averageIncome: number;
		coefficientOfVariation: number;
	}> {
		const startDate = subMonths(new Date(), months);

		const incomes = await prisma.income.findMany({
			where: {
				userId,
				date: { gte: startDate },
			},
			select: { amount: true, date: true },
		});

		// Group by month
		const monthlyTotals = new Map<string, number>();
		incomes.forEach((income) => {
			const monthKey = format(income.date, 'yyyy-MM');
			const current = monthlyTotals.get(monthKey) || 0;
			monthlyTotals.set(monthKey, current + income.amount.toNumber());
		});

		const values = Array.from(monthlyTotals.values());

		if (values.length < 2) {
			return {
				suggestedPercentage: 10,
				reasoning: 'Not enough income history. Using default 10%.',
				isStable: false,
				averageIncome: values[0] || 0,
				coefficientOfVariation: 0,
			};
		}

		// Calculate statistics
		const mean = values.reduce((a, b) => a + b, 0) / values.length;
		const variance =
			values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
			values.length;
		const stdDev = Math.sqrt(variance);
		const coefficientOfVariation = (stdDev / mean) * 100;

		// CV < 15% = Very stable, CV < 30% = Moderate, CV >= 30% = Variable
		let suggestedPercentage: number;
		let reasoning: string;
		let isStable: boolean;

		if (coefficientOfVariation < 15) {
			suggestedPercentage = 15;
			reasoning = `Your income is very consistent (${coefficientOfVariation.toFixed(0)}% variation). You can safely save 15% to your emergency fund.`;
			isStable = true;
		} else if (coefficientOfVariation < 30) {
			suggestedPercentage = 10;
			reasoning = `Your income has moderate variation (${coefficientOfVariation.toFixed(0)}% variation). A 10% contribution balances savings with flexibility.`;
			isStable = true;
		} else {
			suggestedPercentage = 5;
			reasoning = `Your income varies significantly (${coefficientOfVariation.toFixed(0)}% variation). Start with 5% to maintain cash flow flexibility.`;
			isStable = false;
		}

		return {
			suggestedPercentage,
			reasoning,
			isStable,
			averageIncome: mean,
			coefficientOfVariation,
		};
	},
};
