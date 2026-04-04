'use server';

import { getAuthenticatedUser } from '@/server/lib/auth-guard';
import { IncomeService } from './income.service';
import {
	createIncomeSchema,
	updateIncomeSchema,
	getPaginatedIncomesSchema,
} from './income.types';
import { invalidateTags } from '@/server/actions/cache';
import { CACHE_TAGS } from '@/server/lib/cache-tags';
import { serialize } from '@/lib/serialization';
import { coerceDateFields } from '@/server/lib/action-utils';

/**
 * Server Action: Create Income
 */
export async function createIncomeAction(data: unknown) {
	const userId = await getAuthenticatedUser();

	const parsed = createIncomeSchema.safeParse(coerceDateFields(data));
	if (!parsed.success) {
		return { error: parsed.error.issues[0]?.message || 'Validation failed' };
	}

	try {
		await IncomeService.createIncome(userId, parsed.data);
		invalidateTags(CACHE_TAGS.INCOMES, CACHE_TAGS.ACCOUNTS, CACHE_TAGS.DASHBOARD, CACHE_TAGS.TRANSACTIONS);
		return { success: true as const };
	} catch (error) {
		console.error('Failed to create income:', error);
		return { error: 'Failed to create income' };
	}
}

/**
 * Server Action: Update Income
 */
export async function updateIncomeAction(data: unknown) {
	const userId = await getAuthenticatedUser();

	const parsed = updateIncomeSchema.safeParse(coerceDateFields(data));
	if (!parsed.success) {
		return { error: parsed.error.issues[0]?.message || 'Validation failed' };
	}

	try {
		await IncomeService.updateIncome(userId, parsed.data);
		invalidateTags(CACHE_TAGS.INCOMES, CACHE_TAGS.ACCOUNTS, CACHE_TAGS.DASHBOARD, CACHE_TAGS.TRANSACTIONS);
		return { success: true as const };
	} catch (error) {
		console.error('Failed to update income:', error);
		return { error: 'Failed to update income' };
	}
}

/**
 * Server Action: Delete Income
 */
export async function deleteIncomeAction(incomeId: string) {
	const userId = await getAuthenticatedUser();

	try {
		await IncomeService.deleteIncome(userId, incomeId);
		invalidateTags(CACHE_TAGS.INCOMES, CACHE_TAGS.ACCOUNTS, CACHE_TAGS.DASHBOARD, CACHE_TAGS.TRANSACTIONS);
		return { success: true as const };
	} catch (error) {
		console.error('Failed to delete income:', error);
		return { error: 'Failed to delete income' };
	}
}

/**
 * Server Action: Get Monthly Income Totals for a year
 */
export async function getIncomeMonthlyTotalsAction(year: number) {
	const userId = await getAuthenticatedUser();

	try {
		const totals = await IncomeService.getMonthlyTotals(userId, year);
		return { success: true as const, data: totals };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to fetch monthly totals',
		};
	}
}

/**
 * Server Action: Get Paginated Incomes
 */
export async function getPaginatedIncomesAction(filters: unknown) {
	const userId = await getAuthenticatedUser();

	const parsed = getPaginatedIncomesSchema.safeParse(filters);
	if (!parsed.success) {
		return { error: parsed.error.issues[0]?.message || 'Invalid filters' };
	}

	try {
		const result = await IncomeService.getPaginatedIncomes(userId, parsed.data);
		return {
			success: true as const,
			data: { incomes: serialize(result.data), total: result.total },
		};
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to fetch incomes',
		};
	}
}

/**
 * Get income stability analysis for EF suggestion
 */
export async function getIncomeStabilityAction() {
	const userId = await getAuthenticatedUser();

	try {
		const analysis = await IncomeService.analyzeIncomeStability(userId, 6);
		return { success: true as const, data: analysis };
	} catch (error) {
		console.error('Failed to analyze income stability:', error);
		return { error: 'Failed to analyze income stability' };
	}
}
