import { z } from 'zod';
import { EmailProviderKey } from '@prisma/client';

const providerKeys = Object.values(EmailProviderKey) as [string, ...string[]];

export const updateEmailConfigSchema = z.object({
	provider: z.enum(providerKeys, { error: 'Unknown email provider' }),
	fromEmail: z.string().email('A valid sender address is required'),
	fromName: z
		.string()
		.trim()
		.min(1, 'A sender name is required')
		.max(100, 'Sender name is too long'),
	/**
	 * Credential values keyed by the provider's declared CredentialField names.
	 * A blank or omitted field means "keep the stored value" — the UI never
	 * receives a stored secret, so blank must not be read as "clear it".
	 * Which fields are required is the provider's declaration to enforce, not
	 * this schema's, so that adding a provider needs no change here.
	 */
	credentials: z.record(z.string(), z.string()).default({}),
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
