'use server';

import { auth } from '@/auth';
import { ExpenseService } from './expense.service';
import { createExpenseSchema, updateExpenseSchema } from './expense.types';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { NotificationService } from '@/server/modules/notification/notification.service';

/**
 * Helper to authenticate user
 */
async function getAuthenticatedUser() {
	const session = await auth();
	if (!session?.user?.id) {
		throw new Error('Unauthorized');
	}
	return session.user.id;
}

/**
 * Server Action: Create Expense
 */
export async function createExpenseAction(formData: FormData) {
	const userId = await getAuthenticatedUser();

	const rawData = {
		amount: Number(formData.get('amount')),
		description: formData.get('description') as string,
		date: new Date(formData.get('date') as string),
		categoryId: (formData.get('categoryId') as string) || undefined,
		categoryName: (formData.get('categoryName') as string) || undefined,
		accountId: (formData.get('accountId') as string) || undefined,
		budgetId: (formData.get('budgetId') as string) || undefined,
		notes: (formData.get('notes') as string) || undefined,
		isRecurring: formData.get('isRecurring') === 'on',
		recurringPeriod:
			(formData.get('recurringPeriod') as
				| 'MONTHLY'
				| 'WEEKLY'
				| 'YEARLY') || undefined,
	};

	const validatedFields = createExpenseSchema.safeParse(rawData);

	if (!validatedFields.success) {
		return {
			error: 'Invalid fields',
			issues: validatedFields.error.issues,
		};
	}

	try {
		// If linking to a budget, capture the spent amount BEFORE this expense
		let prevSpent = 0;
		const budgetId = validatedFields.data.budgetId;
		if (budgetId) {
			const agg = await prisma.expense.aggregate({
				where: { budgetId, userId },
				_sum: { amount: true },
			});
			prevSpent = agg._sum.amount?.toNumber() ?? 0;
		}

		await ExpenseService.createExpense(userId, validatedFields.data);
		revalidatePath('/', 'layout');

		// Fire-and-forget budget alert
		if (budgetId) {
			const budget = await prisma.budget.findUnique({
				where: { id: budgetId },
			});
			if (budget) {
				const budgetAmount = budget.amount.toNumber();
				const newSpent = prevSpent + validatedFields.data.amount;
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
		}

		return { success: true };
	} catch (error) {
		console.error('Failed to create expense:', error);
		return { error: 'Failed to create expense' };
	}
}

/**
 * Server Action: Update Expense
 */
export async function updateExpenseAction(formData: FormData) {
	const userId = await getAuthenticatedUser();

	const rawData = {
		id: formData.get('id') as string,
		amount: Number(formData.get('amount')),
		description: formData.get('description') as string,
		date: new Date(formData.get('date') as string),
		categoryId: (formData.get('categoryId') as string) || undefined,
		accountId: (formData.get('accountId') as string) || undefined,
		budgetId: (formData.get('budgetId') as string) || undefined,
		notes: (formData.get('notes') as string) || undefined,
		isRecurring: formData.get('isRecurring') === 'on',
		recurringPeriod:
			(formData.get('recurringPeriod') as
				| 'MONTHLY'
				| 'WEEKLY'
				| 'YEARLY') || undefined,
	};

	const validatedFields = updateExpenseSchema.safeParse(rawData);

	if (!validatedFields.success) {
		return {
			error: 'Invalid fields',
			issues: validatedFields.error.issues,
		};
	}

	try {
		const newBudgetId = validatedFields.data.budgetId;

		// If the updated expense is linked to a budget, capture previous spend
		let prevSpent = 0;
		let oldExpenseAmount = 0;
		if (newBudgetId) {
			const oldExpense = await prisma.expense.findUnique({
				where: { id: validatedFields.data.id, userId },
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

		await ExpenseService.updateExpense(userId, validatedFields.data);
		revalidatePath('/', 'layout');

		// Fire-and-forget budget alert
		if (newBudgetId) {
			const budget = await prisma.budget.findUnique({
				where: { id: newBudgetId },
			});
			if (budget) {
				const budgetAmount = budget.amount.toNumber();
				const newSpent = prevSpent + (validatedFields.data.amount ?? oldExpenseAmount);
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
		}

		return { success: true };
	} catch (error) {
		console.error('Failed to update expense:', error);
		return { error: 'Failed to update expense' };
	}
}

/**
 * Server Action: Delete Expense
 */
export async function deleteExpenseAction(expenseId: string) {
	const userId = await getAuthenticatedUser();

	try {
		await ExpenseService.deleteExpense(userId, expenseId);
		revalidatePath('/', 'layout');
		return { success: true };
	} catch (error) {
		console.error('Failed to delete expense:', error);
		return { error: 'Failed to delete expense' };
	}
}
