import crypto from 'crypto';

/**
 * Authenticated encryption for third-party integration secrets at rest.
 *
 * Shared across integrations — email provider credentials today, any future
 * connected service tomorrow — hence SECRET_ENCRYPTION_KEY rather than a
 * per-feature key.
 *
 * Deliberately NOT keyed by NEXTAUTH_SECRET: that value already silently governs
 * unsubscribe-token validity (see report.service.ts), and rotating auth must not
 * also render every stored integration credential unreadable.
 *
 * Ciphertext format: `v1:<iv>:<authTag>:<ciphertext>`, each part base64.
 * The version prefix exists so a future key rotation or algorithm change can be
 * detected instead of failing as corrupt data.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // GCM standard nonce length
const KEY_BYTES = 32;
const VERSION = 'v1';

export class SecretCryptoError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'SecretCryptoError';
	}
}

function getKey(): Buffer {
	const raw = process.env.SECRET_ENCRYPTION_KEY;
	if (!raw) {
		throw new SecretCryptoError(
			'SECRET_ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32'
		);
	}

	let key: Buffer;
	try {
		key = Buffer.from(raw, 'base64');
	} catch {
		throw new SecretCryptoError(
			'SECRET_ENCRYPTION_KEY is not valid base64.'
		);
	}

	if (key.length !== KEY_BYTES) {
		throw new SecretCryptoError(
			`SECRET_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes, got ${key.length}. Generate one with: openssl rand -base64 32`
		);
	}

	return key;
}

/** Encrypt a credential for storage. Never log the input or the output. */
export function seal(plaintext: string): string {
	const key = getKey();
	const iv = crypto.randomBytes(IV_BYTES);
	const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

	const ciphertext = Buffer.concat([
		cipher.update(plaintext, 'utf8'),
		cipher.final(),
	]);
	const authTag = cipher.getAuthTag();

	return [
		VERSION,
		iv.toString('base64'),
		authTag.toString('base64'),
		ciphertext.toString('base64'),
	].join(':');
}

/**
 * Decrypt a stored credential. Throws on tampering (GCM auth failure), on an
 * unknown version, or on a malformed payload — all of which should be treated as
 * "provider not configured" rather than retried.
 */
export function open(sealed: string): string {
	const key = getKey();
	const parts = sealed.split(':');

	if (parts.length !== 4) {
		throw new SecretCryptoError('Stored credential is malformed.');
	}

	const [version, ivB64, tagB64, dataB64] = parts;
	if (version !== VERSION) {
		throw new SecretCryptoError(
			`Unsupported credential format "${version}".`
		);
	}

	const decipher = crypto.createDecipheriv(
		ALGORITHM,
		key,
		Buffer.from(ivB64, 'base64')
	);
	decipher.setAuthTag(Buffer.from(tagB64, 'base64'));

	try {
		return Buffer.concat([
			decipher.update(Buffer.from(dataB64, 'base64')),
			decipher.final(),
		]).toString('utf8');
	} catch {
		// GCM auth tag mismatch: wrong key, or the row was tampered with.
		throw new SecretCryptoError(
			'Stored credential could not be decrypted. SECRET_ENCRYPTION_KEY may have changed.'
		);
	}
}

/**
 * Strip anything that looks like a provider key out of text bound for a log or
 * the `lastError` column. Belt-and-braces: provider errors occasionally echo the
 * offending request back.
 */
export function redactSecrets(text: string): string {
	return text.replace(/\b(re|sk|key)_[A-Za-z0-9_-]{8,}\b/g, '$1_[redacted]');
}
