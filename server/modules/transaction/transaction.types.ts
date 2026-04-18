import { z } from 'zod';
import { TransactionSource } from '@prisma/client';

// ---------------------------------------------------------------------------
// Unified Transaction — discriminated union returned by the service
// ---------------------------------------------------------------------------

export type UnifiedTransaction =
	| {
			kind: 'income';
			id: string;
			amount: number;
			date: string; // ISO string (serialized)
			description: string | null;
			accountName: string | null;
			categoryName: string;
			source: TransactionSource;
	  }
	| {
			kind: 'expense';
			id: string;
			amount: number;
			date: string;
			description: string | null;
			accountName: string | null;
			categoryName: string;
			budgetName: string | null;
			source: TransactionSource;
	  }
	| {
			kind: 'transfer';
			id: string;
			amount: number;
			date: string;
			description: string | null;
			fromAccountName: string;
			toAccountName: string;
			fee: number;
			isPayment: boolean;
	  };

// ---------------------------------------------------------------------------
// Filter / pagination input — validated in the controller
// ---------------------------------------------------------------------------

export const transactionFilterSchema = z.object({
	type: z.enum(['income', 'expense', 'transfer', 'payment']).optional(),
	categoryId: z.string().optional(),
	accountId: z.string().optional(),
	search: z.string().optional(),
	source: z.nativeEnum(TransactionSource).optional(),
	amountMin: z.coerce.number().optional(),
	amountMax: z.coerce.number().optional(),
	startDate: z.coerce.date().optional(),
	endDate: z.coerce.date().optional(),
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(100).default(10),
	sortBy: z.enum(['date', 'amount', 'description']).default('date'),
	sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type TransactionFilterInput = z.infer<typeof transactionFilterSchema>;

// ---------------------------------------------------------------------------
// Summary — KPI card data
// ---------------------------------------------------------------------------

export interface TransactionSummary {
	totalIncome: number;
	totalExpenses: number;
	netFlow: number;
	averageAmount: number;
	transactionCount: number;
}

// ---------------------------------------------------------------------------
// Paginated response
// ---------------------------------------------------------------------------

export interface PaginatedTransactions {
	data: UnifiedTransaction[];
	total: number;
	page: number;
	pageSize: number;
}

// ---------------------------------------------------------------------------
// Bulk operations (v1.9.12 pilot)
// Discriminator matches UnifiedTransaction.kind values.
// ---------------------------------------------------------------------------

export const bulkTransactionItemSchema = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('income'), id: z.string().min(1) }),
	z.object({ kind: z.literal('expense'), id: z.string().min(1) }),
	z.object({ kind: z.literal('transfer'), id: z.string().min(1) }),
]);

export const bulkDeleteSchema = z.object({
	items: z.array(bulkTransactionItemSchema).min(1).max(100),
});

export const bulkCategorizeSchema = z.object({
	items: z.array(bulkTransactionItemSchema).min(1).max(100),
	categoryId: z.string().min(1, 'Category is required'),
});

export type BulkTransactionItem = z.infer<typeof bulkTransactionItemSchema>;
export type BulkDeleteInput = z.infer<typeof bulkDeleteSchema>;
export type BulkCategorizeInput = z.infer<typeof bulkCategorizeSchema>;

export interface BulkOperationResult {
	requestedCount: number;
	processedCount: number;
	skippedCount: number;
	skippedReasons: Array<{ id: string; reason: string }>;
}
