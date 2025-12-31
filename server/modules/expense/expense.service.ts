import prisma from '@/lib/prisma';
import {
	CreateExpenseInput,
	GetExpensesInput,
	UpdateExpenseInput,
} from './expense.types';
import { CategoryService } from '../category/category.service';

export const ExpenseService = {
	/**
	 * Create a new expense entry
	 */
	async createExpense(userId: string, data: CreateExpenseInput) {
		return await prisma.$transaction(async (tx) => {
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

			const expense = await tx.expense.create({
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

			return expense;
		});
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

		return await prisma.$transaction(async (tx) => {
			// 1. Get the old expense
			const oldExpense = await tx.expense.findUniqueOrThrow({
				where: { id, userId },
			});

			// 2. Update the expense
			const updatedExpense = await tx.expense.update({
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

			return updatedExpense;
		});
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
