import { IntegrationProvider } from '@prisma/client';
import { EmailProvider } from '../email.provider';
import { resendProvider } from './resend.provider';

/**
 * Provider registry. Mirrors the automation registry pattern: the code-side map
 * is the source of truth, and `satisfies` makes the compiler reject a new
 * IntegrationProvider enum value until an adapter exists for it.
 *
 * Adding a provider is: write the adapter, add the enum value, add it here.
 * No call site changes.
 */
export const EMAIL_PROVIDERS = {
	[IntegrationProvider.RESEND]: resendProvider,
} satisfies Record<IntegrationProvider, EmailProvider>;

export function getProvider(key: IntegrationProvider): EmailProvider {
	return EMAIL_PROVIDERS[key];
}

/** Providers offered in the admin config UI, in display order. */
export const AVAILABLE_PROVIDERS: ReadonlyArray<{
	key: IntegrationProvider;
	label: string;
}> = [{ key: IntegrationProvider.RESEND, label: 'Resend' }];
