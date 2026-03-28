import prisma from '@/lib/prisma';
import {
	CreateIncomeInput,
	GetIncomesInput,
	GetPaginatedIncomesInput,
	UpdateIncomeInput,
} from './income.types';
import { CategoryService } from '../category/category.service';
import { NotificationService } from '@/server/modules/notification/notification.service';
import { AccountType, Prisma } from '@prisma/client';
import { subMonths, format } from 'date-fns';

export const IncomeService = {
	/**
	 * Create a new income entry
	 */
	async createIncome(userId: string, data: CreateIncomeInput) {
		// Transaction to ensure account balance is updated if accountId is provided
		const income = await prisma.$transaction(async (tx) => {
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

			const created = await tx.income.create({
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

				// Handle Emergency Fund (only for asset accounts with EF goal)
				if (
					data.emergencyFundEnabled &&
					data.emergencyFundPercentage &&
					!account?.isLiability
				) {
					const efAmount =
						data.amount * (data.emergencyFundPercentage / 100);

					// Find Emergency Fund goal with linked account
					const efGoal = await tx.goal.findFirst({
						where: {
							userId,
							isEmergencyFund: true,
							status: 'ACTIVE',
							linkedAccountId: { not: null },
						},
						select: { id: true, linkedAccountId: true },
					});

					if (efGoal?.linkedAccountId) {
						// Create Transfer record for audit trail
						await tx.transfer.create({
							data: {
								amount: efAmount,
								date: data.date,
								description: `Emergency Fund contribution for ${data.description || 'Income'}`,
								fromAccountId: data.accountId,
								toAccountId: efGoal.linkedAccountId,
								userId,
							},
						});

						// Deduct from income account
						await tx.account.update({
							where: { id: data.accountId, userId },
							data: { balance: { decrement: efAmount } },
						});

						// Add to Emergency Fund linked account
						await tx.account.update({
							where: { id: efGoal.linkedAccountId, userId },
							data: { balance: { increment: efAmount } },
						});

						// Update goal's currentAmount
						await tx.goal.update({
							where: { id: efGoal.id },
							data: { currentAmount: { increment: efAmount } },
						});
					}
				}
			}

			return created;
		});

		// Fire-and-forget income notification (after transaction commits)
		try {
			const categoryId = data.categoryId;
			const accountId = data.accountId;

			let categoryName = 'Uncategorized';
			if (categoryId) {
				const cat = await prisma.category.findUnique({
					where: { id: categoryId },
					select: { name: true },
				});
				if (cat) categoryName = cat.name;
			}

			let accountInfo: { name: string; newBalance: number } | null = null;
			if (accountId) {
				const acc = await prisma.account.findUnique({
					where: { id: accountId },
					select: { name: true, balance: true },
				});
				if (acc) {
					accountInfo = {
						name: acc.name,
						newBalance: acc.balance.toNumber(),
					};
				}
			}

			NotificationService.sendIncomeNotification(
				userId,
				{
					amount: data.amount,
					description: data.description || null,
					categoryName,
				},
				accountInfo
			).catch(() => {});
		} catch {
			// Notification failure must never fail the main operation
		}

		return income;
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
	 * Get monthly totals for a given year (for the month overview grid)
	 */
	async getMonthlyTotals(userId: string, year: number) {
		const startDate = new Date(year, 0, 1);
		const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

		const incomes = await prisma.income.findMany({
			where: {
				userId,
				date: { gte: startDate, lte: endDate },
			},
			select: { amount: true, date: true },
		});

		// Aggregate by month
		const monthlyTotals: { month: number; total: number; count: number }[] = [];
		for (let m = 0; m < 12; m++) {
			monthlyTotals.push({ month: m, total: 0, count: 0 });
		}

		for (const income of incomes) {
			const month = income.date.getMonth();
			monthlyTotals[month].total += income.amount.toNumber();
			monthlyTotals[month].count += 1;
		}

		return monthlyTotals;
	},

	/**
	 * Get paginated incomes with optional filters, search, and sorting
	 */
	async getPaginatedIncomes(userId: string, filters?: GetPaginatedIncomesInput) {
		const page = filters?.page ?? 1;
		const pageSize = filters?.pageSize ?? 20;
		const skip = (page - 1) * pageSize;
		const sortBy = filters?.sortBy ?? 'date';
		const sortOrder = filters?.sortOrder ?? 'desc';

		const where: Prisma.IncomeWhereInput = {
			userId,
			...(filters?.categoryId && { categoryId: filters.categoryId }),
			...(filters?.accountId && { accountId: filters.accountId }),
			...(filters?.startDate || filters?.endDate
				? {
						date: {
							...(filters?.startDate && { gte: filters.startDate }),
							...(filters?.endDate && { lte: filters.endDate }),
						},
					}
				: {}),
			...(filters?.search && {
				OR: [
					{ description: { contains: filters.search, mode: 'insensitive' as const } },
					{ category: { name: { contains: filters.search, mode: 'insensitive' as const } } },
					{ account: { name: { contains: filters.search, mode: 'insensitive' as const } } },
				],
			}),
		};

		const orderBy =
			sortBy === 'categoryName'
				? { category: { name: sortOrder } }
				: sortBy === 'accountName'
					? { account: { name: sortOrder } }
					: { [sortBy]: sortOrder };

		const [data, total] = await prisma.$transaction([
			prisma.income.findMany({
				where,
				include: {
					category: true,
					account: true,
				},
				orderBy: [orderBy, { createdAt: 'desc' }],
				skip,
				take: pageSize,
			}),
			prisma.income.count({ where }),
		]);

		return { data, total };
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
