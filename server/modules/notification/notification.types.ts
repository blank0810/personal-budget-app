import { z } from 'zod';

export const updatePreferenceSchema = z.object({
	key: z.string().min(1),
	enabled: z.boolean(),
	channel: z.enum(['EMAIL', 'SMS']).default('EMAIL'),
});

export type UpdatePreferenceInput = z.infer<typeof updatePreferenceSchema>;

export const updatePhoneNumberSchema = z.object({
	phoneNumber: z
		.string()
		.regex(/^\+639\d{9}$/, 'Must be a valid PH number (+639XXXXXXXXX)')
		.nullable(),
});

export const updateEmailNotificationsEnabledSchema = z.object({
	enabled: z.boolean(),
});

export const updateNotificationEmailSchema = z.object({
	email: z.string().email('Must be a valid email address').nullable(),
});

export type MergedPreference = {
	key: string;
	label: string;
	description: string;
	category: string;
	emailEnabled: boolean;
	smsEnabled: boolean;
};
