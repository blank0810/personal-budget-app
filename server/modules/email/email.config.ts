import { EmailProviderKey } from '@prisma/client';
import prisma from '@/lib/prisma';
import { open, seal } from './email.crypto';
import { EmailNotConfiguredError, ResolvedEmailConfig } from './email.provider';

/**
 * The active EmailProviderConfig row is the ONLY source of provider config.
 *
 * Credentials are entered under Admin → System and stored encrypted; they are
 * deliberately not readable from env. Putting the API key in env would defeat
 * the reason this is DB-backed in the first place — rotating a credential or
 * switching provider without a redeploy — and would leave the same secret in two
 * places. The one email secret that must stay in env is EMAIL_CREDENTIALS_KEY,
 * which encrypts this table and therefore cannot live inside it.
 */

const CACHE_TTL_MS = 60_000;

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
	const row = await prisma.emailProviderConfig.findFirst({
		where: { isActive: true },
	});

	if (!row) return null;

	try {
		return {
			provider: row.provider,
			apiKey: open(row.credentials),
			fromEmail: row.fromEmail,
			fromName: row.fromName,
			replyToEmail: row.replyToEmail,
		};
	} catch (error) {
		// Undecryptable row: EMAIL_CREDENTIALS_KEY was rotated or the value was
		// tampered with. Report as "not configured" so callers keep their existing
		// failure semantics rather than retrying a permanent condition.
		console.error(
			'Active email provider config could not be decrypted:',
			error instanceof Error ? error.message : error
		);
		return null;
	}
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
	 * Upsert a provider's config and make it the only active one.
	 *
	 * `apiKey` is optional on update so an admin can edit the sender identity
	 * without re-entering the credential — the UI never receives the current
	 * value, so it cannot echo it back.
	 */
	async upsert(input: {
		provider: EmailProviderKey;
		fromEmail: string;
		fromName: string;
		replyToEmail: string | null;
		apiKey?: string;
	}) {
		const existing = await prisma.emailProviderConfig.findUnique({
			where: { provider: input.provider },
		});

		if (!existing && !input.apiKey) {
			throw new Error('An API key is required when adding a provider.');
		}

		// Sealed once, outside the branches. An earlier version inlined
		// `seal(apiKey!)` in an upsert's `create` block, which JS evaluates even
		// when only `update` is used — so saving an identity change without
		// re-entering the key threw. Hence explicit update/create.
		const sealed = input.apiKey ? seal(input.apiKey) : null;

		const result = await prisma.$transaction(async (tx) => {
			// Exactly one active provider. Deactivating first keeps the invariant
			// true at every point a concurrent reader could observe.
			await tx.emailProviderConfig.updateMany({
				where: { provider: { not: input.provider }, isActive: true },
				data: { isActive: false },
			});

			if (existing) {
				return tx.emailProviderConfig.update({
					where: { provider: input.provider },
					data: {
						fromEmail: input.fromEmail,
						fromName: input.fromName,
						replyToEmail: input.replyToEmail,
						isActive: true,
						// Absent key means "keep the stored one", never "clear it".
						...(sealed ? { credentials: sealed } : {}),
						// Identity changed, so any prior verification no longer applies.
						lastVerifiedAt: null,
						lastError: null,
					},
				});
			}

			if (!sealed) {
				throw new Error('An API key is required when adding a provider.');
			}

			return tx.emailProviderConfig.create({
				data: {
					provider: input.provider,
					fromEmail: input.fromEmail,
					fromName: input.fromName,
					replyToEmail: input.replyToEmail,
					isActive: true,
					credentials: sealed,
				},
			});
		});

		clearEmailConfigCache();
		return result;
	},

	/**
	 * Config for the admin UI. Returns a masked credential hint only — the
	 * plaintext key never crosses the server boundary.
	 */
	async getForAdmin() {
		const rows = await prisma.emailProviderConfig.findMany({
			orderBy: { provider: 'asc' },
		});

		return {
			configured: rows.some((r) => r.isActive),
			providers: rows.map((row) => ({
				provider: row.provider,
				isActive: row.isActive,
				fromEmail: row.fromEmail,
				fromName: row.fromName,
				replyToEmail: row.replyToEmail,
				hasCredential: row.credentials.length > 0,
				lastVerifiedAt: row.lastVerifiedAt,
				lastError: row.lastError,
			})),
		};
	},

	async recordVerification(
		provider: EmailProviderKey,
		result: { ok: boolean; message: string }
	) {
		await prisma.emailProviderConfig.updateMany({
			where: { provider },
			data: result.ok
				? { lastVerifiedAt: new Date(), lastError: null }
				: { lastError: result.message },
		});
		clearEmailConfigCache();
	},
};
