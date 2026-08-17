import { Resend } from 'resend';
import { EmailProviderKey } from '@prisma/client';
import {
	EmailProvider,
	EmailSendError,
	ResolvedEmailConfig,
	SendEmailInput,
	SendResult,
	VerifyResult,
	formatAddress,
} from '../email.provider';
import { redactSecrets } from '../email.crypto';

/**
 * Resend error codes that represent a transient condition worth another attempt.
 *
 * Quota codes are deliberately NOT retryable: BullMQ's exponential backoff tops
 * out in minutes, so a daily/monthly cap will still be spent on the third try.
 * Better to fail fast, record it, and let the next scheduler tick re-enqueue.
 */
const RETRYABLE_CODES = new Set([
	'rate_limit_exceeded',
	'internal_server_error',
	'application_error',
	'concurrent_idempotent_requests',
]);

/**
 * Client cache keyed by API key so rotating credentials in the admin UI takes
 * effect without a process restart, while a stable key reuses one client.
 */
const clients = new Map<string, Resend>();

function getClient(apiKey: string): Resend {
	let client = clients.get(apiKey);
	if (!client) {
		client = new Resend(apiKey);
		clients.set(apiKey, client);
	}
	return client;
}

export const resendProvider: EmailProvider = {
	key: EmailProviderKey.RESEND,

	async send(
		input: SendEmailInput,
		config: ResolvedEmailConfig
	): Promise<SendResult> {
		const client = getClient(config.apiKey);

		// The provider owns the envelope address; only the display name and
		// reply-to may be overridden per user, so a user can never send as
		// someone else's address.
		const fromName = input.identity?.fromName ?? config.fromName;
		const replyTo = input.identity?.replyTo ?? config.replyToEmail;

		const { data, error } = await client.emails.send(
			{
				from: formatAddress(config.fromEmail, fromName),
				to: input.to,
				subject: input.subject,
				html: input.html,
				...(input.text ? { text: input.text } : {}),
				...(replyTo ? { replyTo } : {}),
				...(input.tags ? { tags: input.tags } : {}),
				...(input.attachments
					? {
							attachments: input.attachments.map((a) => ({
								filename: a.filename,
								content: a.content,
								contentType: a.contentType,
							})),
						}
					: {}),
			},
			input.idempotencyKey
				? { idempotencyKey: input.idempotencyKey }
				: undefined
		);

		if (error) {
			throw new EmailSendError(redactSecrets(error.message), {
				retryable: RETRYABLE_CODES.has(error.name),
				providerCode: error.name,
			});
		}

		if (!data?.id) {
			// Defensive: the SDK contract says one of data/error is always set.
			throw new EmailSendError('Resend returned no message id.', {
				retryable: true,
			});
		}

		return { providerMessageId: data.id, provider: EmailProviderKey.RESEND };
	},

	async verify(config: ResolvedEmailConfig): Promise<VerifyResult> {
		try {
			// Listing domains touches auth without sending mail, so a misconfigured
			// key is reported before anything reaches a real inbox.
			const { error } = await getClient(config.apiKey).domains.list();

			if (error) {
				return { ok: false, message: redactSecrets(error.message) };
			}

			return {
				ok: true,
				message: `Credentials accepted for ${config.fromEmail}.`,
			};
		} catch (err) {
			return {
				ok: false,
				message: redactSecrets(
					err instanceof Error ? err.message : 'Unknown verification failure.'
				),
			};
		}
	},
};
