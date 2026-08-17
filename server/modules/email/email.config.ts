import { EmailProviderKey } from '@prisma/client';
import prisma from '@/lib/prisma';
import { open, seal } from './email.crypto';
import { EmailNotConfiguredError, ResolvedEmailConfig } from './email.provider';

/**
 * Resolution order for the active provider config:
 *
 *   1. The active EmailProviderConfig row (set under Admin → System).
 *   2. Env bootstrap — RESEND_API_KEY + EMAIL_FROM.
 *
 * The env fallback exists so the migration that removes SMTP does not leave a
 * window where all mail is down before an admin has clicked anything, and so
 * local dev works with no admin steps at all.
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

function readEnvBootstrap(): ResolvedEmailConfig | null {
	const apiKey = process.env.RESEND_API_KEY;
	const fromEmail = process.env.EMAIL_FROM;
	if (!apiKey || !fromEmail) return null;

	return {
		provider: EmailProviderKey.RESEND,
		apiKey,
		fromEmail,
		fromName: process.env.EMAIL_FROM_NAME || 'Budget Planner',
		replyToEmail: process.env.EMAIL_REPLY_TO || null,
		isBootstrap: true,
	};
}

async function resolve(): Promise<ResolvedEmailConfig | null> {
	const row = await prisma.emailProviderConfig.findFirst({
		where: { isActive: true },
	});

	if (row) {
		try {
			return {
				provider: row.provider,
				apiKey: open(row.credentials),
				fromEmail: row.fromEmail,
				fromName: row.fromName,
				replyToEmail: row.replyToEmail,
				isBootstrap: false,
			};
		} catch (error) {
			// An undecryptable row (rotated key, tampered value) must not silently
			// fall through to env with different sender identity — surface it.
			console.error(
				'Active email provider config could not be decrypted:',
				error instanceof Error ? error.message : error
			);
			return null;
		}
	}

	return readEnvBootstrap();
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

		const result = await prisma.$transaction(async (tx) => {
			// Exactly one active provider. Deactivating first keeps the invariant
			// true at every point a concurrent reader could observe.
			await tx.emailProviderConfig.updateMany({
				where: { provider: { not: input.provider }, isActive: true },
				data: { isActive: false },
			});

			return tx.emailProviderConfig.upsert({
				where: { provider: input.provider },
				update: {
					fromEmail: input.fromEmail,
					fromName: input.fromName,
					replyToEmail: input.replyToEmail,
					isActive: true,
					...(input.apiKey ? { credentials: seal(input.apiKey) } : {}),
					// Identity changed, so any prior verification no longer applies.
					lastVerifiedAt: null,
					lastError: null,
				},
				create: {
					provider: input.provider,
					fromEmail: input.fromEmail,
					fromName: input.fromName,
					replyToEmail: input.replyToEmail,
					isActive: true,
					credentials: seal(input.apiKey!),
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

		const bootstrap = readEnvBootstrap();

		return {
			// True when nothing is stored but env can still send, so the UI can say
			// "running on env bootstrap" instead of "not configured".
			usingEnvBootstrap: rows.every((r) => !r.isActive) && bootstrap !== null,
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
