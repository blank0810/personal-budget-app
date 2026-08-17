import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
	getActive: vi.fn(),
	upsert: vi.fn(),
	listForAdmin: vi.fn(),
	recordVerification: vi.fn(),
}));

vi.mock('@/server/modules/integration/integration.service', () => ({
	IntegrationService: {
		getActive: mocks.getActive,
		upsert: mocks.upsert,
		listForAdmin: mocks.listForAdmin,
		recordVerification: mocks.recordVerification,
	},
}));

const {
	getEmailConfig,
	requireEmailConfig,
	clearEmailConfigCache,
	EmailConfigService,
} = await import('./email.config');
const { EmailNotConfiguredError } = await import('./email.provider');

const SETTINGS = {
	fromEmail: 'noreply@budget.umbra.build',
	fromName: 'Budget Planner',
	replyToEmail: null,
};

function stored(overrides: Record<string, unknown> = {}) {
	return {
		category: 'EMAIL',
		provider: 'RESEND',
		isActive: true,
		credentials: { apiKey: 're_live_1234' },
		settings: SETTINGS,
		lastVerifiedAt: null,
		lastError: null,
		...overrides,
	};
}

describe('email.config', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearEmailConfigCache();
	});

	describe('resolution', () => {
		it('flattens the stored integration into a send-ready config', async () => {
			mocks.getActive.mockResolvedValue(stored());

			await expect(getEmailConfig()).resolves.toEqual({
				provider: 'RESEND',
				apiKey: 're_live_1234',
				fromEmail: 'noreply@budget.umbra.build',
				fromName: 'Budget Planner',
				replyToEmail: null,
			});
		});

		it('returns null when no integration is active', async () => {
			mocks.getActive.mockResolvedValue(null);
			await expect(getEmailConfig()).resolves.toBeNull();
		});

		it('never reads the API key from env', async () => {
			mocks.getActive.mockResolvedValue(null);
			process.env.RESEND_API_KEY = 're_should_be_ignored';
			process.env.EMAIL_FROM = 'ignored@example.com';

			await expect(getEmailConfig()).resolves.toBeNull();

			delete process.env.RESEND_API_KEY;
			delete process.env.EMAIL_FROM;
		});

		it('rejects settings that are invalid in the JSON column', async () => {
			// This is what replaces the NOT NULL a real column would have had: a row
			// hand-edited to an empty From address must not send mail.
			mocks.getActive.mockResolvedValue(
				stored({
					settings: { fromEmail: '', fromName: '', replyToEmail: null },
				})
			);

			await expect(getEmailConfig()).resolves.toBeNull();
		});

		it('rejects settings missing a required key entirely', async () => {
			mocks.getActive.mockResolvedValue(stored({ settings: {} }));
			await expect(getEmailConfig()).resolves.toBeNull();
		});

		it('rejects an integration with no API key stored', async () => {
			mocks.getActive.mockResolvedValue(stored({ credentials: {} }));
			await expect(getEmailConfig()).resolves.toBeNull();
		});

		it('requireEmailConfig throws EmailNotConfiguredError when absent', async () => {
			mocks.getActive.mockResolvedValue(null);
			await expect(requireEmailConfig()).rejects.toThrow(
				EmailNotConfiguredError
			);
		});

		it('memoises, then re-reads after an explicit cache clear', async () => {
			mocks.getActive.mockResolvedValue(stored());

			await getEmailConfig();
			await getEmailConfig();
			expect(mocks.getActive).toHaveBeenCalledOnce();

			clearEmailConfigCache();
			await getEmailConfig();
			expect(mocks.getActive).toHaveBeenCalledTimes(2);
		});
	});

	describe('upsert', () => {
		it('validates settings before storing and declares apiKey required', async () => {
			mocks.upsert.mockResolvedValue({});

			await EmailConfigService.upsert({
				provider: 'RESEND',
				fromEmail: 'a@b.com',
				fromName: 'X',
				replyToEmail: null,
				apiKey: 're_new',
			});

			expect(mocks.upsert).toHaveBeenCalledWith({
				category: 'EMAIL',
				provider: 'RESEND',
				credentials: { apiKey: 're_new' },
				settings: { fromEmail: 'a@b.com', fromName: 'X', replyToEmail: null },
				requiredCredentials: ['apiKey'],
			});
		});

		it('sends no credential at all when the key field was left blank', async () => {
			mocks.upsert.mockResolvedValue({});

			await EmailConfigService.upsert({
				provider: 'RESEND',
				fromEmail: 'a@b.com',
				fromName: 'X',
				replyToEmail: null,
			});

			expect(mocks.upsert.mock.calls[0][0].credentials).toEqual({});
		});

		it('rejects an invalid sender address before it reaches storage', async () => {
			await expect(
				EmailConfigService.upsert({
					provider: 'RESEND',
					fromEmail: 'not-an-email',
					fromName: 'X',
					replyToEmail: null,
					apiKey: 're_new',
				})
			).rejects.toThrow();

			expect(mocks.upsert).not.toHaveBeenCalled();
		});
	});

	describe('getForAdmin', () => {
		it('reports whether a credential exists, never its value', async () => {
			mocks.listForAdmin.mockResolvedValue([
				{
					provider: 'RESEND',
					isActive: true,
					settings: SETTINGS,
					storedCredentialKeys: ['apiKey'],
					lastVerifiedAt: null,
					lastError: null,
				},
			]);

			const result = await EmailConfigService.getForAdmin();

			expect(result.configured).toBe(true);
			expect(result.providers[0]).toMatchObject({
				hasCredential: true,
				fromEmail: 'noreply@budget.umbra.build',
			});
			expect(JSON.stringify(result)).not.toContain('re_');
		});

		it('still renders a row whose settings are invalid, so it can be fixed', async () => {
			mocks.listForAdmin.mockResolvedValue([
				{
					provider: 'RESEND',
					isActive: true,
					settings: { garbage: true },
					storedCredentialKeys: [],
					lastVerifiedAt: null,
					lastError: null,
				},
			]);

			const result = await EmailConfigService.getForAdmin();

			expect(result.providers[0].fromEmail).toBe('');
			expect(result.providers[0].hasCredential).toBe(false);
		});
	});
});
