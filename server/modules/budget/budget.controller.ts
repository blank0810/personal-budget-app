'use server';

import { getAuthenticatedUser } from '@/server/lib/auth-guard';
import { BudgetService } from './budget.service';
import {
	createBudgetSchema,
	updateBudgetSchema,
	replicateBudgetsSchema,
	ReplicateBudgetsInput,
	budgetAnalyticsMonthSchema,
	budgetMonthRouteParamSchema,
} from './budget.types';
import { invalidateTags } from '@/server/actions/cache';
import { CACHE_TAGS } from '@/server/lib/cache-tags';
import { coerceDateFields } from '@/server/lib/action-utils';
import { BudgetAnalyticsService } from './budget.analytics.service';
import { normalizeBudgetMonth } from './budget.month';

/**
 * Page read: one selected month, its bounded year overview, and the lean
 * distinct-month list used by budget replication.
 */
export async function getBudgetsPageDataAction(monthParam: unknown) {
	const userId = await getAuthenticatedUser();
	const parsedMonth = budgetMonthRouteParamSchema.safeParse(monthParam);
	const month = normalizeBudgetMonth(
		parsedMonth.success ? parsedMonth.data : new Date()
	);
	const [budgets, yearOverview, availableMonths] = await Promise.all([
		BudgetService.getBudgetsWithCoverage(userId, { month }),
		BudgetService.getBudgetYearOverview(userId, month),
		BudgetService.getMonthsWithBudgets(userId),
	]);

	return {
		month,
		budgets,
		yearOverview,
		availableMonths,
	};
}

/**
 * Server Action: Get current budget health summary
 */
export async function getBudgetHealthSummaryAction(month?: Date) {
	const userId = await getAuthenticatedUser();

	try {
		const health = await BudgetService.getBudgetHealthSummary(userId, month);
		return { success: true as const, data: health };
	} catch (error) {
		console.error('Failed to load budget health:', error);
		return { error: 'Failed to load budget health' };
	}
}

/**
 * Server Action: Compare category spending for adjacent months
 */
export async function getCategorySpendComparisonAction(data: unknown) {
	const userId = await getAuthenticatedUser();
	const parsed = budgetAnalyticsMonthSchema.safeParse(coerceDateFields(data));
	if (!parsed.success) {
		return { error: 'Invalid month' };
	}

	try {
		const comparison =
			await BudgetAnalyticsService.getCategorySpendComparison(
				userId,
				parsed.data.month
			);
		return { success: true as const, data: comparison };
	} catch (error) {
		console.error('Failed to load category spending:', error);
		return { error: 'Failed to load category spending' };
	}
}

/**
 * Server Action: Load the history-gated envelope offer for non-budgeters
 */
export async function getInferredEnvelopeOfferAction(data: unknown) {
	const userId = await getAuthenticatedUser();
	const parsed = budgetAnalyticsMonthSchema.safeParse(coerceDateFields(data));
	if (!parsed.success) {
		return { error: 'Invalid month' };
	}

	try {
		const offer = await BudgetAnalyticsService.getInferredEnvelopeOffer(
			userId,
			parsed.data.month
		);
		return { success: true as const, data: offer };
	} catch (error) {
		console.error('Failed to load envelope history:', error);
		return { error: 'Failed to load envelope history' };
	}
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
	parsed.data.month = normalizeBudgetMonth(parsed.data.month);

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
		parsed.data.month = normalizeBudgetMonth(parsed.data.month);
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
