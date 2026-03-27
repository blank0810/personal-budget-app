import { z } from 'zod';

export const createRecurringSchema = z.object({
	name: z.string().min(1, 'Name is required').max(100),
	type: z.enum(['INCOME', 'EXPENSE']),
	amount: z.number().positive('Amount must be greater than zero'),
	description: z.string().optional(),
	frequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY']),
	startDate: z.coerce.date(),
	endDate: z.coerce.date().optional(),
	categoryId: z.string().min(1, 'Category is required'),
	accountId: z.string().min(1, 'Account is required'),
	budgetId: z.string().optional().nullable(),
});

export const updateRecurringSchema = createRecurringSchema.partial().extend({
	id: z.string(),
	isActive: z.boolean().optional(),
});

export type CreateRecurringInput = z.infer<typeof createRecurringSchema>;
export type UpdateRecurringInput = z.infer<typeof updateRecurringSchema>;
