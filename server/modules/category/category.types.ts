import { z } from 'zod';
import { CategoryType } from '@prisma/client';

export const createCategorySchema = z.object({
	name: z.string().min(1, 'Name is required').max(100),
	type: z.nativeEnum(CategoryType),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
	id: z.string().min(1, 'ID is required'),
	name: z.string().min(1, 'Name is required').max(100).optional(),
	icon: z.string().optional(),
	color: z.string().optional(),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
