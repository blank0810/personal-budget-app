'use server';

import { getAuthenticatedUser } from '@/server/lib/auth-guard';
import { NotificationChannel } from '@prisma/client';
import { NotificationService } from './notification.service';
import { SmsService } from './sms.service';
import {
	updatePreferenceSchema,
	updatePhoneNumberSchema,
	updateEmailNotificationsEnabledSchema,
	updateNotificationEmailSchema,
} from './notification.types';
import { invalidateTags } from '@/server/actions/cache';
import { CACHE_TAGS } from '@/server/lib/cache-tags';
import { UserService } from '@/server/modules/user/user.service';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

/**
 * Server Action: Get notification preferences for current user
 */
export async function getNotificationPreferencesAction() {
	const userId = await getAuthenticatedUser();

	try {
		const preferences = await NotificationService.getPreferencesForUser(userId);
		return { success: true as const, data: preferences };
	} catch (error) {
		console.error('Failed to get notification preferences:', error);
		return { error: 'Failed to get notification preferences' };
	}
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
		invalidateTags(CACHE_TAGS.PROFILE);
		return { success: true as const };
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
		await UserService.updatePhoneNumber(userId, validated.data.phoneNumber);
		invalidateTags(CACHE_TAGS.PROFILE);
		return { success: true as const };
	} catch (error) {
		console.error('Failed to update phone number:', error);
		return { error: 'Failed to update phone number' };
	}
}

/**
 * Server Action: Update the master email-notifications toggle
 */
export async function updateEmailNotificationsEnabledAction(enabled: boolean) {
	const userId = await getAuthenticatedUser();

	const validated = updateEmailNotificationsEnabledSchema.safeParse({ enabled });
	if (!validated.success) {
		return { error: validated.error.issues[0].message };
	}

	try {
		await UserService.setEmailNotificationsEnabled(userId, validated.data.enabled);
		invalidateTags(CACHE_TAGS.PROFILE);
		return { success: true as const };
	} catch (error) {
		console.error('Failed to update email notifications setting:', error);
		return { error: 'Failed to update email notifications setting' };
	}
}

/**
 * Server Action: Update the notification delivery email (null = account email)
 */
export async function updateNotificationEmailAction(email: string | null) {
	const userId = await getAuthenticatedUser();

	const validated = updateNotificationEmailSchema.safeParse({ email });
	if (!validated.success) {
		return { error: validated.error.issues[0].message };
	}

	try {
		await UserService.setNotificationEmail(userId, validated.data.email);
		invalidateTags(CACHE_TAGS.PROFILE);
		return { success: true as const };
	} catch (error) {
		console.error('Failed to update notification email:', error);
		return { error: 'Failed to update notification email' };
	}
}

/**
 * Server Action: Send a test SMS to the user's phone number (direct, not queued)
 */
export async function sendTestSmsAction() {
	const userId = await getAuthenticatedUser();

	try {
		const user = await UserService.getPhoneAndName(userId);

		if (!user.phoneNumber) {
			return { error: 'No phone number set' };
		}

		const message = `[Budget Planner] SMS test passed! Notifications are live for ${user.name || 'User'}. Stay on budget!`;

		const success = await SmsService.send(user.phoneNumber, message);
		if (!success) {
			return { error: 'SMS delivery failed. Check your API key and number.' };
		}

		return { success: true as const };
	} catch (error) {
		console.error('Failed to send test SMS:', error);
		return { error: 'Failed to send test SMS' };
	}
}

// --- Profile Actions ---

const updateProfileSchema = z.object({
	name: z.string().min(2, 'Name must be at least 2 characters'),
});

/**
 * Trim a string and coerce empty/whitespace-only values to null.
 * Used for optional business-profile text fields.
 */
const optionalTrimmedText = (max: number, label: string) =>
	z
		.string()
		.nullish()
		.transform((value) => {
			const trimmed = value?.trim() ?? '';
			return trimmed === '' ? null : trimmed;
		})
		.refine((value) => value === null || value.length <= max, {
			message: `${label} must be at most ${max} characters`,
		});

const updateBusinessProfileSchema = z.object({
	businessName: optionalTrimmedText(200, 'Business name'),
	businessAddress: optionalTrimmedText(1000, 'Business address'),
	businessTaxId: optionalTrimmedText(100, 'Tax ID'),
	paymentInstructions: optionalTrimmedText(2000, 'Payment instructions'),
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
		await UserService.updateName(userId, validated.data.name);
		invalidateTags(CACHE_TAGS.PROFILE);
		return { success: true as const };
	} catch (error) {
		console.error('Failed to update profile:', error);
		return { error: 'Failed to update profile' };
	}
}

/**
 * Server Action: Update user business / freelancer profile (invoice sender identity)
 */
export async function updateBusinessProfileAction(data: {
	businessName: string | null;
	businessAddress: string | null;
	businessTaxId: string | null;
	paymentInstructions: string | null;
}) {
	const userId = await getAuthenticatedUser();

	const validated = updateBusinessProfileSchema.safeParse(data);
	if (!validated.success) {
		return { error: validated.error.issues[0].message };
	}

	try {
		await UserService.updateBusinessProfile(userId, validated.data);
		invalidateTags(CACHE_TAGS.PROFILE);
		return { success: true as const };
	} catch (error) {
		console.error('Failed to update business profile:', error);
		return { error: 'Failed to update business profile' };
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
		const currentHash = await UserService.getPassword(userId);

		// If user has a password, verify current one
		if (currentHash) {
			if (!validated.data.currentPassword) {
				return { error: 'Current password is required' };
			}
			const match = await bcrypt.compare(
				validated.data.currentPassword,
				currentHash
			);
			if (!match) {
				return { error: 'Current password is incorrect' };
			}
		}

		const hashedPassword = await bcrypt.hash(validated.data.newPassword, 10);
		await UserService.updatePassword(userId, hashedPassword);

		invalidateTags(CACHE_TAGS.PROFILE);
		return { success: true as const };
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
		const hasPassword = await UserService.getHasPassword(userId);

		if (!hasPassword) {
			return { error: 'Set a password before disconnecting your provider' };
		}

		// Delete the auth account link
		await prisma.authAccount.deleteMany({
			where: { userId, provider },
		});

		invalidateTags(CACHE_TAGS.PROFILE);
		return { success: true as const };
	} catch (error) {
		console.error('Failed to disconnect provider:', error);
		return { error: 'Failed to disconnect provider' };
	}
}
