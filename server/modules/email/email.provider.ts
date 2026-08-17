import { IntegrationProvider } from '@prisma/client';

/**
 * Provider-neutral send contract.
 *
 * Every field here maps cleanly onto Resend today, but the shapes are chosen to
 * be the lowest common denominator across transactional providers (SES,
 * Postmark, Mailgun) so adding an adapter never forces a change at a call site.
 */

export type EmailAttachment = {
	filename: string;
	content: Buffer;
	contentType: string;
};

/**
 * Per-send sender identity. Lets client-facing invoice mail carry the
 * freelancer's name and reply address while still going out over the app's
 * provider credentials. Null members fall back to the app-level config.
 */
export type EmailIdentity = {
	fromName: string | null;
	replyTo: string | null;
};

export type EmailTag = {
	name: string;
	value: string;
};

export type SendEmailInput = {
	to: string;
	subject: string;
	html: string;
	/**
	 * Optional plaintext part. Resend derives one from `html` when omitted, so
	 * callers only set this when they want explicit control.
	 */
	text?: string;
	attachments?: EmailAttachment[];
	identity?: EmailIdentity;
	/**
	 * Deduplication key. Providers honour this for a bounded window (Resend:
	 * 24h), which is what stops a BullMQ retry re-sending a report the first
	 * attempt already delivered.
	 */
	idempotencyKey?: string;
	tags?: EmailTag[];
};

export type SendResult = {
	providerMessageId: string;
	provider: IntegrationProvider;
};

export type VerifyResult = {
	ok: boolean;
	message: string;
};

/**
 * Provider config after decryption. Adapters receive this rather than reading
 * env or the database themselves, so they stay pure and testable.
 */
export type ResolvedEmailConfig = {
	provider: IntegrationProvider;
	/**
	 * The provider's API key. Resend authenticates with a single key as a Bearer
	 * token — no key/secret pair. At rest this is one field inside a sealed JSON
	 * object, so Resend's separate webhook signing secret can be added later
	 * without a data migration.
	 */
	apiKey: string;
	fromEmail: string;
	fromName: string;
	replyToEmail: string | null;
};

export interface EmailProvider {
	readonly key: IntegrationProvider;
	send(input: SendEmailInput, config: ResolvedEmailConfig): Promise<SendResult>;
	/** Credential/identity smoke test behind the admin "send test" button. */
	verify(config: ResolvedEmailConfig): Promise<VerifyResult>;
}

/** Missing or malformed credentials for the configured provider. */
export class EmailCredentialError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'EmailCredentialError';
	}
}

/**
 * A send that reached the provider and was rejected.
 *
 * `retryable` is the contract that matters to callers: the report queue must not
 * burn its three BullMQ attempts on a permanent rejection, and the invoice
 * services need to tell "this client email is invalid" apart from "the provider
 * is briefly down" when composing their non-fatal warning.
 */
export class EmailSendError extends Error {
	readonly retryable: boolean;
	readonly providerCode: string | null;

	constructor(
		message: string,
		options: { retryable: boolean; providerCode?: string | null }
	) {
		super(message);
		this.name = 'EmailSendError';
		this.retryable = options.retryable;
		this.providerCode = options.providerCode ?? null;
	}
}

/**
 * No active provider config. Thrown rather than silently dropped so each caller
 * keeps its existing failure semantics: password reset surfaces to the user,
 * notifications hit their `.catch(() => {})`, invoices return an emailWarning,
 * report jobs fail into retry.
 */
export class EmailNotConfiguredError extends Error {
	constructor() {
		super(
			'No email provider is configured. Set one up under Admin → System.'
		);
		this.name = 'EmailNotConfiguredError';
	}
}

/**
 * The daily provider quota is spent and this send was not important enough to
 * consume the reserve. Never thrown for CRITICAL or HIGH priority mail.
 */
export class EmailQuotaExceededError extends Error {
	constructor(sentToday: number, dailyLimit: number) {
		super(
			`Daily email quota reached (${sentToday}/${dailyLimit}); this message was suppressed to protect transactional mail.`
		);
		this.name = 'EmailQuotaExceededError';
	}
}

/** Compose an RFC 5322 From/Reply-To value, preferring a display name. */
export function formatAddress(email: string, name: string | null): string {
	if (!name) return email;
	// Quote the display name and escape embedded quotes/backslashes so a name
	// like `Acme "Co" \ Ltd` cannot break out of the header.
	const escaped = name.replace(/([\\"])/g, '\\$1');
	return `"${escaped}" <${email}>`;
}
