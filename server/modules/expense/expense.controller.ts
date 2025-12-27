'use server';

import { auth } from '@/auth';
import { ExpenseService } from './expense.service';
import { createExpenseSchema, updateExpenseSchema } from './expense.types';
import { revalidatePath } from 'next/cache';

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
		await ExpenseService.createExpense(userId, validatedFields.data);
		revalidatePath('/', 'layout');
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
		await ExpenseService.updateExpense(userId, validatedFields.data);
		revalidatePath('/', 'layout');
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
