import { z } from 'zod';
import { IntegrationProvider } from '@prisma/client';

const providerKeys = Object.values(IntegrationProvider) as [
	string,
	...string[],
];

/**
 * The email integration's non-secret properties, as stored in
 * `Integration.settings`.
 *
 * That column is untyped JSON, so this schema is the contract instead — applied
 * on write AND on read. Validating on read is what replaces the column-level
 * NOT NULL these fields would have had as real columns.
 */
export const emailSettingsSchema = z.object({
	fromEmail: z.string().email('A valid sender address is required'),
	fromName: z
		.string()
		.trim()
		.min(1, 'A sender name is required')
		.max(100, 'Sender name is too long'),
	replyToEmail: z
		.string()
		.email('Reply-to must be a valid email')
		.nullable()
		.default(null),
});

export type EmailSettings = z.infer<typeof emailSettingsSchema>;

export const updateEmailConfigSchema = z.object({
	provider: z.enum(providerKeys, { error: 'Unknown email provider' }),
	fromEmail: z.string().email('A valid sender address is required'),
	fromName: z
		.string()
		.trim()
		.min(1, 'A sender name is required')
		.max(100, 'Sender name is too long'),
	/**
	 * Empty string means "keep the stored key" — the UI never receives the current
	 * value, so a blank field must not be read as "clear it".
	 */
	apiKey: z.string().trim().default(''),
	replyToEmail: z
		.union([z.string().email('Reply-to must be a valid email'), z.literal('')])
		.default(''),
});

export type UpdateEmailConfigInput = z.infer<typeof updateEmailConfigSchema>;

export const sendTestEmailSchema = z.object({
	/** Blank sends to the signed-in admin's own account email. */
	to: z
		.union([z.string().email('Enter a valid email address'), z.literal('')])
		.default(''),
});
