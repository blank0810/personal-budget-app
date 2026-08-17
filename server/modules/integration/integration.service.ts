import {
	IntegrationCategory,
	IntegrationProvider,
	Prisma,
} from '@prisma/client';
import prisma from '@/lib/prisma';
import { open, seal } from '@/server/lib/crypto';

/**
 * Storage layer shared by every third-party integration.
 *
 * What every integration needs is identical — which provider, whether it is
 * active, its encrypted credentials, and its last verification result — so it
 * lives here once instead of being re-implemented per category. What differs
 * (which credentials, which settings, how to verify, how to call the service) is
 * adapter code owned by the category's own module.
 *
 * This service never decides policy. It does not know what a "from address" is;
 * it stores whatever settings a category hands it and gives them back.
 */

export type StoredIntegration = {
	category: IntegrationCategory;
	provider: IntegrationProvider;
	isActive: boolean;
	/** Decrypted secrets, keyed however the category's adapter chose. */
	credentials: Record<string, string>;
	/** Raw non-secret properties. Callers must validate before use. */
	settings: Prisma.JsonValue;
	lastVerifiedAt: Date | null;
	lastError: string | null;
};

/**
 * Decode a sealed credential blob.
 *
 * Sealed as a JSON object of named values rather than a bare string, so an
 * integration that grows a second secret (Resend's webhook signing secret
 * alongside its API key) needs no data migration. A sealed bare string is read
 * as `{ apiKey }` for rows written before this shape existed.
 */
function decodeCredentials(sealed: string): Record<string, string> {
	const plaintext = open(sealed);

	try {
		const parsed = JSON.parse(plaintext);
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
			return parsed as Record<string, string>;
		}
	} catch {
		// Not JSON — a bare key from the first iteration.
	}

	return { apiKey: plaintext };
}

/** Decode without throwing, for display paths that must render regardless. */
function safeDecodeCredentials(sealed: string): Record<string, string> {
	try {
		return decodeCredentials(sealed);
	} catch {
		return {};
	}
}

export const IntegrationService = {
	/**
	 * The active integration for a category, with credentials decrypted.
	 *
	 * Returns null when none is active, or when the stored credentials cannot be
	 * decrypted — a rotated SECRET_ENCRYPTION_KEY or a tampered row is a permanent
	 * condition, so callers should treat it as "not configured" rather than retry.
	 */
	async getActive(
		category: IntegrationCategory
	): Promise<StoredIntegration | null> {
		const row = await prisma.integration.findFirst({
			where: { category, isActive: true },
		});

		if (!row) return null;

		try {
			return {
				category: row.category,
				provider: row.provider,
				isActive: row.isActive,
				credentials: decodeCredentials(row.credentials),
				settings: row.settings,
				lastVerifiedAt: row.lastVerifiedAt,
				lastError: row.lastError,
			};
		} catch (error) {
			console.error(
				`Active ${category} integration could not be decrypted:`,
				error instanceof Error ? error.message : error
			);
			return null;
		}
	},

	/**
	 * Save an integration and make it the only active one in its category.
	 *
	 * Credentials MERGE over what is stored, and blank values are dropped first:
	 * the admin UI never receives a stored secret, so an untouched field must read
	 * as "unchanged" and never as "clear it". Settings, being non-secret and fully
	 * present in the form, replace wholesale.
	 */
	async upsert(input: {
		category: IntegrationCategory;
		provider: IntegrationProvider;
		credentials?: Record<string, string>;
		settings: Prisma.InputJsonValue;
		/** Credential keys that must be present after merging. */
		requiredCredentials?: string[];
	}) {
		const existing = await prisma.integration.findUnique({
			where: {
				category_provider: {
					category: input.category,
					provider: input.provider,
				},
			},
		});

		const stored = existing
			? safeDecodeCredentials(existing.credentials)
			: {};

		const supplied = Object.fromEntries(
			Object.entries(input.credentials ?? {}).filter(
				([, value]) => value.trim() !== ''
			)
		);

		const credentials = { ...stored, ...supplied };

		const missing = (input.requiredCredentials ?? []).filter(
			(key) => !credentials[key]
		);
		if (missing.length > 0) {
			throw new Error(`Missing required credential: ${missing.join(', ')}`);
		}

		// Sealed once, outside the branches. An earlier version inlined the seal
		// call in a Prisma upsert's `create` block, which JS evaluates even when
		// only `update` runs — so saving a settings change without re-entering the
		// secret threw. Hence explicit update/create.
		const sealed = seal(JSON.stringify(credentials));

		const result = await prisma.$transaction(async (tx) => {
			// At most one active per category. Deactivating first keeps the invariant
			// true at every point a concurrent reader could observe.
			await tx.integration.updateMany({
				where: {
					category: input.category,
					provider: { not: input.provider },
					isActive: true,
				},
				data: { isActive: false },
			});

			const data = {
				isActive: true,
				credentials: sealed,
				settings: input.settings,
				// Credentials or settings changed, so any prior verification no
				// longer applies.
				lastVerifiedAt: null,
				lastError: null,
			};

			if (existing) {
				return tx.integration.update({ where: { id: existing.id }, data });
			}

			return tx.integration.create({
				data: {
					...data,
					category: input.category,
					provider: input.provider,
				},
			});
		});

		return result;
	},

	/**
	 * Every integration in a category, for the admin UI.
	 *
	 * Exposes which credential keys are populated — never a value, not even
	 * masked. Secrets are write-only across this boundary.
	 */
	async listForAdmin(category: IntegrationCategory) {
		const rows = await prisma.integration.findMany({
			where: { category },
			orderBy: { provider: 'asc' },
		});

		return rows.map((row) => ({
			provider: row.provider,
			isActive: row.isActive,
			settings: row.settings,
			storedCredentialKeys: Object.keys(
				safeDecodeCredentials(row.credentials)
			),
			lastVerifiedAt: row.lastVerifiedAt,
			lastError: row.lastError,
		}));
	},

	async recordVerification(
		category: IntegrationCategory,
		provider: IntegrationProvider,
		result: { ok: boolean; message: string }
	) {
		await prisma.integration.updateMany({
			where: { category, provider },
			data: result.ok
				? { lastVerifiedAt: new Date(), lastError: null }
				: { lastError: result.message },
		});
	},
};
