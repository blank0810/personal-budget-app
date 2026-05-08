import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
	host: 'smtp.gmail.com',
	port: 465,
	secure: true,
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
	},
});

const EMAIL_FROM = process.env.SMTP_USER || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Email Service
 * Transactional email sending via Gmail SMTP
 */
export class EmailService {
	/**
	 * Send a generic email
	 */
	static async send({
		to,
		subject,
		html,
	}: {
		to: string;
		subject: string;
		html: string;
	}) {
		try {
			const info = await transporter.sendMail({
				from: EMAIL_FROM,
				to,
				subject,
				html,
			});
			return { id: info.messageId };
		} catch (error) {
			console.error('Failed to send email:', error);
			throw new Error(
				`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Send an email with file attachments
	 */
	static async sendWithAttachment({
		to,
		subject,
		html,
		attachments,
	}: {
		to: string;
		subject: string;
		html: string;
		attachments: Array<{
			filename: string;
			content: Buffer;
			contentType: string;
		}>;
	}) {
		try {
			const info = await transporter.sendMail({
				from: EMAIL_FROM,
				to,
				subject,
				html,
				attachments,
			});
			return { id: info.messageId };
		} catch (error) {
			console.error('Failed to send email with attachment:', error);
			throw new Error(
				`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Send an invoice to a client with the rendered PDF attached.
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

		return this.sendWithAttachment({
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
		});
	}

	/**
	 * Send a password reset email
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

		return this.send({
			to: email,
			subject: 'Reset your password - Budget Planner',
			html,
		});
	}
}
