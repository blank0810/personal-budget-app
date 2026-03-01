import { z } from 'zod';

export const createGoalSchema = z.object({
	name: z.string().min(1).max(100),
	targetAmount: z.number().positive(),
	deadline: z.coerce.date().optional(),
	icon: z.string().optional(),
	color: z.string().optional(),
	linkedAccountId: z.string().optional(),
});

export const updateGoalSchema = createGoalSchema.partial().extend({
	id: z.string(),
});

export const addContributionSchema = z.object({
	goalId: z.string(),
	amount: z.number().positive(),
	note: z.string().optional(),
	date: z.coerce.date().optional(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type AddContributionInput = z.infer<typeof addContributionSchema>;
