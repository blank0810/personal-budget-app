import { z } from 'zod';

// Budget Schema
export const createBudgetSchema = z
	.object({
		amount: z.number().positive('Amount must be positive'),
		categoryId: z.string().optional(), // Optional if categoryName provided
		categoryName: z.string().optional(), // For creating custom categories
		month: z.date(), // First day of the month
	})
	.refine((data) => data.categoryId || data.categoryName, {
		message: 'Either categoryId or categoryName must be provided',
		path: ['categoryId'],
	});

export const updateBudgetSchema = createBudgetSchema.partial().extend({
	id: z.string().min(1, 'ID is required'),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;

// Filter Input
export const getBudgetsSchema = z.object({
	month: z.date().optional(),
});

export type GetBudgetsInput = z.infer<typeof getBudgetsSchema>;
