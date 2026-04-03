'use server';

import { getAuthenticatedUser } from '@/server/lib/auth-guard';
import { TransactionService } from './transaction.service';
import { transactionFilterSchema } from './transaction.types';

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
