import { z } from 'zod';

// Budget Schema - Envelope Budgeting
export const createBudgetSchema = z
	.object({
		name: z.string().min(1, 'Budget name is required').max(100),
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

// Budget Analytics Types

export interface ProblemCategory {
	categoryId: string;
	name: string;
	status: 'warning' | 'over';
	detail: string; // e.g., "over 3 months" or "at 95%"
	monthsOver: number;
}

export interface BudgetHealthSummary {
	totalBudgets: number;
	onTrack: number; // < 80% spent
	warning: number; // 80-100% spent
	over: number; // > 100% spent
	totalBudgeted: number;
	totalSpent: number;
	problemCategories: ProblemCategory[];
}

export interface MonthlyTrend {
	month: Date;
	monthLabel: string; // e.g., "Dec 2025"
	totalBudgeted: number;
	totalSpent: number;
	savings: number; // budgeted - spent (can be negative)
	adherencePercent: number; // (spent / budgeted) * 100, capped at 100 for display
	categoriesOnTrack: number;
	categoriesOver: number;
	totalCategories: number;
}

export interface CategoryRecommendation {
	categoryId: string;
	categoryName: string;
	monthsAnalyzed: number;
	avgBudget: number;
	avgSpent: number;
	variance: number; // (avgSpent - avgBudget) / avgBudget * 100
	monthsOver: number; // times spent > budget
	monthsUnder: number; // times spent < 60% of budget
	recommendation: 'increase' | 'decrease' | 'stable';
	suggestedAmount: number | null; // null if stable
	trend: string; // e.g., "Over 4/6 months"
}
