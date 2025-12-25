'use server';

import { auth } from '@/auth';
import { BudgetService } from './budget.service';
import { createBudgetSchema, updateBudgetSchema } from './budget.types';
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
 * Server Action: Create Budget
 */
export async function createBudgetAction(formData: FormData) {
	const userId = await getAuthenticatedUser();

	const rawData = {
		amount: Number(formData.get('amount')),
		categoryId: formData.get('categoryId') as string,
		categoryName: formData.get('categoryName') as string | undefined, // NEW
		month: new Date(formData.get('month') as string), // Expecting YYYY-MM-01 or ISO
	};

	const validatedFields = createBudgetSchema.safeParse(rawData);

	if (!validatedFields.success) {
		return {
			error: 'Invalid fields',
			issues: validatedFields.error.issues,
		};
	}

	try {
		await BudgetService.createBudget(userId, validatedFields.data);
		revalidatePath('/', 'layout');
		return { success: true };
	} catch (error) {
		console.error('Failed to create budget:', error);
		return { error: 'Failed to create budget' };
	}
}

/**
 * Server Action: Update Budget
 */
export async function updateBudgetAction(formData: FormData) {
	const userId = await getAuthenticatedUser();

	const rawData = {
		id: formData.get('id') as string,
		amount: Number(formData.get('amount')),
		categoryId: formData.get('categoryId') as string,
		month: formData.get('month')
			? new Date(formData.get('month') as string)
			: undefined,
	};

	const validatedFields = updateBudgetSchema.safeParse(rawData);

	if (!validatedFields.success) {
		return {
			error: 'Invalid fields',
			issues: validatedFields.error.issues,
		};
	}

	try {
		await BudgetService.updateBudget(userId, validatedFields.data);
		revalidatePath('/', 'layout');
		return { success: true };
	} catch (error) {
		console.error('Failed to update budget:', error);
		return { error: 'Failed to update budget' };
	}
}

/**
 * Server Action: Delete Budget
 */
export async function deleteBudgetAction(budgetId: string) {
	const userId = await getAuthenticatedUser();

	try {
		await BudgetService.deleteBudget(userId, budgetId);
		revalidatePath('/', 'layout');
		return { success: true };
	} catch (error) {
		console.error('Failed to delete budget:', error);
		return { error: 'Failed to delete budget' };
	}
}
