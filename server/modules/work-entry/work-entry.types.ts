import { z } from 'zod';

export const createWorkEntrySchema = z.object({
	clientId: z.string().min(1, 'Client is required'),
	description: z.string().min(1, 'Description is required'),
	date: z.coerce.date(),
	quantity: z.number().positive('Quantity must be positive').default(1),
	unitPrice: z.number().min(0, 'Unit price must be non-negative'),
});

export const updateWorkEntrySchema = createWorkEntrySchema.partial().extend({
	id: z.string(),
});

export type CreateWorkEntryInput = z.infer<typeof createWorkEntrySchema>;
export type UpdateWorkEntryInput = z.infer<typeof updateWorkEntrySchema>;

export const getWorkEntriesSchema = z.object({
	clientId: z.string().optional(),
	status: z.enum(['UNBILLED', 'BILLED']).optional(),
	startDate: z.coerce.date().optional(),
	endDate: z.coerce.date().optional(),
	page: z.number().int().min(1).default(1),
	pageSize: z.number().int().min(1).max(100).default(20),
	sortBy: z.enum(['date', 'clientName', 'amount']).default('date'),
	sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type GetWorkEntriesInput = z.infer<typeof getWorkEntriesSchema>;
