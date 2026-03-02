import { z } from 'zod';

export const createGoalSchema = z.object({
	name: z.string().min(1).max(100),
	targetAmount: z.number().min(0),
	deadline: z.coerce.date().optional(),
	icon: z.string().optional(),
	color: z.string().optional(),
	linkedAccountId: z.string().optional(),
	goalType: z.enum(['FIXED_AMOUNT', 'MONTHS_COVERAGE']).default('FIXED_AMOUNT'),
	isEmergencyFund: z.boolean().default(false),
	thresholdLow: z.number().int().min(1).optional(),
	thresholdMid: z.number().int().min(1).optional(),
	thresholdHigh: z.number().int().min(1).optional(),
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

export type GoalHealthStatus = 'critical' | 'underfunded' | 'building' | 'funded';

export interface GoalHealthMetric {
	id: string;
	name: string;
	goalType: 'FIXED_AMOUNT' | 'MONTHS_COVERAGE';
	isEmergencyFund: boolean;
	balance: number;
	targetAmount: number | null;
	progressPercent: number;
	monthsCoverage: number | null;
	healthStatus: GoalHealthStatus;
	thresholds: { low: number; mid: number; high: number };
}

export interface GoalHealthSummary {
	goals: GoalHealthMetric[];
	totalGoalBalance: number;
	hasEmergencyFund: boolean;
	emergencyFundMonths: number | null;
	emergencyFundHealth: GoalHealthStatus | null;
	emergencyFundExpenseSource: 'actual' | 'budget' | null;
	monthlyExpenseBaseline: number;
}
