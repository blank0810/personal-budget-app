import { EmailPriority, EmailStatus, IntegrationProvider } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireEmailConfig } from './email.config';
import { redactSecrets } from '@/server/lib/crypto';
import { checkQuota } from './email.quota';
import { getProvider } from './providers/registry';
import {
	EmailAttachment,
	EmailIdentity,
	EmailQuotaExceededError,
	EmailTag,
	SendEmailInput,
} from './email.provider';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Email Service
 *
 * Transactional email over the configured provider (see providers/registry.ts).
 * The public method signatures are intentionally unchanged from the Gmail SMTP
 * version this replaces, so every existing call site works untouched — the
 * provider abstraction sits underneath the API, not through it.
 */

type DispatchInput = SendEmailInput & {
	/** Defaults to NORMAL, the only tier the daily-quota guard suppresses. */
	priority?: EmailPriority;
	/** Owner of this mail, for the audit trail. Null for admin/system mail. */
	userId?: string | null;
	/** NotificationType key when this mail is governed by a preference. */
	notificationKey?: string | null;
};

type LogOutcome = {
	status: EmailStatus;
	provider?: IntegrationProvider | null;
	providerMessageId?: string | null;
	error?: string | null;
};

/**
 * Record the outcome of a send attempt.
 *
 * Keyed messages upsert, so the row is the message's current state rather than
 * one row per attempt. That matters for two reasons: a FAILED or
 * SUPPRESSED_QUOTA attempt must not permanently occupy the unique key and block
 * its own retry, and a later successful retry must not collide with the earlier
 * row. Unkeyed messages simply append.
 */
async function writeLog(
	input: DispatchInput,
	priority: EmailPriority,
	outcome: LogOutcome
) {
	const data = {
		userId: input.userId ?? null,
		notificationKey: input.notificationKey ?? null,
		priority,
		status: outcome.status,
		provider: outcome.provider ?? null,
		recipient: input.to,
		subject: input.subject,
		providerMessageId: outcome.providerMessageId ?? null,
		error: outcome.error ?? null,
	};

	if (!input.idempotencyKey) {
		await prisma.emailSendLog.create({ data });
		return;
	}

	await prisma.emailSendLog.upsert({
		where: { idempotencyKey: input.idempotencyKey },
		update: data,
		create: { ...data, idempotencyKey: input.idempotencyKey },
	});
}

/**
 * Single send path: resolve config → quota gate → provider → audit log.
 *
 * Every exit writes an EmailSendLog row (or reuses one), so "did this user get
 * the mail?" is answerable after the fact — something the SMTP implementation
 * could not do at all.
 */
async function dispatch(input: DispatchInput): Promise<{ id: string }> {
	const priority = input.priority ?? EmailPriority.NORMAL;

	// Local idempotency check. The provider also dedupes (Resend: 24h), but
	// short-circuiting here saves an API call, works across providers, and keeps
	// the log from growing a second row for the same logical message.
	if (input.idempotencyKey) {
		const prior = await prisma.emailSendLog.findUnique({
			where: { idempotencyKey: input.idempotencyKey },
		});
		if (prior?.status === EmailStatus.SENT) {
			return { id: prior.providerMessageId ?? prior.id };
		}
	}

	// Resolve before the quota check so a missing provider reports as
	// "not configured" rather than as a quota problem.
	const config = await requireEmailConfig();

	const quota = await checkQuota(priority);
	if (!quota.allowed) {
		await writeLog(input, priority, {
			status: EmailStatus.SUPPRESSED_QUOTA,
			provider: config.provider,
		});
		throw new EmailQuotaExceededError(quota.sentToday, quota.dailyLimit);
	}

	const provider = getProvider(config.provider);

	try {
		const result = await provider.send(input, config);

		await writeLog(input, priority, {
			status: EmailStatus.SENT,
			provider: result.provider,
			providerMessageId: result.providerMessageId,
		});

		return { id: result.providerMessageId };
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Unknown send failure';

		await writeLog(input, priority, {
			status: EmailStatus.FAILED,
			provider: config.provider,
			error: redactSecrets(message).slice(0, 2000),
		});

		throw error;
	}
}

export class EmailService {
	/**
	 * Send a generic email.
	 */
	static async send({
		to,
		subject,
		html,
		priority,
		userId,
		notificationKey,
		idempotencyKey,
		identity,
		tags,
	}: {
		to: string;
		subject: string;
		html: string;
		priority?: EmailPriority;
		userId?: string | null;
		notificationKey?: string | null;
		idempotencyKey?: string;
		identity?: EmailIdentity;
		tags?: EmailTag[];
	}) {
		return dispatch({
			to,
			subject,
			html,
			priority,
			userId,
			notificationKey,
			idempotencyKey,
			identity,
			tags,
		});
	}

	/**
	 * Send an email with file attachments.
	 */
	static async sendWithAttachment({
		to,
		subject,
		html,
		attachments,
		priority,
		userId,
		notificationKey,
		idempotencyKey,
		identity,
		tags,
	}: {
		to: string;
		subject: string;
		html: string;
		attachments: EmailAttachment[];
		priority?: EmailPriority;
		userId?: string | null;
		notificationKey?: string | null;
		idempotencyKey?: string;
		identity?: EmailIdentity;
		tags?: EmailTag[];
	}) {
		return dispatch({
			to,
			subject,
			html,
			attachments,
			priority,
			userId,
			notificationKey,
			idempotencyKey,
			identity,
			tags,
		});
	}

