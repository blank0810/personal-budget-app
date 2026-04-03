'use server';

import { getAuthenticatedUser } from '@/server/lib/auth-guard';
import { ExpenseService } from './expense.service';
import {
	createExpenseSchema,
	updateExpenseSchema,
	getPaginatedExpensesSchema,
} from './expense.types';
import { invalidateTags } from '@/server/actions/cache';
import { CACHE_TAGS } from '@/server/lib/cache-tags';
import { serialize } from '@/lib/serialization';
import { coerceDateFields } from '@/server/lib/action-utils';

/**
 * Server Action: Create Expense
 */
export async function createExpenseAction(data: unknown) {
	const userId = await getAuthenticatedUser();

	const parsed = createExpenseSchema.safeParse(coerceDateFields(data));
	if (!parsed.success) {
		return { error: parsed.error.issues[0]?.message || 'Validation failed' };
	}

	try {
		await ExpenseService.createExpense(userId, parsed.data);
		invalidateTags(CACHE_TAGS.EXPENSES, CACHE_TAGS.ACCOUNTS, CACHE_TAGS.BUDGETS, CACHE_TAGS.DASHBOARD, CACHE_TAGS.TRANSACTIONS);
		return { success: true as const };
	} catch (error) {
		console.error('Failed to create expense:', error);
		return { error: 'Failed to create expense' };
	}
}

/**
 * Server Action: Update Expense
 */
export async function updateExpenseAction(data: unknown) {
	const userId = await getAuthenticatedUser();

	const parsed = updateExpenseSchema.safeParse(coerceDateFields(data));
	if (!parsed.success) {
		return { error: parsed.error.issues[0]?.message || 'Validation failed' };
	}

	try {
		await ExpenseService.updateExpense(userId, parsed.data);
		invalidateTags(CACHE_TAGS.EXPENSES, CACHE_TAGS.ACCOUNTS, CACHE_TAGS.BUDGETS, CACHE_TAGS.DASHBOARD, CACHE_TAGS.TRANSACTIONS);
		return { success: true as const };
	} catch (error) {
		console.error('Failed to update expense:', error);
		return { error: 'Failed to update expense' };
	}
}

/**
 * Server Action: Get Monthly Expense Totals for a year
 */
export async function getExpenseMonthlyTotalsAction(year: number) {
	const userId = await getAuthenticatedUser();

	try {
		const totals = await ExpenseService.getMonthlyTotals(userId, year);
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
 * Server Action: Get Paginated Expenses
 */
export async function getPaginatedExpensesAction(filters: unknown) {
	const userId = await getAuthenticatedUser();

	const parsed = getPaginatedExpensesSchema.safeParse(filters);
	if (!parsed.success) {
		return { error: parsed.error.issues[0]?.message || 'Invalid filters' };
	}

	try {
		const result = await ExpenseService.getPaginatedExpenses(userId, parsed.data);
		return {
			success: true as const,
			data: { expenses: serialize(result.data), total: result.total },
		};
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to fetch expenses',
		};
	}
}

/**
 * Server Action: Delete Expense
 */
export async function deleteExpenseAction(expenseId: string) {
	const userId = await getAuthenticatedUser();

	try {
		await ExpenseService.deleteExpense(userId, expenseId);
		invalidateTags(CACHE_TAGS.EXPENSES, CACHE_TAGS.ACCOUNTS, CACHE_TAGS.BUDGETS, CACHE_TAGS.DASHBOARD, CACHE_TAGS.TRANSACTIONS);
		return { success: true as const };
	} catch (error) {
		console.error('Failed to delete expense:', error);
		return { error: 'Failed to delete expense' };
	}
}
