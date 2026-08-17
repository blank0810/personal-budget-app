import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
	logFindUnique: vi.fn(),
	logCreate: vi.fn(),
	logUpsert: vi.fn(),
	requireEmailConfig: vi.fn(),
	checkQuota: vi.fn(),
	providerSend: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
	default: {
		emailSendLog: {
			findUnique: mocks.logFindUnique,
			create: mocks.logCreate,
			upsert: mocks.logUpsert,
		},
	},
}));

vi.mock('./email.config', () => ({
	requireEmailConfig: mocks.requireEmailConfig,
}));

vi.mock('./email.quota', () => ({ checkQuota: mocks.checkQuota }));

vi.mock('./providers/registry', () => ({
	getProvider: () => ({ key: 'RESEND', send: mocks.providerSend }),
}));

const { EmailService } = await import('./email.service');
const { EmailQuotaExceededError, EmailSendError } = await import(
	'./email.provider'
);

const CONFIG = {
	provider: 'RESEND' as const,
	apiKey: 're_test',
	fromEmail: 'noreply@budget.umbra.build',
	fromName: 'Budget Planner',
	replyToEmail: null,
	isBootstrap: false,
};

describe('EmailService dispatch', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.logFindUnique.mockResolvedValue(null);
		mocks.requireEmailConfig.mockResolvedValue(CONFIG);
		mocks.checkQuota.mockResolvedValue({ allowed: true });
		mocks.providerSend.mockResolvedValue({
			providerMessageId: 'msg_1',
			provider: 'RESEND',
		});
	});

	it('sends and records a SENT log', async () => {
		const result = await EmailService.send({
			to: 'a@b.com',
			subject: 'Hi',
			html: '<p>Hi</p>',
			userId: 'u1',
			notificationKey: 'budget_alerts',
		});

		expect(result).toEqual({ id: 'msg_1' });
		expect(mocks.providerSend).toHaveBeenCalledOnce();
		expect(mocks.logCreate).toHaveBeenCalledWith({
			data: expect.objectContaining({
				status: 'SENT',
				userId: 'u1',
				notificationKey: 'budget_alerts',
				priority: 'NORMAL',
				recipient: 'a@b.com',
				providerMessageId: 'msg_1',
			}),
		});
	});

	it('defaults to NORMAL priority', async () => {
		await EmailService.send({ to: 'a@b.com', subject: 'S', html: 'H' });
		expect(mocks.checkQuota).toHaveBeenCalledWith('NORMAL');
	});

	describe('quota', () => {
		beforeEach(() => {
			mocks.checkQuota.mockResolvedValue({
				allowed: false,
				sentToday: 60,
				dailyLimit: 100,
			});
		});

		it('suppresses the send, logs it, and throws', async () => {
			await expect(
				EmailService.send({ to: 'a@b.com', subject: 'S', html: 'H' })
			).rejects.toThrow(EmailQuotaExceededError);

			expect(mocks.providerSend).not.toHaveBeenCalled();
			expect(mocks.logCreate).toHaveBeenCalledWith({
				data: expect.objectContaining({ status: 'SUPPRESSED_QUOTA' }),
			});
		});

		it('never suppresses a password reset', async () => {
			// CRITICAL bypasses the guard inside checkQuota, so a suppressing stub
			// must not be consulted for it at all.
			mocks.checkQuota.mockResolvedValue({ allowed: true });

			await EmailService.sendPasswordReset({
				email: 'a@b.com',
				token: 't',
				userName: 'A',
			});

			expect(mocks.checkQuota).toHaveBeenCalledWith('CRITICAL');
			expect(mocks.providerSend).toHaveBeenCalledOnce();
		});
	});

	describe('idempotency', () => {
		it('short-circuits when the same key already sent', async () => {
			mocks.logFindUnique.mockResolvedValue({
				id: 'log_1',
				status: 'SENT',
				providerMessageId: 'msg_prior',
			});

			const result = await EmailService.send({
				to: 'a@b.com',
				subject: 'S',
				html: 'H',
				idempotencyKey: 'report:u1:2026-08-01',
			});

			expect(result).toEqual({ id: 'msg_prior' });
			expect(mocks.providerSend).not.toHaveBeenCalled();
		});

		it('retries when the prior attempt failed', async () => {
			mocks.logFindUnique.mockResolvedValue({
				id: 'log_1',
				status: 'FAILED',
				providerMessageId: null,
			});

			await EmailService.send({
				to: 'a@b.com',
				subject: 'S',
				html: 'H',
				idempotencyKey: 'report:u1:2026-08-01',
			});

			expect(mocks.providerSend).toHaveBeenCalledOnce();
		});

		it('upserts rather than inserts for keyed sends, so a retry cannot collide', async () => {
			await EmailService.send({
				to: 'a@b.com',
				subject: 'S',
				html: 'H',
				idempotencyKey: 'report:u1:2026-08-01',
			});

			expect(mocks.logCreate).not.toHaveBeenCalled();
			expect(mocks.logUpsert).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { idempotencyKey: 'report:u1:2026-08-01' },
				})
			);
		});
	});

	describe('failures', () => {
		it('logs FAILED and rethrows, preserving retryability', async () => {
			mocks.providerSend.mockRejectedValue(
				new EmailSendError('bad recipient', {
					retryable: false,
					providerCode: 'validation_error',
				})
			);

			await expect(
				EmailService.send({ to: 'bad', subject: 'S', html: 'H' })
			).rejects.toMatchObject({ retryable: false });

			expect(mocks.logCreate).toHaveBeenCalledWith({
				data: expect.objectContaining({
					status: 'FAILED',
					error: 'bad recipient',
				}),
			});
		});

		it('redacts provider keys out of the logged error', async () => {
			mocks.providerSend.mockRejectedValue(
				new Error('auth failed for re_abcd1234efgh5678')
			);

			await expect(
				EmailService.send({ to: 'a@b.com', subject: 'S', html: 'H' })
			).rejects.toThrow();

			const logged = mocks.logCreate.mock.calls[0][0].data.error;
			expect(logged).toBe('auth failed for re_[redacted]');
		});
	});

	describe('invoice mail', () => {
		it('sends HIGH priority with the sender as display name and reply-to', async () => {
			await EmailService.sendInvoice({
				to: 'client@acme.com',
				invoiceNumber: 'INV-001',
				fromName: 'Acme Consulting',
				fromEmail: 'me@example.com',
				clientName: 'Acme Co',
				totalFormatted: '$100.00',
				dueDate: new Date('2026-09-01'),
				notes: null,
				pdfBuffer: Buffer.from('pdf'),
				userId: 'u1',
				dedupeKey: 'invoice:inv1:sent',
			});

			expect(mocks.checkQuota).toHaveBeenCalledWith('HIGH');

			const [input] = mocks.providerSend.mock.calls[0];
			expect(input.identity).toEqual({
				fromName: 'Acme Consulting',
				replyTo: 'me@example.com',
			});
			expect(input.attachments).toHaveLength(1);
			expect(input.attachments[0].contentType).toBe('application/pdf');
			expect(input.idempotencyKey).toBe('invoice:inv1:sent');
		});

		it('omits the idempotency key when none is supplied, so a resend always delivers', async () => {
			await EmailService.sendInvoice({
				to: 'client@acme.com',
				invoiceNumber: 'INV-001',
				fromName: null,
				fromEmail: null,
				clientName: 'Acme Co',
				totalFormatted: '$100.00',
				dueDate: new Date('2026-09-01'),
				notes: null,
				pdfBuffer: Buffer.from('pdf'),
			});

			const [input] = mocks.providerSend.mock.calls[0];
			expect(input.idempotencyKey).toBeUndefined();
			expect(mocks.logFindUnique).not.toHaveBeenCalled();
		});
	});
});
