'use server';

import { getAuthenticatedUser } from '@/server/lib/auth-guard';
import { TransactionService } from './transaction.service';
import {
	transactionFilterSchema,
	bulkDeleteSchema,
	bulkCategorizeSchema,
} from './transaction.types';
import { invalidateTags } from '@/server/actions/cache';
import { CACHE_TAGS } from '@/server/lib/cache-tags';
import { FeatureFlagService } from '@/server/modules/feature-flag/feature-flag.service';

/**
 * Gate bulk mutations behind the `bulk_actions` feature flag server-side.
 * The page-level check hides the UI, but server actions are addressable HTTP
 * endpoints — a client could invoke them directly without the gate.
 */
async function assertBulkActionsEnabled(userId: string) {
	const features = await FeatureFlagService.getResolvedFeaturesForUser(userId);
	if (features['bulk_actions'] !== true) {
		throw new Error('Bulk actions are not enabled for this account');
	}
}

/**
 * Server Action: Get unified paginated transactions
 */
export async function getUnifiedTransactionsAction(filters: unknown) {
	const userId = await getAuthenticatedUser();

	const parsed = transactionFilterSchema.safeParse(filters);
	if (!parsed.success) {
		return { error: parsed.error.issues[0]?.message || 'Invalid filters' };
	}

	try {
		const result = await TransactionService.getUnifiedTransactions(
			userId,
			parsed.data
		);
		return { success: true as const, data: result };
	} catch (error) {
		console.error('Failed to fetch transactions:', error);
		return { error: 'Failed to fetch transactions' };
	}
}

/**
 * Server Action: Bulk delete transactions (v1.9.12 pilot)
 */
export async function bulkDeleteTransactionsAction(data: unknown) {
	const userId = await getAuthenticatedUser();

	const parsed = bulkDeleteSchema.safeParse(data);
	if (!parsed.success) {
		return { error: parsed.error.issues[0]?.message || 'Invalid input' };
	}

	const startMs = Date.now();
	try {
		await assertBulkActionsEnabled(userId);
		const result = await TransactionService.bulkDelete(userId, parsed.data);
		invalidateTags(
			CACHE_TAGS.INCOMES,
			CACHE_TAGS.EXPENSES,
			CACHE_TAGS.TRANSFERS,
			CACHE_TAGS.ACCOUNTS,
			CACHE_TAGS.DASHBOARD,
			CACHE_TAGS.TRANSACTIONS,
			CACHE_TAGS.GOALS, // EF goal currentAmount decrements on reversal
			CACHE_TAGS.BUDGETS, // expense rows with budgetId affect budget totals
			CACHE_TAGS.LEDGER
		);
		console.log(
			JSON.stringify({
				event: 'bulk_delete',
				userId,
				requestedCount: result.requestedCount,
				processedCount: result.processedCount,
				skippedCount: result.skippedCount,
				durationMs: Date.now() - startMs,
				timestamp: new Date().toISOString(),
			})
		);
		return { success: true as const, data: result };
	} catch (error) {
		console.log(
			JSON.stringify({
				event: 'bulk_delete_error',
				userId,
				message: error instanceof Error ? error.message : 'unknown',
				durationMs: Date.now() - startMs,
				timestamp: new Date().toISOString(),
			})
		);
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to delete transactions',
		};
	}
}

/**
 * Server Action: Bulk categorize transactions (v1.9.12 pilot)
 */
export async function bulkCategorizeTransactionsAction(data: unknown) {
	const userId = await getAuthenticatedUser();

	const parsed = bulkCategorizeSchema.safeParse(data);
	if (!parsed.success) {
		return { error: parsed.error.issues[0]?.message || 'Invalid input' };
	}

	const startMs = Date.now();
	try {
		await assertBulkActionsEnabled(userId);
		const result = await TransactionService.bulkCategorize(
			userId,
			parsed.data
		);
		invalidateTags(
			CACHE_TAGS.INCOMES,
			CACHE_TAGS.EXPENSES,
			CACHE_TAGS.TRANSACTIONS,
			CACHE_TAGS.DASHBOARD,
			CACHE_TAGS.BUDGETS, // expense category changes affect budget linkage
			CACHE_TAGS.LEDGER // ledger row category names need refresh
		);
		console.log(
			JSON.stringify({
				event: 'bulk_categorize',
				userId,
				requestedCount: result.requestedCount,
				processedCount: result.processedCount,
				skippedCount: result.skippedCount,
				durationMs: Date.now() - startMs,
				timestamp: new Date().toISOString(),
			})
		);
		return { success: true as const, data: result };
	} catch (error) {
		console.log(
			JSON.stringify({
				event: 'bulk_categorize_error',
				userId,
				message: error instanceof Error ? error.message : 'unknown',
				durationMs: Date.now() - startMs,
				timestamp: new Date().toISOString(),
			})
		);
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to categorize transactions',
		};
	}
}

/**
 * Server Action: Get transaction summary (KPI data)
 */
export async function getTransactionSummaryAction(filters?: {
	startDate?: string;
	endDate?: string;
}) {
	const userId = await getAuthenticatedUser();

	try {
		const startDate = filters?.startDate
			? new Date(filters.startDate)
			: undefined;
		const endDate = filters?.endDate ? new Date(filters.endDate) : undefined;

		const summary = await TransactionService.getTransactionSummary(
			userId,
			startDate,
			endDate
		);
		return { success: true as const, data: summary };
	} catch (error) {
		console.error('Failed to fetch transaction summary:', error);
		return { error: 'Failed to fetch transaction summary' };
	}
}
