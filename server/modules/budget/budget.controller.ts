'use server';

import { auth } from '@/auth';
import { BudgetService } from './budget.service';
import {
	createBudgetSchema,
	updateBudgetSchema,
	replicateBudgetsSchema,
	BudgetReplicationItem,
	ReplicateBudgetsInput,
} from './budget.types';
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
 * Normalize a date to UTC midnight on the 1st of the month
 * This ensures consistent storage regardless of client timezone
 */
function normalizeMonthToUTC(date: Date): Date {
	return new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0));
}

/**
 * Server Action: Create Budget
 */
export async function createBudgetAction(formData: FormData) {
	const userId = await getAuthenticatedUser();

	const categoryIdRaw = formData.get('categoryId');
	const categoryNameRaw = formData.get('categoryName');

	const rawData = {
		name: formData.get('name') as string,
		amount: Number(formData.get('amount')),
		categoryId: categoryIdRaw ? (categoryIdRaw as string) : undefined,
		categoryName: categoryNameRaw ? (categoryNameRaw as string) : undefined,
		month: normalizeMonthToUTC(new Date(formData.get('month') as string)),
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
		name: formData.get('name') as string,
		amount: Number(formData.get('amount')),
		categoryId: formData.get('categoryId') as string,
		month: formData.get('month')
			? normalizeMonthToUTC(new Date(formData.get('month') as string))
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

/**
 * Server Action: Get budgets for replication preview
 * Returns budgets from source month with recommendation data
 */
export async function getBudgetsForReplicationAction(
	sourceMonth: Date
): Promise<BudgetReplicationItem[] | { error: string }> {
	try {
		const userId = await getAuthenticatedUser();
		const budgets = await BudgetService.getBudgetsForReplication(
			userId,
			sourceMonth
		);
		return budgets;
	} catch (error) {
		console.error('Failed to get budgets for replication:', error);
		return { error: 'Failed to load budgets' };
	}
}

/**
 * Server Action: Replicate budgets to target month
 */
export async function replicateBudgetsAction(
	data: ReplicateBudgetsInput
): Promise<{ success: boolean; created: number; skipped: string[] } | { error: string }> {
	try {
		const userId = await getAuthenticatedUser();

		// Validate input
		const validatedFields = replicateBudgetsSchema.safeParse(data);
		if (!validatedFields.success) {
			return { error: 'Invalid input data' };
		}

		const result = await BudgetService.replicateBudgets(
			userId,
			validatedFields.data
		);

		revalidatePath('/', 'layout');
		return result;
	} catch (error) {
		console.error('Failed to replicate budgets:', error);
		return { error: 'Failed to replicate budgets' };
	}
}

/**
 * Server Action: Get months that have budgets
 */
export async function getMonthsWithBudgetsAction(): Promise<Date[] | { error: string }> {
	try {
		const userId = await getAuthenticatedUser();
		return await BudgetService.getMonthsWithBudgets(userId);
	} catch (error) {
		console.error('Failed to get months with budgets:', error);
		return { error: 'Failed to load months' };
	}
}
