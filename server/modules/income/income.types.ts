import { z } from 'zod';

// Income Schema for Validation
export const createIncomeSchema = z
	.object({
		amount: z.number().positive('Amount must be positive'),
		description: z.string().optional(),
		date: z.date(),
		categoryId: z.string().optional(), // Optional if categoryName is provided
		categoryName: z.string().optional(), // For creating custom categories
		accountId: z.string().optional(), // Optional: Link to an account
		isRecurring: z.boolean().optional().default(false),
		recurringPeriod: z.enum(['MONTHLY', 'WEEKLY', 'YEARLY']).optional(),
		titheEnabled: z.boolean().optional().default(true),
		tithePercentage: z
			.number()
			.min(10, 'Tithe must be at least 10%')
			.optional()
			.default(10),
	})
	.refine((data) => data.categoryId || data.categoryName, {
		message: 'Either categoryId or categoryName must be provided',
		path: ['categoryId'],
	});

export const updateIncomeSchema = createIncomeSchema.partial().extend({
	id: z.string().min(1, 'ID is required'),
});

export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;
export type UpdateIncomeInput = z.infer<typeof updateIncomeSchema>;

// Filter/Search Input
export const getIncomesSchema = z.object({
	startDate: z.date().optional(),
	endDate: z.date().optional(),
	categoryId: z.string().optional(),
	accountId: z.string().optional(),
});

export type GetIncomesInput = z.infer<typeof getIncomesSchema>;
