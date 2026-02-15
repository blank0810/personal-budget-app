import { z } from 'zod';

export const submitRequestSchema = z.object({
	title: z.string().min(3, 'Title must be at least 3 characters').max(100),
	description: z.string().min(10, 'Description must be at least 10 characters').max(1000),
	category: z.enum(['BUG', 'ENHANCEMENT', 'NEW_FEATURE', 'UI_UX']),
	email: z.string().email('Invalid email address'),
});

export type SubmitRequestInput = z.infer<typeof submitRequestSchema>;

export const CATEGORY_LABELS: Record<string, string> = {
	BUG: 'Bug Report',
	ENHANCEMENT: 'Enhancement',
	NEW_FEATURE: 'New Feature',
	UI_UX: 'UI/UX',
};
