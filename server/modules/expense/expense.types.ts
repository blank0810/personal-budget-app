import { z } from 'zod';

// Expense Schema
export const createExpenseSchema = z
	.object({
		amount: z.number().positive('Amount must be positive'),
		description: z.string().optional(),
		date: z.date(),
		notes: z.string().optional(),
		categoryId: z.string().optional(), // Optional if categoryName is provided
		categoryName: z.string().optional(), // For creating custom categories
		accountId: z.string().min(1, 'Account is required'), // Where money came from
		budgetId: z.string().optional(), // Link to a budget
		isRecurring: z.boolean().optional().default(false),
		recurringPeriod: z.enum(['MONTHLY', 'WEEKLY', 'YEARLY']).optional(),
	})
	.refine((data) => data.categoryId || data.categoryName, {
		message: 'Either categoryId or categoryName must be provided',
		path: ['categoryId'],
	});

export const updateExpenseSchema = createExpenseSchema.partial().extend({
	id: z.string().min(1, 'ID is required'),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

// Filter/Search Input
export const getExpensesSchema = z.object({
	startDate: z.date().optional(),
	endDate: z.date().optional(),
	categoryId: z.string().optional(),
	accountId: z.string().optional(),
	budgetId: z.string().optional(),
});

export type GetExpensesInput = z.infer<typeof getExpensesSchema>;
