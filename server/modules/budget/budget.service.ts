import prisma from '@/lib/prisma';
import {
	CreateBudgetInput,
	GetBudgetsInput,
	UpdateBudgetInput,
} from './budget.types';
import { CategoryService } from '../category/category.service';

export const BudgetService = {
	/**
	 * Create a new budget
	 */
	async createBudget(userId: string, data: CreateBudgetInput) {
		// Handle category: get existing or create new
		let categoryId = data.categoryId;

		if (!categoryId && data.categoryName) {
			const category = await CategoryService.getOrCreateCategory(
				userId,
				data.categoryName,
				'EXPENSE' // Budgets are for expenses
			);
			categoryId = category.id;
		}

		if (!categoryId) {
			throw new Error('Category is required');
		}

		return await prisma.budget.create({
			data: {
				amount: data.amount,
				month: data.month,
				categoryId,
				userId,
			},
		});
	},

	/**
	 * Get all budgets for a user
	 * Includes category and calculated spent amount
	 */
	async getBudgets(userId: string, filters?: GetBudgetsInput) {
		const budgets = await prisma.budget.findMany({
			where: {
				userId,
				month: filters?.month,
			},
			include: {
				category: true,
				expenses: true, // To calculate spent amount
			},
			orderBy: {
				amount: 'desc',
			},
		});

		// Calculate spent amount for each budget
		return budgets.map((budget) => {
			const spent = budget.expenses.reduce(
				(sum, expense) => sum + expense.amount.toNumber(),
				0
			);
			return {
				...budget,
				spent,
				remaining: budget.amount.toNumber() - spent,
				percentage: (spent / budget.amount.toNumber()) * 100,
			};
		});
	},

	/**
	 * Get a single budget by ID
	 */
	async getBudgetById(userId: string, budgetId: string) {
		return await prisma.budget.findUnique({
			where: { id: budgetId, userId },
			include: {
				category: true,
			},
		});
	},

	/**
	 * Update a budget
	 */
	async updateBudget(userId: string, data: UpdateBudgetInput) {
		const { id, ...updateData } = data;
		return await prisma.budget.update({
			where: { id, userId },
			data: updateData,
		});
	},

	/**
	 * Delete a budget
	 */
	async deleteBudget(userId: string, budgetId: string) {
		return await prisma.budget.delete({
			where: { id: budgetId, userId },
		});
	},
};
