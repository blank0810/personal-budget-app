import prisma from '@/lib/prisma';
import {
	CreateExpenseInput,
	GetExpensesInput,
	GetPaginatedExpensesInput,
	UpdateExpenseInput,
} from './expense.types';
import { CategoryService } from '../category/category.service';
import { NotificationService } from '@/server/modules/notification/notification.service';
import { Prisma } from '@prisma/client';

export const ExpenseService = {
	/**
	 * Create a new expense entry
	 */
	async createExpense(userId: string, data: CreateExpenseInput) {
		// If linking to a budget, capture the spent amount BEFORE this expense
		let prevSpent = 0;
		const budgetId = data.budgetId;
		if (budgetId) {
			const agg = await prisma.expense.aggregate({
				where: { budgetId, userId },
				_sum: { amount: true },
			});
			prevSpent = agg._sum.amount?.toNumber() ?? 0;
		}

		const expense = await prisma.$transaction(async (tx) => {
			// Handle category: get existing or create new
			let categoryId = data.categoryId;

			if (!categoryId && data.categoryName) {
				// Create new category if categoryName is provided
				const category = await CategoryService.getOrCreateCategory(
					userId,
					data.categoryName,
					'EXPENSE'
				);
				categoryId = category.id;
			}

			if (!categoryId) {
				throw new Error('Category is required');
			}

			const created = await tx.expense.create({
				data: {
					amount: data.amount,
					description: data.description,
					date: data.date,
					notes: data.notes,
					categoryId,
					accountId: data.accountId,
					budgetId: data.budgetId,
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
							? { increment: data.amount } // Liability: expense increases debt
							: { decrement: data.amount }, // Asset: expense decreases balance
					},
				});
			}

			return created;
		});

		// Fire-and-forget budget alert (after transaction commits)
		if (budgetId) {
			try {
				const budget = await prisma.budget.findUnique({
					where: { id: budgetId },
				});
				if (budget) {
					const budgetAmount = budget.amount.toNumber();
					const newSpent = prevSpent + data.amount;
					const prevPct = budgetAmount > 0 ? (prevSpent / budgetAmount) * 100 : 0;
					const newPct = budgetAmount > 0 ? (newSpent / budgetAmount) * 100 : 0;

					NotificationService.sendBudgetAlert(
						userId,
						{ id: budget.id, name: budget.name, amount: budgetAmount },
						newSpent,
						prevPct,
						newPct
					).catch(() => {});
				}
			} catch {
				// Notification failure must never fail the main operation
			}
		}

		return expense;
	},

	/**
	 * Get all expenses for a user with optional filters
	 */
	async getExpenses(userId: string, filters?: GetExpensesInput) {
		return await prisma.expense.findMany({
			where: {
				userId,
				date: {
					gte: filters?.startDate,
					lte: filters?.endDate,
				},
				categoryId: filters?.categoryId,
				accountId: filters?.accountId,
				budgetId: filters?.budgetId,
			},
			include: {
				category: true,
				account: true,
				budget: true,
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

		const expenses = await prisma.expense.findMany({
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

		for (const expense of expenses) {
			const month = expense.date.getMonth();
			monthlyTotals[month].total += expense.amount.toNumber();
			monthlyTotals[month].count += 1;
		}

		return monthlyTotals;
	},

	/**
	 * Get paginated expenses with optional filters, search, and sorting
	 */
	async getPaginatedExpenses(userId: string, filters?: GetPaginatedExpensesInput) {
		const page = filters?.page ?? 1;
		const pageSize = filters?.pageSize ?? 20;
		const skip = (page - 1) * pageSize;
		const sortBy = filters?.sortBy ?? 'date';
		const sortOrder = filters?.sortOrder ?? 'desc';

		const where: Prisma.ExpenseWhereInput = {
			userId,
			...(filters?.categoryId && { categoryId: filters.categoryId }),
			...(filters?.accountId && { accountId: filters.accountId }),
			...(filters?.budgetId && { budgetId: filters.budgetId }),
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
			prisma.expense.findMany({
				where,
				include: {
					category: true,
					account: true,
					budget: true,
				},
				orderBy: [orderBy, { createdAt: 'desc' }],
				skip,
				take: pageSize,
			}),
			prisma.expense.count({ where }),
		]);

		return { data, total };
	},

	/**
	 * Get a single expense by ID
	 */
	async getExpenseById(userId: string, expenseId: string) {
		return await prisma.expense.findUnique({
			where: { id: expenseId, userId },
			include: {
				category: true,
				account: true,
				budget: true,
			},
		});
	},

	/**
	 * Update an expense entry
	 * Handles balance adjustments if amount or account changes
	 */
	async updateExpense(userId: string, data: UpdateExpenseInput) {
		const { id, ...updateData } = data;
		const newBudgetId = updateData.budgetId;

		// If the updated expense is linked to a budget, capture previous spend
		let prevSpent = 0;
		let oldExpenseAmount = 0;
		if (newBudgetId) {
			const oldExpense = await prisma.expense.findUnique({
				where: { id, userId },
				select: { amount: true, budgetId: true },
			});
			oldExpenseAmount = oldExpense?.amount.toNumber() ?? 0;

			const agg = await prisma.expense.aggregate({
				where: { budgetId: newBudgetId, userId },
				_sum: { amount: true },
			});
			const totalCurrentSpent = agg._sum.amount?.toNumber() ?? 0;

			// If same budget, remove old amount to get the "before" state
			if (oldExpense?.budgetId === newBudgetId) {
				prevSpent = totalCurrentSpent - oldExpenseAmount;
			} else {
				prevSpent = totalCurrentSpent;
			}
		}

		const updatedExpense = await prisma.$transaction(async (tx) => {
			// 1. Get the old expense
			const oldExpense = await tx.expense.findUniqueOrThrow({
				where: { id, userId },
			});

			// 2. Update the expense
			const result = await tx.expense.update({
				where: { id, userId },
				data: updateData,
			});

			// 3. Handle Balance Updates
			// Case A: Account didn't change, but amount might have
			if (
				!updateData.accountId ||
				updateData.accountId === oldExpense.accountId
			) {
				if (
					oldExpense.accountId &&
					updateData.amount &&
					updateData.amount !== oldExpense.amount.toNumber()
				) {
					const difference =
						updateData.amount - oldExpense.amount.toNumber();

					// Check if liability account
					const account = await tx.account.findUnique({
						where: { id: oldExpense.accountId, userId },
						select: { isLiability: true },
					});

					// For assets: more expense = less balance (decrement)
					// For liabilities: more expense = more debt (increment)
					await tx.account.update({
						where: { id: oldExpense.accountId, userId },
						data: {
							balance: account?.isLiability
								? { increment: difference }
								: { decrement: difference },
						},
					});
				}
			}
			// Case B: Account changed
			else if (
				updateData.accountId &&
				updateData.accountId !== oldExpense.accountId
			) {
				// Refund old account
				if (oldExpense.accountId) {
					const oldAccount = await tx.account.findUnique({
						where: { id: oldExpense.accountId, userId },
						select: { isLiability: true },
					});

					await tx.account.update({
						where: { id: oldExpense.accountId, userId },
						data: {
							balance: oldAccount?.isLiability
								? { decrement: oldExpense.amount } // Liability: refund = reduce debt
								: { increment: oldExpense.amount }, // Asset: refund = add back
						},
					});
				}

				// Deduct from new account
				const newAccount = await tx.account.findUnique({
					where: { id: updateData.accountId, userId },
					select: { isLiability: true },
				});

				await tx.account.update({
					where: { id: updateData.accountId, userId },
					data: {
						balance: newAccount?.isLiability
							? { increment: updateData.amount ?? oldExpense.amount } // Liability: expense = add debt
							: { decrement: updateData.amount ?? oldExpense.amount }, // Asset: expense = subtract
					},
				});
			}

			return result;
		});

		// Fire-and-forget budget alert (after transaction commits)
		if (newBudgetId) {
			try {
				const budget = await prisma.budget.findUnique({
					where: { id: newBudgetId },
				});
				if (budget) {
					const budgetAmount = budget.amount.toNumber();
					const newSpent = prevSpent + (data.amount ?? oldExpenseAmount);
					const prevPct = budgetAmount > 0 ? (prevSpent / budgetAmount) * 100 : 0;
					const newPct = budgetAmount > 0 ? (newSpent / budgetAmount) * 100 : 0;

					NotificationService.sendBudgetAlert(
						userId,
						{ id: budget.id, name: budget.name, amount: budgetAmount },
						newSpent,
						prevPct,
						newPct
					).catch(() => {});
				}
			} catch {
				// Notification failure must never fail the main operation
			}
		}

		return updatedExpense;
	},

	/**
	 * Delete an expense entry
	 * Refunds the account balance
	 */
	async deleteExpense(userId: string, expenseId: string) {
		return await prisma.$transaction(async (tx) => {
			const expense = await tx.expense.findUniqueOrThrow({
				where: { id: expenseId, userId },
			});

			if (expense.accountId) {
				// Check if liability account
				const account = await tx.account.findUnique({
					where: { id: expense.accountId, userId },
					select: { isLiability: true },
				});

				await tx.account.update({
					where: { id: expense.accountId, userId },
					data: {
						balance: account?.isLiability
							? { decrement: expense.amount } // Liability: delete expense = reduce debt
							: { increment: expense.amount }, // Asset: delete expense = refund
					},
				});
			}

			return await tx.expense.delete({
				where: { id: expenseId, userId },
			});
		});
	},
};