	/**
	 * Send an invoice to a client with the rendered PDF attached.
	 *
	 * Client-facing, so HIGH priority: a freelancer's invoice is never withheld
	 * to protect the app's own digest quota. The sender's name and email become
	 * the display name and Reply-To, so a client hitting reply reaches the
	 * freelancer rather than the app's mailbox.
	 */
	static async sendInvoice({
		to,
		invoiceNumber,
		fromName,
		fromEmail,
		clientName,
		totalFormatted,
		dueDate,
		notes,
		pdfBuffer,
		userId,
		dedupeKey,
	}: {
		to: string;
		invoiceNumber: string;
		fromName: string | null;
		fromEmail: string | null;
		clientName: string;
		totalFormatted: string;
		dueDate: Date;
		notes: string | null;
		pdfBuffer: Buffer;
		userId?: string | null;
		/** Caller-supplied dedupe key; omitted on deliberate resends. */
		dedupeKey?: string;
	}) {
		const dueLabel = dueDate.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
		const senderLine = fromName ?? fromEmail ?? 'Your service provider';
		const replyLine = fromEmail
			? `If you have any questions, simply reply to this email or contact ${fromEmail}.`
			: 'If you have any questions, simply reply to this email.';

		const html = `
			<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111111;">
				<h2 style="font-family: serif; font-size: 24px; margin-bottom: 16px;">Invoice ${invoiceNumber}</h2>
				<p>Hi ${clientName},</p>
				<p>Please find attached invoice <strong>${invoiceNumber}</strong> for <strong>${totalFormatted}</strong>, due on <strong>${dueLabel}</strong>.</p>
				${notes ? `<p style="background-color: #f5f5f5; padding: 12px; border-radius: 6px; white-space: pre-line;">${notes}</p>` : ''}
				<p>${replyLine}</p>
				<p>Thank you,<br/>${senderLine}</p>
			</div>
		`;

		return dispatch({
			to,
			subject: `Invoice ${invoiceNumber} from ${senderLine}`,
			html,
			attachments: [
				{
					filename: `${invoiceNumber}.pdf`,
					content: pdfBuffer,
					contentType: 'application/pdf',
				},
			],
			identity: { fromName, replyTo: fromEmail },
			priority: EmailPriority.HIGH,
			userId,
			...(dedupeKey ? { idempotencyKey: dedupeKey } : {}),
			tags: [{ name: 'kind', value: 'invoice' }],
		});
	}

	/**
	 * Send a paid-invoice receipt to a client with the PAID-stamped PDF attached.
	 */
	static async sendInvoiceReceipt({
		to,
		invoiceNumber,
		fromName,
		fromEmail,
		clientName,
		totalFormatted,
		paidAt,
		pdfBuffer,
		userId,
		dedupeKey,
	}: {
		to: string;
		invoiceNumber: string;
		fromName: string | null;
		fromEmail: string | null;
		clientName: string;
		totalFormatted: string;
		paidAt: Date;
		pdfBuffer: Buffer;
		userId?: string | null;
		/** Caller-supplied dedupe key; omitted on deliberate resends. */
		dedupeKey?: string;
	}) {
		const paidLabel = paidAt.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
		const senderLine = fromName ?? fromEmail ?? 'Your service provider';
		const replyLine = fromEmail
			? `If you have any questions, simply reply to this email or contact ${fromEmail}.`
			: 'If you have any questions, simply reply to this email.';

		const html = `
			<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111111;">
				<h2 style="font-family: serif; font-size: 24px; margin-bottom: 16px;">Payment Received</h2>
				<p>Hi ${clientName},</p>
				<p>Thank you — we've recorded payment of <strong>${totalFormatted}</strong> against invoice <strong>${invoiceNumber}</strong> on <strong>${paidLabel}</strong>.</p>
				<p>A PAID copy of the invoice is attached for your records.</p>
				<p>${replyLine}</p>
				<p>Thank you,<br/>${senderLine}</p>
			</div>
		`;

		return dispatch({
			to,
			subject: `Receipt — Invoice ${invoiceNumber} paid`,
			html,
			attachments: [
				{
					filename: `${invoiceNumber}-paid.pdf`,
					content: pdfBuffer,
					contentType: 'application/pdf',
				},
			],
			identity: { fromName, replyTo: fromEmail },
			priority: EmailPriority.HIGH,
			userId,
			...(dedupeKey ? { idempotencyKey: dedupeKey } : {}),
			tags: [{ name: 'kind', value: 'invoice_receipt' }],
		});
	}

	/**
	 * Send a password reset email.
	 *
	 * CRITICAL: someone is sitting on a page waiting for this, so it is never
	 * quota-suppressed and carries no idempotency key (a second request must
	 * always produce a fresh mail for the newest token).
	 */
	static async sendPasswordReset({
		email,
		token,
		userName,
	}: {
		email: string;
		token: string;
		userName: string;
	}) {
		const resetUrl = `${APP_URL}/reset-password?token=${token}`;

		const html = `
			<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
				<h2>Password Reset</h2>
				<p>Hi ${userName},</p>
				<p>You requested a password reset for your Budget Planner account.</p>
				<p>
					<a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0f172a; color: #ffffff; text-decoration: none; border-radius: 6px;">
						Reset Password
					</a>
				</p>
				<p>Or copy this link: <a href="${resetUrl}">${resetUrl}</a></p>
				<p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
			</div>
		`;

		return dispatch({
			to: email,
			subject: 'Reset your password - Budget Planner',
			html,
			priority: EmailPriority.CRITICAL,
			tags: [{ name: 'kind', value: 'password_reset' }],
		});
	}
}
