import prisma from '@/lib/prisma';
import type { Category, CategoryType } from '@prisma/client';

/**
 * Category Service
 * Centralized category management logic
 */
export class CategoryService {
	/**
	 * Get all categories for a user, optionally filtered by type
	 */
	static async getCategories(
		userId: string,
		type?: CategoryType
	): Promise<Category[]> {
		return await prisma.category.findMany({
			where: {
				userId,
				...(type && { type }),
			},
			orderBy: [{ type: 'asc' }, { name: 'asc' }],
		});
	}

	/**
	 * Get a category by name and type for a specific user
	 */
	static async getCategoryByName(
		userId: string,
		name: string,
		type: CategoryType
	): Promise<Category | null> {
		return await prisma.category.findUnique({
			where: {
				userId_name_type: {
					userId,
					name,
					type,
				},
			},
		});
	}

	/**
	 * Create a new category
	 */
	static async createCategory(
		userId: string,
		name: string,
		type: CategoryType,
		icon?: string,
		color?: string
	): Promise<Category> {
		return await prisma.category.create({
			data: {
				userId,
				name,
				type,
				icon,
				color,
			},
		});
	}

	/**
	 * Get or create a category (upsert operation)
	 * If category exists, return it. Otherwise, create it.
	 */
	static async getOrCreateCategory(
		userId: string,
		name: string,
		type: CategoryType,
		icon?: string,
		color?: string
	): Promise<Category> {
		// First, try to find the category
		const existing = await this.getCategoryByName(userId, name, type);

		if (existing) {
			return existing;
		}

		// If not found, create it
		return await this.createCategory(userId, name, type, icon, color);
	}

	/**
	 * Update a category
	 */
	static async updateCategory(
		categoryId: string,
		userId: string,
		data: {
			name?: string;
			icon?: string;
			color?: string;
		}
	): Promise<Category> {
		// Verify ownership before updating
		const category = await prisma.category.findFirst({
			where: { id: categoryId, userId },
		});

		if (!category) {
			throw new Error('Category not found or unauthorized');
		}

		return await prisma.category.update({
			where: { id: categoryId },
			data,
		});
	}

	/**
	 * Delete a category
	 */
	static async deleteCategory(
		categoryId: string,
		userId: string
	): Promise<void> {
		// Verify ownership before deleting
		const category = await prisma.category.findFirst({
			where: { id: categoryId, userId },
		});

		if (!category) {
			throw new Error('Category not found or unauthorized');
		}

		await prisma.category.delete({
			where: { id: categoryId },
		});
	}
}
