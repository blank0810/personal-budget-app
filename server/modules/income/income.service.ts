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
							parentIncomeId: created.id,
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
								parentIncomeId: created.id,
								efGoalId: efGoal.id,
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

			// Compute deductions for email breakdown
			const deductions: {
				tithe?: { amount: number; percentage: number };
				emergencyFund?: { amount: number; percentage: number };
			} = {};

			if (data.titheEnabled && data.tithePercentage && accountId) {
				// Check if account is asset (not liability) — same condition as tithe logic above
				const acc = await prisma.account.findUnique({
					where: { id: accountId },
					select: { isLiability: true },
				});
				if (acc && !acc.isLiability) {
					deductions.tithe = {
						amount: data.amount * (data.tithePercentage / 100),
						percentage: data.tithePercentage,
					};
				}
			}

			if (data.emergencyFundEnabled && data.emergencyFundPercentage && accountId) {
				const acc = await prisma.account.findUnique({
					where: { id: accountId },
					select: { isLiability: true },
				});
				if (acc && !acc.isLiability) {
					// Only include if there's an active EF goal with linked account
					const efGoal = await prisma.goal.findFirst({
						where: {
							userId,
							isEmergencyFund: true,
							status: 'ACTIVE',
							linkedAccountId: { not: null },
						},
						select: { id: true },
					});
					if (efGoal) {
						deductions.emergencyFund = {
							amount: data.amount * (data.emergencyFundPercentage / 100),
							percentage: data.emergencyFundPercentage,
						};
					}
				}
			}

			NotificationService.sendIncomeNotification(
				userId,
				{
					amount: data.amount,
					description: data.description || null,
					categoryName,
				},
				accountInfo,
				Object.keys(deductions).length > 0 ? deductions : undefined
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
	 * Update an income entry.
	 *
	 * The strategy is "fully reverse, then re-apply":
	 *   1. Reverse all child transfers (tithe / EF) — credit fromAccount,
	 *      debit toAccount, decrement any linked EF goal, delete the row.
	 *   2. Reverse the parent income's effect on its old account.
	 *   3. Apply the income row update.
	 *   4. Re-apply the parent income's effect on the new (or same) account.
	 *   5. Recreate child transfers if tithe / EF are still enabled, sized
	 *      against the new amount.
	 *
	 * This is symmetric to `_deleteIncomeInTx` followed by `createIncome`
	 * collapsed into one transaction. It guarantees Account.balance and the
	 * walked transaction trail stay in sync — without it, child transfers
	 * keep their original amount even when the parent changes, which would
	 * silently desync the global ledger tripwire.
	 */
	async updateIncome(userId: string, data: UpdateIncomeInput) {
		const { id, ...updateData } = data;

		return await prisma.$transaction(async (tx) => {
			const oldIncome = await tx.income.findUniqueOrThrow({
				where: { id, userId },
				include: { childTransfers: true },
			});

			// 1. Reverse existing child transfers symmetric to delete path.
			for (const child of oldIncome.childTransfers) {
				await tx.account.update({
					where: { id: child.fromAccountId, userId },
					data: { balance: { increment: child.amount } },
				});
				await tx.account.update({
					where: { id: child.toAccountId, userId },
					data: { balance: { decrement: child.amount } },
				});
				if (child.efGoalId) {
					await tx.goal.update({
						where: { id: child.efGoalId },
						data: { currentAmount: { decrement: child.amount } },
					});
				}
				await tx.transfer.delete({ where: { id: child.id } });
			}

			// 2. Reverse the parent income's effect on its old account.
			if (oldIncome.accountId) {
				const oldAccount = await tx.account.findUnique({
					where: { id: oldIncome.accountId, userId },
					select: { isLiability: true },
				});
				await tx.account.update({
					where: { id: oldIncome.accountId, userId },
					data: {
						balance: oldAccount?.isLiability
							? { increment: oldIncome.amount } // liability: revert = add back debt
							: { decrement: oldIncome.amount }, // asset: revert = subtract
					},
				});
			}

			// 3. Apply the row update (amount, accountId, description, …).
			//    Child-transfer fields (titheEnabled etc.) aren't stored on
			//    Income — they're inferred from the existence of children —
			//    but they ARE in the input payload, so strip them off the
			//    Prisma data shape.
			const {
				titheEnabled: _t,
				tithePercentage: _tp,
				emergencyFundEnabled: _ef,
				emergencyFundPercentage: _efp,
				categoryName: _cn,
				...prismaUpdate
			} = updateData;
			const updatedIncome = await tx.income.update({
				where: { id, userId },
				data: prismaUpdate,
			});

			const newAccountId = updatedIncome.accountId;
			const newAmount = updatedIncome.amount.toNumber();
			const newDate = updatedIncome.date;
			const newDescription = updatedIncome.description;

			// 4. Re-apply the parent income on the (possibly new) account.
			if (newAccountId) {
				const newAccount = await tx.account.findUnique({
					where: { id: newAccountId, userId },
					select: { isLiability: true },
				});
				await tx.account.update({
					where: { id: newAccountId, userId },
					data: {
						balance: newAccount?.isLiability
							? { decrement: newAmount } // liability: income/payment reduces debt
							: { increment: newAmount }, // asset: income raises balance
					},
				});

				// 5. Recreate child transfers if still enabled (asset accounts
				//    only — tithe/EF on liability income wouldn't make sense).
				const isLiability = newAccount?.isLiability ?? false;
				const titheEnabled = updateData.titheEnabled ?? false;
				const tithePercentage = updateData.tithePercentage;

				if (
					titheEnabled &&
					tithePercentage &&
					tithePercentage > 0 &&
					!isLiability
				) {
					const titheAmount = newAmount * (tithePercentage / 100);

					// Find or create Tithes account (mirror createIncome).
					let titheAccount = await tx.account.findFirst({
						where: { userId, type: AccountType.TITHE },
					});
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
								type: AccountType.TITHE,
								balance: 0,
								currency: 'USD',
							},
						});
					}

					await tx.transfer.create({
						data: {
							amount: titheAmount,
							date: newDate,
							description: `Tithe for ${newDescription || 'Income'}`,
							fromAccountId: newAccountId,
							toAccountId: titheAccount.id,
							parentIncomeId: updatedIncome.id,
							userId,
						},
					});

					await tx.account.update({
						where: { id: newAccountId, userId },
						data: { balance: { decrement: titheAmount } },
					});
					await tx.account.update({
						where: { id: titheAccount.id, userId },
						data: { balance: { increment: titheAmount } },
					});
				}

				const efEnabled = updateData.emergencyFundEnabled ?? false;
				const efPercentage = updateData.emergencyFundPercentage;

				if (
					efEnabled &&
					efPercentage &&
					efPercentage > 0 &&
					!isLiability
				) {
					const efAmount = newAmount * (efPercentage / 100);

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
						await tx.transfer.create({
							data: {
								amount: efAmount,
								date: newDate,
								description: `Emergency Fund contribution for ${
									newDescription || 'Income'
								}`,
								fromAccountId: newAccountId,
								toAccountId: efGoal.linkedAccountId,
								parentIncomeId: updatedIncome.id,
								efGoalId: efGoal.id,
								userId,
							},
						});

						await tx.account.update({
							where: { id: newAccountId, userId },
							data: { balance: { decrement: efAmount } },
						});
						await tx.account.update({
							where: { id: efGoal.linkedAccountId, userId },
							data: { balance: { increment: efAmount } },
						});
						await tx.goal.update({
							where: { id: efGoal.id },
							data: { currentAmount: { increment: efAmount } },
						});
					}
				}
			}

			return updatedIncome;
		});
	},

	/**
	 * Delete an income entry inside an existing Prisma transaction.
	 * Reverses the main account balance AND any auto-created child transfers
	 * (tithe / emergency-fund). Used by the single-row `deleteIncome` wrapper
	 * and by `TransactionService.bulkDelete`.
	 */
	async _deleteIncomeInTx(
		tx: Prisma.TransactionClient,
		userId: string,
		incomeId: string
	) {
		const income = await tx.income.findUniqueOrThrow({
			where: { id: incomeId, userId },
			include: {
				childTransfers: true,
			},
		});

		// Reverse child transfers (tithe, emergency fund) first.
		// Each child moved money fromAccount -> toAccount; reversing means
		// crediting fromAccount and debiting toAccount, plus decrementing any
		// linked EF goal's currentAmount, then deleting the Transfer row.
		for (const child of income.childTransfers) {
			await tx.account.update({
				where: { id: child.fromAccountId, userId },
				data: { balance: { increment: child.amount } },
			});
			await tx.account.update({
				where: { id: child.toAccountId, userId },
				data: { balance: { decrement: child.amount } },
			});
			if (child.efGoalId) {
				await tx.goal.update({
					where: { id: child.efGoalId },
					data: { currentAmount: { decrement: child.amount } },
				});
			}
			await tx.transfer.delete({ where: { id: child.id } });
		}

		if (income.accountId) {
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
	},

	/**
	 * Delete an income entry (single-row wrapper).
	 */
	async deleteIncome(userId: string, incomeId: string) {
		return await prisma.$transaction((tx) =>
			IncomeService._deleteIncomeInTx(tx, userId, incomeId)
		);
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
