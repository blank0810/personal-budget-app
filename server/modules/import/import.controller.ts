'use server';

import { auth } from '@/auth';
import { ImportService } from './import.service';
import { ImportTransaction } from './import.types';
import { clearCache } from '@/server/actions/cache';

export async function batchImportAction(
	accountId: string,
	transactions: ImportTransaction[]
) {
	const session = await auth();
	if (!session?.user?.id)
		return { success: false, error: 'Not authenticated' };

	if (transactions.length === 0)
		return { success: false, error: 'No transactions to import' };

	if (transactions.length > 5000)
		return {
			success: false,
			error: 'Maximum 5000 transactions per import',
		};

	try {
		const result = await ImportService.batchImport(
			session.user.id,
			accountId,
			transactions
		);
		await clearCache('/', 'layout');
		return { success: true, ...result };
	} catch (error) {
		return {
			success: false,
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
	if (!session?.user?.id) return { duplicates: [] };

	const duplicateIndices = await ImportService.detectDuplicates(
		session.user.id,
		accountId,
		transactions
	);
	return { duplicates: Array.from(duplicateIndices) };
}

export async function undoImportAction(importBatchId: string) {
	const session = await auth();
	if (!session?.user?.id)
		return { success: false, error: 'Not authenticated' };

	try {
		const deleted = await ImportService.undoImport(
			session.user.id,
			importBatchId
		);
		await clearCache('/', 'layout');
		return { success: true, deleted };
	} catch (error) {
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: 'Undo failed',
		};
	}
}
