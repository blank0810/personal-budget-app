'use server';

import { auth } from '@/auth';
import { headers } from 'next/headers';
import { FeatureRequestService } from './feature-request.service';
import { submitRequestSchema } from './feature-request.types';

export async function submitFeatureRequestAction(data: {
	title: string;
	description: string;
	category: string;
	email: string;
}) {
	const validated = submitRequestSchema.safeParse(data);
	if (!validated.success) {
		return { error: validated.error.issues[0].message };
	}

	// Get IP for rate limiting
	const headersList = await headers();
	const ip =
		headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
		headersList.get('x-real-ip') ||
		'unknown';

	// Check rate limit
	const isLimited = await FeatureRequestService.isRateLimited(ip);
	if (isLimited) {
		return { error: 'Too many requests. Please try again later.' };
	}

	// Check if user is authenticated (optional)
	let userId: string | undefined;
	try {
		const session = await auth();
		userId = session?.user?.id;
	} catch {
		// Not authenticated — fine for public submissions
	}

	try {
		await FeatureRequestService.create({
			title: validated.data.title,
			description: validated.data.description,
			category: validated.data.category as 'BUG' | 'ENHANCEMENT' | 'NEW_FEATURE' | 'UI_UX',
			email: validated.data.email,
			userId,
			ip,
		});

		return { success: true };
	} catch (error) {
		console.error('Failed to submit feature request:', error);
		return { error: 'Failed to submit request. Please try again.' };
	}
}
