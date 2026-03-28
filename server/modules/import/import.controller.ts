'use server';

import { auth } from '@/auth';
import { ImportService } from './import.service';
import { ImportTransaction } from './import.types';
import { invalidateTags } from '@/server/actions/cache';
import { CACHE_TAGS } from '@/server/lib/cache-tags';

export async function batchImportAction(
	accountId: string,
	transactions: ImportTransaction[]
) {
	const session = await auth();
	if (!session?.user?.id)
		return { error: 'Not authenticated' };

	if (transactions.length === 0)
		return { error: 'No transactions to import' };

	if (transactions.length > 5000)
		return { error: 'Maximum 5000 transactions per import' };

	try {
		const result = await ImportService.batchImport(
			session.user.id,
			accountId,
			transactions
		);
		// Imports can create both incomes and expenses, affecting accounts and budgets
		invalidateTags(
			CACHE_TAGS.INCOMES,
			CACHE_TAGS.EXPENSES,
			CACHE_TAGS.ACCOUNTS,
			CACHE_TAGS.BUDGETS,
			CACHE_TAGS.DASHBOARD
		);
		return { success: true as const, data: result };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Import failed',
		};
	}
}

export async function detectDuplicatesAction(
	accountId: string,
	transactions: ImportTransaction[]
) {
	const session = await auth();
	if (!session?.user?.id) return { success: true as const, data: { duplicates: [] as number[] } };

	const duplicateIndices = await ImportService.detectDuplicates(
		session.user.id,
		accountId,
		transactions
	);
	return { success: true as const, data: { duplicates: Array.from(duplicateIndices) } };
}

export async function undoImportAction(importBatchId: string) {
	const session = await auth();
	if (!session?.user?.id)
		return { error: 'Not authenticated' };

	try {
		const deleted = await ImportService.undoImport(
			session.user.id,
			importBatchId
		);
		// Undo reverses incomes/expenses and restores account balances
		invalidateTags(
			CACHE_TAGS.INCOMES,
			CACHE_TAGS.EXPENSES,
			CACHE_TAGS.ACCOUNTS,
			CACHE_TAGS.BUDGETS,
			CACHE_TAGS.DASHBOARD
		);
		return { success: true as const, data: { deleted } };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Undo failed',
		};
	}
}
