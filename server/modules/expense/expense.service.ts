import prisma from '@/lib/prisma';
import {
	BudgetLinkError,
	CreateExpenseInput,
	GetExpensesInput,
	GetPaginatedExpensesInput,
	UpdateExpenseInput,
} from './expense.types';
import { CategoryService } from '../category/category.service';
import { NotificationService } from '@/server/modules/notification/notification.service';
import { UserService } from '@/server/modules/user/user.service';
import { Prisma } from '@prisma/client';
import { getUtcMonthBounds } from '../budget/budget.month';

const budgetAlertSelect = {
	id: true,
	name: true,
	amount: true,
	month: true,
} as const;

const budgetLinkSelect = { ...budgetAlertSelect, categoryId: true } as const;

/**
 * The single rule for whether an expense may sit inside an envelope: same
 * category, and a date inside the envelope's own UTC month — the two
 * dimensions every budget spend query partitions on. Returns the reason the
 * link does not hold, or null when it does. Setting a link and keeping one
 * both go through here, so the two can never drift apart.
 */
function budgetLinkViolation(
	budget: { month: Date; categoryId: string },
	effectiveCategoryId: string | undefined,
	effectiveDate: Date
): string | null {
	if (budget.categoryId !== effectiveCategoryId) {
		return 'That budget is for a different category';
	}

	const { start, end } = getUtcMonthBounds(budget.month);
	if (
		effectiveDate.getTime() < start.getTime() ||
		effectiveDate.getTime() > end.getTime()
	) {
		return 'That budget is for a different month';
	}

	return null;
}

