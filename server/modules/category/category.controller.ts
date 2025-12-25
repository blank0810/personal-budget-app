'use server';

import { auth } from '@/auth';
import { CategoryService } from './category.service';
import type { CategoryType } from '@prisma/client';

/**
 * Get categories for the authenticated user
 */
export async function getCategoriesAction(type?: CategoryType) {
	const session = await auth();

	if (!session?.user?.id) {
		return { error: 'Unauthorized' };
	}

	try {
		const categories = await CategoryService.getCategories(
			session.user.id,
			type
		);
		return { categories };
	} catch (error) {
		console.error('Error fetching categories:', error);
		return { error: 'Failed to fetch categories' };
	}
}
