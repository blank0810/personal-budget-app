'use server';

import { getAuthenticatedUser } from '@/server/lib/auth-guard';
import { CategoryService } from './category.service';
import type { CategoryType } from '@prisma/client';

/**
 * Get categories for the authenticated user
 */
export async function getCategoriesAction(type?: CategoryType) {
	const userId = await getAuthenticatedUser();

	try {
		const categories = await CategoryService.getCategories(userId, type);
		return { success: true as const, data: categories };
	} catch (error) {
		console.error('Error fetching categories:', error);
		return { error: 'Failed to fetch categories' };
	}
}

/**
 * Get frequently used expense categories (last 3 months)
 */
export async function getFrequentCategoriesAction() {
	const userId = await getAuthenticatedUser();

	try {
		const frequentCategories = await CategoryService.getFrequentCategories(
			userId,
			5
		);
		return { success: true as const, data: frequentCategories };
	} catch (error) {
		console.error('Failed to get frequent categories:', error);
		return { error: 'Failed to get frequent categories' };
	}
}
