'use server';

import { auth } from '@/auth';
import { NotificationChannel } from '@prisma/client';
import { NotificationService } from './notification.service';
import { SmsService } from './sms.service';
import { updatePreferenceSchema, updatePhoneNumberSchema } from './notification.types';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

/**
 * Helper to authenticate user
 */
async function getAuthenticatedUser() {
	const session = await auth();
	if (!session?.user?.id) {
		throw new Error('Unauthorized');
	}
	return session.user.id;
}

/**
 * Server Action: Get notification preferences for current user
 */
export async function getNotificationPreferencesAction() {
	const userId = await getAuthenticatedUser();
	return NotificationService.getPreferencesForUser(userId);
}

/**
 * Server Action: Update a notification preference (per channel)
 */
export async function updateNotificationPreferenceAction(
	key: string,
	enabled: boolean,
	channel: NotificationChannel = 'EMAIL'
) {
	const userId = await getAuthenticatedUser();

	const validated = updatePreferenceSchema.safeParse({ key, enabled, channel });
	if (!validated.success) {
		return { error: 'Invalid input' };
	}

	try {
		await NotificationService.updatePreference(
			userId,
			key,
			enabled,
			channel
		);
		revalidatePath('/profile');
		return { success: true };
	} catch (error) {
		console.error('Failed to update notification preference:', error);
		return { error: 'Failed to update preference' };
	}
}

/**
 * Server Action: Update user phone number
 */
export async function updatePhoneNumberAction(phoneNumber: string | null) {
	const userId = await getAuthenticatedUser();

	const validated = updatePhoneNumberSchema.safeParse({ phoneNumber });
	if (!validated.success) {
		return { error: validated.error.issues[0].message };
	}

	try {
		await prisma.user.update({
			where: { id: userId },
			data: { phoneNumber: validated.data.phoneNumber },
		});
		revalidatePath('/profile');
		return { success: true };
	} catch (error) {
		console.error('Failed to update phone number:', error);
		return { error: 'Failed to update phone number' };
	}
}

/**
 * Server Action: Send a test SMS to the user's phone number (direct, not queued)
 */
export async function sendTestSmsAction() {
	const userId = await getAuthenticatedUser();

	try {
		const user = await prisma.user.findUniqueOrThrow({
			where: { id: userId },
			select: { phoneNumber: true, name: true },
		});

		if (!user.phoneNumber) {
			return { error: 'No phone number set' };
		}

		const message = `[Budget Planner] SMS test passed! Notifications are live for ${user.name || 'User'}. Stay on budget!`;

		const success = await SmsService.send(user.phoneNumber, message);
		if (!success) {
			return { error: 'SMS delivery failed. Check your API key and number.' };
		}

		return { success: true };
	} catch (error) {
		console.error('Failed to send test SMS:', error);
		return { error: 'Failed to send test SMS' };
	}
}

// --- Profile Actions ---

const updateProfileSchema = z.object({
	name: z.string().min(2, 'Name must be at least 2 characters'),
});

const updatePasswordSchema = z
	.object({
		currentPassword: z.string().optional(),
		newPassword: z.string().min(6, 'Password must be at least 6 characters'),
		confirmPassword: z.string(),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword'],
	});

/**
 * Server Action: Update user profile (name)
 */
export async function updateProfileAction(data: { name: string }) {
	const userId = await getAuthenticatedUser();

	const validated = updateProfileSchema.safeParse(data);
	if (!validated.success) {
		return { error: validated.error.issues[0].message };
	}

	try {
		await prisma.user.update({
			where: { id: userId },
			data: { name: validated.data.name },
		});
		revalidatePath('/profile');
		return { success: true };
	} catch (error) {
		console.error('Failed to update profile:', error);
		return { error: 'Failed to update profile' };
	}
}

/**
 * Server Action: Update user password
 */
export async function updatePasswordAction(data: {
	currentPassword?: string;
	newPassword: string;
	confirmPassword: string;
}) {
	const userId = await getAuthenticatedUser();

	const validated = updatePasswordSchema.safeParse(data);
	if (!validated.success) {
		return { error: validated.error.issues[0].message };
	}

	try {
		const user = await prisma.user.findUniqueOrThrow({
			where: { id: userId },
			select: { password: true },
		});

		// If user has a password, verify current one
		if (user.password) {
			if (!validated.data.currentPassword) {
				return { error: 'Current password is required' };
			}
			const match = await bcrypt.compare(
				validated.data.currentPassword,
				user.password
			);
			if (!match) {
				return { error: 'Current password is incorrect' };
			}
		}

		const hashedPassword = await bcrypt.hash(validated.data.newPassword, 10);
		await prisma.user.update({
			where: { id: userId },
			data: { password: hashedPassword },
		});

		revalidatePath('/profile');
		return { success: true };
	} catch (error) {
		console.error('Failed to update password:', error);
		return { error: 'Failed to update password' };
	}
}

/**
 * Server Action: Disconnect an OAuth provider
 */
export async function disconnectProviderAction(provider: string) {
	const userId = await getAuthenticatedUser();

	try {
		// Check that user has a password set (can't disconnect if no other auth method)
		const user = await prisma.user.findUniqueOrThrow({
			where: { id: userId },
			select: { password: true },
		});

		if (!user.password) {
			return { error: 'Set a password before disconnecting your provider' };
		}

		// Delete the auth account link
		await prisma.authAccount.deleteMany({
			where: { userId, provider },
		});

		revalidatePath('/profile');
		return { success: true };
	} catch (error) {
		console.error('Failed to disconnect provider:', error);
		return { error: 'Failed to disconnect provider' };
	}
}
