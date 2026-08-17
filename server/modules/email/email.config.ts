import { IntegrationCategory, IntegrationProvider } from '@prisma/client';
import { IntegrationService } from '@/server/modules/integration/integration.service';
import { EmailNotConfiguredError, ResolvedEmailConfig } from './email.provider';
import { emailSettingsSchema } from './email.types';

/**
 * Email's view of the shared `integrations` table.
 *
 * Storage, encryption, and the one-active-per-category rule belong to
 * IntegrationService. This module owns only what is email-specific: which
 * settings shape is valid, and how to present it to the send path.
 *
 * Credentials are entered under Admin → System and stored encrypted; they are
 * deliberately not readable from env. Putting the API key in env would defeat the
 * reason this is DB-backed — rotating a credential or switching provider without
 * a redeploy — and would leave the same secret in two places. The one secret that
 * must stay in env is SECRET_ENCRYPTION_KEY, which encrypts the table and
 * therefore cannot live inside it.
 */

const CATEGORY = IntegrationCategory.EMAIL;
const CACHE_TTL_MS = 60_000;

/** Credential keys the email integration requires. Resend needs just the one. */
export const REQUIRED_EMAIL_CREDENTIALS = ['apiKey'];

type CacheEntry = { config: ResolvedEmailConfig | null; expiresAt: number };
let cache: CacheEntry | null = null;

/**
 * Drop the memoised config. Called by the admin controller after a write; the
 * TTL covers other instances that never saw the invalidation.
 */
export function clearEmailConfigCache(): void {
	cache = null;
}

async function resolve(): Promise<ResolvedEmailConfig | null> {
	const row = await IntegrationService.getActive(CATEGORY);
	if (!row) return null;

	// Settings live in an untyped JSON column, so validate on read as well as on
	// write. This is what recovers the guarantee a NOT NULL column would have
	// given: a row hand-edited into an invalid shape reports as unconfigured
	// instead of sending mail with an empty From address.
	const settings = emailSettingsSchema.safeParse(row.settings);
	if (!settings.success) {
		console.error(
			'Active email integration has invalid settings:',
			settings.error.issues[0]?.message
		);
		return null;
	}

	const apiKey = row.credentials.apiKey;
	if (!apiKey) {
		console.error('Active email integration has no API key stored.');
		return null;
	}

	return {
		provider: row.provider,
		apiKey,
		fromEmail: settings.data.fromEmail,
		fromName: settings.data.fromName,
		replyToEmail: settings.data.replyToEmail,
	};
}

/** Resolved config, or null when email is not configured at all. */
export async function getEmailConfig(): Promise<ResolvedEmailConfig | null> {
	const now = Date.now();
	if (cache && cache.expiresAt > now) return cache.config;

	const config = await resolve();
	cache = { config, expiresAt: now + CACHE_TTL_MS };
	return config;
}

/** Resolved config or throw. Use on the send path. */
export async function requireEmailConfig(): Promise<ResolvedEmailConfig> {
	const config = await getEmailConfig();
	if (!config) throw new EmailNotConfiguredError();
	return config;
}

export const EmailConfigService = {
	/**
	 * Save the email provider config and make it the active one.
	 *
	 * A blank or omitted `apiKey` keeps the stored one — the UI never receives a
	 * stored secret, so blank means "unchanged", never "clear it".
	 */
	async upsert(input: {
		provider: IntegrationProvider;
		fromEmail: string;
		fromName: string;
		replyToEmail: string | null;
		apiKey?: string;
	}) {
		const settings = emailSettingsSchema.parse({
			fromEmail: input.fromEmail,
			fromName: input.fromName,
			replyToEmail: input.replyToEmail,
		});

		const result = await IntegrationService.upsert({
			category: CATEGORY,
			provider: input.provider,
			credentials: input.apiKey ? { apiKey: input.apiKey } : {},
			settings,
			requiredCredentials: REQUIRED_EMAIL_CREDENTIALS,
		});

		clearEmailConfigCache();
		return result;
	},

	/**
	 * Config for the admin UI. Reports whether a credential is stored, never its
	 * value — secrets are write-only across this boundary.
	 */
	async getForAdmin() {
		const rows = await IntegrationService.listForAdmin(CATEGORY);

		return {
			configured: rows.some((r) => r.isActive),
			providers: rows.map((row) => {
				// Tolerate an invalid stored shape here rather than throwing: the
				// admin needs the panel to render precisely so they can fix it.
				const settings = emailSettingsSchema.safeParse(row.settings);

				return {
					provider: row.provider,
					isActive: row.isActive,
					fromEmail: settings.success ? settings.data.fromEmail : '',
					fromName: settings.success ? settings.data.fromName : '',
					replyToEmail: settings.success ? settings.data.replyToEmail : null,
					hasCredential: row.storedCredentialKeys.includes('apiKey'),
					lastVerifiedAt: row.lastVerifiedAt,
					lastError: row.lastError,
				};
			}),
		};
	},

	async recordVerification(
		provider: IntegrationProvider,
		result: { ok: boolean; message: string }
	) {
		await IntegrationService.recordVerification(CATEGORY, provider, result);
		clearEmailConfigCache();
	},
};
