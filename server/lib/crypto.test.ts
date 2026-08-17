import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import {
	seal,
	open,
	redactSecrets,
	SecretCryptoError,
} from './crypto';

const VALID_KEY = crypto.randomBytes(32).toString('base64');
const OTHER_KEY = crypto.randomBytes(32).toString('base64');

describe('lib/crypto', () => {
	const original = process.env.SECRET_ENCRYPTION_KEY;

	beforeEach(() => {
		process.env.SECRET_ENCRYPTION_KEY = VALID_KEY;
	});

	afterEach(() => {
		if (original === undefined) delete process.env.SECRET_ENCRYPTION_KEY;
		else process.env.SECRET_ENCRYPTION_KEY = original;
	});

	describe('seal / open', () => {
		it('round-trips a credential', () => {
			const secret = 're_abc123DEF456_lorem';
			expect(open(seal(secret))).toBe(secret);
		});

		it('never emits the plaintext in the ciphertext', () => {
			const secret = 're_supersecretvalue';
			expect(seal(secret)).not.toContain(secret);
		});

		it('produces a different ciphertext each time (random IV)', () => {
			const secret = 're_abc123';
			expect(seal(secret)).not.toBe(seal(secret));
		});

		it('round-trips unicode and empty values', () => {
			expect(open(seal(''))).toBe('');
			expect(open(seal('ключ—🔑'))).toBe('ключ—🔑');
		});

		it('rejects a tampered ciphertext (GCM auth tag)', () => {
			const sealed = seal('re_abc123');
			const parts = sealed.split(':');
			// Flip the payload while leaving the version, IV, and tag intact.
			const tampered = [
				parts[0],
				parts[1],
				parts[2],
				Buffer.from('totally different bytes').toString('base64'),
			].join(':');

			expect(() => open(tampered)).toThrow(SecretCryptoError);
		});

		it('rejects a ciphertext sealed under a different key', () => {
			const sealed = seal('re_abc123');
			process.env.SECRET_ENCRYPTION_KEY = OTHER_KEY;
			expect(() => open(sealed)).toThrow(SecretCryptoError);
		});

		it('rejects a malformed payload', () => {
			expect(() => open('not-a-sealed-value')).toThrow(SecretCryptoError);
		});

		it('rejects an unknown format version', () => {
			const sealed = seal('re_abc123');
			const parts = sealed.split(':');
			parts[0] = 'v99';
			expect(() => open(parts.join(':'))).toThrow(/Unsupported credential/);
		});
	});

	describe('key validation', () => {
		it('throws a clear error when the key is absent', () => {
			delete process.env.SECRET_ENCRYPTION_KEY;
			expect(() => seal('x')).toThrow(/SECRET_ENCRYPTION_KEY is not set/);
		});

		it('throws when the key is the wrong length', () => {
			process.env.SECRET_ENCRYPTION_KEY = Buffer.from('too-short').toString(
				'base64'
			);
			expect(() => seal('x')).toThrow(/must decode to 32 bytes/);
		});
	});

	describe('redactSecrets', () => {
		it('strips provider-key-shaped tokens from error text', () => {
			const text = 'Auth failed for re_abcd1234efgh5678 on request';
			expect(redactSecrets(text)).toBe(
				'Auth failed for re_[redacted] on request'
			);
		});

		it('leaves ordinary text untouched', () => {
			const text = 'Recipient address is invalid';
			expect(redactSecrets(text)).toBe(text);
		});
	});
});
