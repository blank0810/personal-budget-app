import { z } from 'zod';

export const importTransactionSchema = z.object({
	date: z.coerce.date(),
	amount: z.number().positive(),
	description: z.string().optional(),
	type: z.enum(['INCOME', 'EXPENSE']),
	categoryId: z.string(),
	accountId: z.string(),
});

export const batchImportSchema = z.object({
	transactions: z.array(importTransactionSchema).min(1).max(5000),
	accountId: z.string(),
});

export type ImportTransaction = z.infer<typeof importTransactionSchema>;
export type BatchImportInput = z.infer<typeof batchImportSchema>;

export interface ColumnMapping {
	date: string;
	amount: string;
	description?: string;
}

export interface ImportResult {
	imported: number;
	skipped: number;
	importBatchId: string;
}