export const ExpenseService = {
	/**
	 * Create a new expense entry
	 */
	async createExpense(userId: string, data: CreateExpenseInput) {
		const budgetId = data.budgetId || null;
		let linkedBudget: {
			id: string;
			name: string;
			amount: Prisma.Decimal;
			month: Date;
		} | null = null;

		if (data.budgetId) {
			const budget = await prisma.budget.findUnique({
				where: { id: data.budgetId, userId },
				select: budgetLinkSelect,
			});
			if (!budget) {
				throw new Error('Budget not found');
			}
			const violation = budgetLinkViolation(
				budget,
				data.categoryId,
				data.date
			);
			if (violation) {
				throw new BudgetLinkError(violation);
			}
			linkedBudget = budget;
		}

		// Capture exact linked spend before this expense, scoped to the
		// envelope's own month so the alert uses the same spent definition.
		let prevSpent = new Prisma.Decimal(0);
		if (linkedBudget) {
			const { start, end } = getUtcMonthBounds(linkedBudget.month);
			const agg = await prisma.expense.aggregate({
				where: {
					budgetId: linkedBudget.id,
					userId,
					date: {
						gte: start,
						lte: end,
					},
				},
				_sum: { amount: true },
			});
			prevSpent = agg._sum.amount ?? new Prisma.Decimal(0);
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
					budgetId: budgetId ?? null,
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
		if (linkedBudget) {
			try {
				const newSpent = prevSpent.plus(data.amount);
				const prevPct = linkedBudget.amount.greaterThan(0)
					? prevSpent.dividedBy(linkedBudget.amount).times(100)
					: new Prisma.Decimal(0);
				const newPct = linkedBudget.amount.greaterThan(0)
					? newSpent.dividedBy(linkedBudget.amount).times(100)
					: new Prisma.Decimal(0);

				NotificationService.sendBudgetAlert(
					userId,
					{
						id: linkedBudget.id,
						name: linkedBudget.name,
						amount: linkedBudget.amount.toNumber(),
					},
					newSpent.toNumber(),
					prevPct.toNumber(),
					newPct.toNumber()
				).catch(() => {});
			} catch {
				// Notification failure must never fail the main operation
			}
		}

		// Large-expense alert. Only fires when the user set a threshold, which is
		// why large_expense_alert defaults to off — the preference is meaningless
		// without one, so an enabled-but-unset state must stay silent.
		try {
			const threshold = await UserService.getLargeExpenseThreshold(userId);
			if (threshold !== null && data.amount > threshold) {
				// Resolved separately rather than by including the relation in the
				// create above, which would change this method's return shape.
				const category = await prisma.category.findUnique({
					where: { id: expense.categoryId },
					select: { name: true },
				});

				NotificationService.sendLargeExpenseAlert(
					userId,
					{
						amount: data.amount,
						description: data.description || null,
						categoryName: category?.name ?? 'Uncategorized',
					},
					threshold
				).catch(() => {});
			}
		} catch {
			// Notification failure must never fail the main operation
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
		const { id, ...inputUpdateData } = data;
		const updateData: Omit<UpdateExpenseInput, 'id' | 'budgetId'> & {
			budgetId?: string | null;
		} = { ...inputUpdateData };
		const oldExpense = await prisma.expense.findUniqueOrThrow({
			where: { id, userId },
		});

		const categoryChanged =
			inputUpdateData.categoryId !== undefined &&
			inputUpdateData.categoryId !== oldExpense.categoryId;
		const dateChanged =
			inputUpdateData.date !== undefined &&
			inputUpdateData.date.getTime() !== oldExpense.date.getTime();
		const hasExplicitBudget = inputUpdateData.budgetId !== undefined;
		const nextCategoryId = inputUpdateData.categoryId ?? oldExpense.categoryId;
		const nextDate = inputUpdateData.date ?? oldExpense.date;

		let newBudgetId: string | null = oldExpense.budgetId;
		let linkedBudget: {
			id: string;
			name: string;
			amount: Prisma.Decimal;
			month: Date;
		} | null = null;

		if (hasExplicitBudget) {
			// An empty string is an unlink, not an id. Normalising here keeps the
			// explicit path identical to createExpense and stops a blank value
			// reaching Postgres as a foreign key.
			newBudgetId = inputUpdateData.budgetId || null;
			updateData.budgetId = newBudgetId;
			if (newBudgetId) {
				const budget = await prisma.budget.findUnique({
					where: { id: newBudgetId, userId },
					select: budgetLinkSelect,
				});
				if (!budget) {
					throw new Error('Budget not found');
				}
				const violation = budgetLinkViolation(
					budget,
					nextCategoryId,
					nextDate
				);
				if (violation) {
					throw new BudgetLinkError(violation);
				}
				linkedBudget = budget;
			}
		} else if (oldExpense.budgetId && (categoryChanged || dateChanged)) {
			// Category/date edits can invalidate an existing link, never pick one.
			const currentBudget = await prisma.budget.findUnique({
				where: { id: oldExpense.budgetId, userId },
				select: budgetLinkSelect,
			});

			if (
				currentBudget &&
				!budgetLinkViolation(currentBudget, nextCategoryId, nextDate)
			) {
				linkedBudget = currentBudget;
			}

			if (!linkedBudget) {
				newBudgetId = null;
				updateData.budgetId = null;
			}
		}

		const nextAmount =
			inputUpdateData.amount !== undefined
				? new Prisma.Decimal(inputUpdateData.amount)
				: oldExpense.amount;
		const amountChanged = !nextAmount.equals(oldExpense.amount);
		const budgetChanged = newBudgetId !== oldExpense.budgetId;
		const affectsLinkedSpend = amountChanged || budgetChanged || dateChanged;

		if (!linkedBudget && newBudgetId && affectsLinkedSpend) {
			linkedBudget = await prisma.budget.findUnique({
				where: { id: newBudgetId, userId },
				select: budgetAlertSelect,
			});
		}

		let prevSpent = new Prisma.Decimal(0);
		let linkedMonthBounds: ReturnType<typeof getUtcMonthBounds> | null = null;
		if (linkedBudget && affectsLinkedSpend) {
			linkedMonthBounds = getUtcMonthBounds(linkedBudget.month);
			const agg = await prisma.expense.aggregate({
				where: {
					budgetId: linkedBudget.id,
					userId,
					date: {
						gte: linkedMonthBounds.start,
						lte: linkedMonthBounds.end,
					},
				},
				_sum: { amount: true },
			});
			prevSpent = agg._sum.amount ?? new Prisma.Decimal(0);

			const oldExpenseWasIncluded =
				oldExpense.budgetId === linkedBudget.id &&
				oldExpense.date.getTime() >= linkedMonthBounds.start.getTime() &&
				oldExpense.date.getTime() <= linkedMonthBounds.end.getTime();
			if (oldExpenseWasIncluded) {
				prevSpent = prevSpent.minus(oldExpense.amount);
			}
		}

		const updatedExpense = await prisma.$transaction(async (tx) => {
			// 1. Update the expense
			const result = await tx.expense.update({
				where: { id, userId },
				data: updateData,
			});

			// 2. Handle Balance Updates
			// Case A: Account didn't change, but amount might have
			if (
				!updateData.accountId ||
				updateData.accountId === oldExpense.accountId
			) {
				if (oldExpense.accountId && amountChanged) {
					const difference = nextAmount.minus(oldExpense.amount);

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
							? { increment: nextAmount } // Liability: expense = add debt
							: { decrement: nextAmount }, // Asset: expense = subtract
					},
				});
			}

			return result;
		});

		// Fire-and-forget budget alert (after transaction commits)
		if (linkedBudget && linkedMonthBounds && affectsLinkedSpend) {
			try {
				const updatedExpenseIsIncluded =
					newBudgetId === linkedBudget.id &&
					nextDate.getTime() >= linkedMonthBounds.start.getTime() &&
					nextDate.getTime() <= linkedMonthBounds.end.getTime();
				const newSpent = updatedExpenseIsIncluded
					? prevSpent.plus(nextAmount)
					: prevSpent;
				const prevPct = linkedBudget.amount.greaterThan(0)
					? prevSpent.dividedBy(linkedBudget.amount).times(100)
					: new Prisma.Decimal(0);
				const newPct = linkedBudget.amount.greaterThan(0)
					? newSpent.dividedBy(linkedBudget.amount).times(100)
					: new Prisma.Decimal(0);

				NotificationService.sendBudgetAlert(
					userId,
					{
						id: linkedBudget.id,
						name: linkedBudget.name,
						amount: linkedBudget.amount.toNumber(),
					},
					newSpent.toNumber(),
					prevPct.toNumber(),
					newPct.toNumber()
				).catch(() => {});
			} catch {
				// Notification failure must never fail the main operation
			}
		}

		return updatedExpense;
	},

	/**
	 * Delete an expense entry inside an existing Prisma transaction.
	 * Used by the single-row `deleteExpense` wrapper and by
	 * `TransactionService.bulkDelete`.
	 */
	async _deleteExpenseInTx(
		tx: Prisma.TransactionClient,
		userId: string,
		expenseId: string
	) {
		const expense = await tx.expense.findUniqueOrThrow({
			where: { id: expenseId, userId },
		});

		if (expense.accountId) {
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
	},

	/**
	 * Delete an expense entry (single-row wrapper).
	 */
	async deleteExpense(userId: string, expenseId: string) {
		return await prisma.$transaction((tx) =>
			ExpenseService._deleteExpenseInTx(tx, userId, expenseId)
		);
	},
};
