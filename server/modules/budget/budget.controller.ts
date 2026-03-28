'use server';

import { getAuthenticatedUser } from '@/server/lib/auth-guard';
import { BudgetService } from './budget.service';
import {
	createBudgetSchema,
	updateBudgetSchema,
	replicateBudgetsSchema,
	ReplicateBudgetsInput,
} from './budget.types';
import { invalidateTags } from '@/server/actions/cache';
import { CACHE_TAGS } from '@/server/lib/cache-tags';
import { coerceDateFields } from '@/server/lib/action-utils';

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
export async function createBudgetAction(data: unknown) {
	const userId = await getAuthenticatedUser();

	const parsed = createBudgetSchema.safeParse(coerceDateFields(data));
	if (!parsed.success) {
		return { error: parsed.error.issues[0]?.message || 'Validation failed' };
	}

	// Normalize month to UTC midnight on the 1st
	parsed.data.month = normalizeMonthToUTC(parsed.data.month);

	try {
		await BudgetService.createBudget(userId, parsed.data);
		invalidateTags(CACHE_TAGS.BUDGETS, CACHE_TAGS.DASHBOARD);
		return { success: true as const };
	} catch (error) {
		console.error('Failed to create budget:', error);
		return { error: 'Failed to create budget' };
	}
}

/**
 * Server Action: Update Budget
 */
export async function updateBudgetAction(data: unknown) {
	const userId = await getAuthenticatedUser();

	const parsed = updateBudgetSchema.safeParse(coerceDateFields(data));
	if (!parsed.success) {
		return { error: parsed.error.issues[0]?.message || 'Validation failed' };
	}

	// Normalize month to UTC midnight on the 1st if provided
	if (parsed.data.month) {
		parsed.data.month = normalizeMonthToUTC(parsed.data.month);
	}

	try {
		await BudgetService.updateBudget(userId, parsed.data);
		invalidateTags(CACHE_TAGS.BUDGETS, CACHE_TAGS.DASHBOARD);
		return { success: true as const };
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
		invalidateTags(CACHE_TAGS.BUDGETS, CACHE_TAGS.DASHBOARD);
		return { success: true as const };
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
) {
	try {
		const userId = await getAuthenticatedUser();
		const budgets = await BudgetService.getBudgetsForReplication(
			userId,
			sourceMonth
		);
		return { success: true as const, data: budgets };
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
) {
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

		invalidateTags(CACHE_TAGS.BUDGETS, CACHE_TAGS.DASHBOARD);
		return { success: true as const, data: { created: result.created, skipped: result.skipped } };
	} catch (error) {
		console.error('Failed to replicate budgets:', error);
		return { error: 'Failed to replicate budgets' };
	}
}

/**
 * Server Action: Get months that have budgets
 */
export async function getMonthsWithBudgetsAction() {
	try {
		const userId = await getAuthenticatedUser();
		const months = await BudgetService.getMonthsWithBudgets(userId);
		return { success: true as const, data: months };
	} catch (error) {
		console.error('Failed to get months with budgets:', error);
		return { error: 'Failed to load months' };
	}
}
