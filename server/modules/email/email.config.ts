import { EmailProviderKey } from '@prisma/client';
import prisma from '@/lib/prisma';
import { open, seal } from '@/server/lib/crypto';
import { EmailNotConfiguredError, ResolvedEmailConfig } from './email.provider';
import { getProvider } from './providers/registry';

/**
 * The active EmailProviderConfig row is the ONLY source of provider config.
 *
 * Credentials are entered under Admin → System and stored encrypted; they are
 * deliberately not readable from env. Putting the API key in env would defeat
 * the reason this is DB-backed in the first place — rotating a credential or
 * switching provider without a redeploy — and would leave the same secret in two
 * places. The one secret that must stay in env is SECRET_ENCRYPTION_KEY, which
 * encrypts this table and therefore cannot live inside it.
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

/**
 * Decode a sealed credential blob.
 *
 * Stored as a sealed JSON object of named values, so a provider needing more
 * than one credential (SES: access key id + secret + region; a webhook signing
 * secret alongside a sending key) needs no schema change. A sealed bare string
 * is tolerated as `{ apiKey }` for rows written by the first iteration.
 */
function decodeCredentials(sealed: string): Record<string, string> {
	const plaintext = open(sealed);

	try {
		const parsed = JSON.parse(plaintext);
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
			return parsed as Record<string, string>;
		}
	} catch {
		// Not JSON — fall through to the legacy single-key shape.
	}

	return { apiKey: plaintext };
}

async function resolve(): Promise<ResolvedEmailConfig | null> {
	const row = await prisma.emailProviderConfig.findFirst({
		where: { isActive: true },
	});

	if (!row) return null;

	try {
		return {
			provider: row.provider,
			credentials: decodeCredentials(row.credentials),
			fromEmail: row.fromEmail,
			fromName: row.fromName,
			replyToEmail: row.replyToEmail,
		};
	} catch (error) {
		// Undecryptable row: SECRET_ENCRYPTION_KEY was rotated or the value was
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
	 * Credentials merge rather than replace: a field the admin left blank keeps
	 * its stored value. The UI never receives a stored secret, so a blank input
	 * means "unchanged" and must never be read as "clear it".
	 */
	async upsert(input: {
		provider: EmailProviderKey;
		fromEmail: string;
		fromName: string;
		replyToEmail: string | null;
		credentials?: Record<string, string>;
	}) {
		const existing = await prisma.emailProviderConfig.findUnique({
			where: { provider: input.provider },
		});

		const stored = existing ? safeDecode(existing.credentials) : {};

		// Drop blanks before merging so an untouched field cannot erase a secret.
		const supplied = Object.fromEntries(
			Object.entries(input.credentials ?? {}).filter(
				([, value]) => value.trim() !== ''
			)
		);

		const merged = { ...stored, ...supplied };

		const missing = getProvider(input.provider)
			.credentialFields.filter((f) => f.required && !merged[f.name])
			.map((f) => f.label);

		if (missing.length > 0) {
			throw new Error(`Missing required credential: ${missing.join(', ')}`);
		}

		// Sealed once, outside the branches. An earlier version inlined the seal
		// call in a Prisma upsert's `create` block, which JS evaluates even when
		// only `update` runs — so saving an identity change without re-entering the
		// key threw. Hence explicit update/create.
		const sealed = seal(JSON.stringify(merged));

		const result = await prisma.$transaction(async (tx) => {
			// Exactly one active provider. Deactivating first keeps the invariant
			// true at every point a concurrent reader could observe.
			await tx.emailProviderConfig.updateMany({
				where: { provider: { not: input.provider }, isActive: true },
				data: { isActive: false },
			});

			const data = {
				fromEmail: input.fromEmail,
				fromName: input.fromName,
				replyToEmail: input.replyToEmail,
				isActive: true,
				credentials: sealed,
				// Identity or credentials changed, so any prior verification no
				// longer applies.
				lastVerifiedAt: null,
				lastError: null,
			};

			if (existing) {
				return tx.emailProviderConfig.update({
					where: { provider: input.provider },
					data,
				});
			}

			return tx.emailProviderConfig.create({
				data: { ...data, provider: input.provider },
			});
		});

		clearEmailConfigCache();
		return result;
	},

	/**
	 * Config for the admin UI. Returns which credential fields are populated —
	 * never their values. Secrets are write-only across this boundary.
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
				storedCredentialFields: Object.keys(safeDecode(row.credentials)),
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

/**
 * Decode for display/merge paths, where an undecryptable row must not crash the
 * admin panel — it should render as "no credentials stored" so the admin can
 * re-enter them.
 */
function safeDecode(sealed: string): Record<string, string> {
	try {
		return decodeCredentials(sealed);
	} catch {
		return {};
	}
}
