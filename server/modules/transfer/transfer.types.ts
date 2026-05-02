import { z } from 'zod';

// Transfer Schema
export const createTransferSchema = z
	.object({
		amount: z.number().positive('Amount must be positive'),
		date: z.date(),
		description: z.string().optional(),
		fee: z.number().optional(),
		fromAccountId: z.string().min(1, 'Source account is required'),
		toAccountId: z.string().min(1, 'Destination account is required'),
	})
	.refine((data) => data.fromAccountId !== data.toAccountId, {
		message: 'Source and destination accounts must be different',
		path: ['toAccountId'],
	});

// Reserved for future row-level transfer editing. There is currently no
// `updateTransferAction` controller, no `TransferService.updateTransfer`
// method, and no UI caller — the schema is here only as a starting point.
//
// When edit ships, mirror the reverse-then-reapply pattern from
// `IncomeService.updateIncome` and the symmetry of
// `TransferService._deleteTransferInTx` + `createTransfer`. Specifically:
// reverse both account legs, reverse the linked fee Expense, update the row,
// re-apply both legs against the new shape, recreate the fee Expense if
// still present. Run `money-feature-review` before merging.
export const updateTransferSchema = createTransferSchema.partial().extend({
	id: z.string().min(1, 'ID is required'),
});

export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type UpdateTransferInput = z.infer<typeof updateTransferSchema>;

// Filter Input
export const getTransfersSchema = z.object({
	startDate: z.date().optional(),
	endDate: z.date().optional(),
	accountId: z.string().optional(), // Filter by either from or to
});

export type GetTransfersInput = z.infer<typeof getTransfersSchema>;
