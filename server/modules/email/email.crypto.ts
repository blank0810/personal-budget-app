import crypto from 'crypto';

/**
 * Authenticated encryption for provider credentials at rest.
 *
 * Deliberately keyed by a dedicated EMAIL_CREDENTIALS_KEY rather than
 * NEXTAUTH_SECRET: that secret already silently governs unsubscribe-token
 * validity (see report.service.ts), and rotating auth must not also brick mail
 * delivery.
 *
 * Ciphertext format: `v1:<iv>:<authTag>:<ciphertext>`, each part base64.
 * The version prefix exists so a future key rotation or algorithm change can be
 * detected instead of failing as corrupt data.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // GCM standard nonce length
const KEY_BYTES = 32;
const VERSION = 'v1';

export class EmailCryptoKeyError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'EmailCryptoKeyError';
	}
}

function getKey(): Buffer {
	const raw = process.env.EMAIL_CREDENTIALS_KEY;
	if (!raw) {
		throw new EmailCryptoKeyError(
			'EMAIL_CREDENTIALS_KEY is not set. Generate one with: openssl rand -base64 32'
		);
	}

	let key: Buffer;
	try {
		key = Buffer.from(raw, 'base64');
	} catch {
		throw new EmailCryptoKeyError(
			'EMAIL_CREDENTIALS_KEY is not valid base64.'
		);
	}

	if (key.length !== KEY_BYTES) {
		throw new EmailCryptoKeyError(
			`EMAIL_CREDENTIALS_KEY must decode to ${KEY_BYTES} bytes, got ${key.length}. Generate one with: openssl rand -base64 32`
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
		throw new EmailCryptoKeyError('Stored credential is malformed.');
	}

	const [version, ivB64, tagB64, dataB64] = parts;
	if (version !== VERSION) {
		throw new EmailCryptoKeyError(
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
		throw new EmailCryptoKeyError(
			'Stored credential could not be decrypted. EMAIL_CREDENTIALS_KEY may have changed.'
		);
	}
}

/**
 * Render a non-reversible hint for the admin UI, e.g. `re_••••a91f`.
 * This is the ONLY representation of a credential that may leave the server.
 */
export function maskCredential(plaintext: string): string {
	if (plaintext.length <= 8) return '••••';
	const prefix = plaintext.slice(0, 3);
	const suffix = plaintext.slice(-4);
	return `${prefix}••••${suffix}`;
}

/**
 * Strip anything that looks like a provider key out of text bound for a log or
 * the `lastError` column. Belt-and-braces: provider errors occasionally echo the
 * offending request back.
 */
export function redactSecrets(text: string): string {
	return text.replace(/\b(re|sk|key)_[A-Za-z0-9_-]{8,}\b/g, '$1_[redacted]');
}
