import { EmailProviderKey } from '@prisma/client';
import { EmailProvider } from '../email.provider';
import { resendProvider } from './resend.provider';

/**
 * Provider registry. Mirrors the automation registry pattern: the code-side map
 * is the source of truth, and `satisfies` makes the compiler reject a new
 * EmailProviderKey enum value until an adapter exists for it.
 *
 * Adding a provider is: write the adapter, add the enum value, add it here.
 * No call site changes.
 */
export const EMAIL_PROVIDERS = {
	[EmailProviderKey.RESEND]: resendProvider,
} satisfies Record<EmailProviderKey, EmailProvider>;

export function getProvider(key: EmailProviderKey): EmailProvider {
	return EMAIL_PROVIDERS[key];
}

/** Providers offered in the admin config UI, in display order. */
export const AVAILABLE_PROVIDERS: ReadonlyArray<{
	key: EmailProviderKey;
	label: string;
}> = [{ key: EmailProviderKey.RESEND, label: 'Resend' }];
