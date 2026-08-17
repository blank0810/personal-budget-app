import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

const mocks = vi.hoisted(() => ({
	findFirst: vi.fn(),
	findMany: vi.fn(),
	findUnique: vi.fn(),
	create: vi.fn(),
	update: vi.fn(),
	updateMany: vi.fn(),
	transaction: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
	default: {
		emailProviderConfig: {
			findFirst: mocks.findFirst,
			findMany: mocks.findMany,
			findUnique: mocks.findUnique,
			create: mocks.create,
			update: mocks.update,
			updateMany: mocks.updateMany,
		},
		// Run the callback against the same mock surface.
		$transaction: mocks.transaction,
	},
}));

process.env.SECRET_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');

const {
	getEmailConfig,
	requireEmailConfig,
	clearEmailConfigCache,
	EmailConfigService,
} = await import('./email.config');
const { seal, open } = await import('@/server/lib/crypto');
const { EmailNotConfiguredError } = await import('./email.provider');

function activeRow(overrides: Record<string, unknown> = {}) {
	return {
		id: 'cfg_1',
		provider: 'RESEND',
		isActive: true,
		fromEmail: 'noreply@budget.umbra.build',
		fromName: 'Budget Planner',
		replyToEmail: null,
		credentials: seal(JSON.stringify({ apiKey: 're_live_key_1234' })),
		lastVerifiedAt: null,
		lastError: null,
		...overrides,
	};
}

describe('email.config', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearEmailConfigCache();
		mocks.transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
			cb({
				emailProviderConfig: {
					updateMany: mocks.updateMany,
					create: mocks.create,
					update: mocks.update,
				},
			})
		);
	});

	describe('resolution', () => {
		it('decrypts the active row', async () => {
			mocks.findFirst.mockResolvedValue(activeRow());

			await expect(getEmailConfig()).resolves.toEqual({
				provider: 'RESEND',
				credentials: { apiKey: 're_live_key_1234' },
				fromEmail: 'noreply@budget.umbra.build',
				fromName: 'Budget Planner',
				replyToEmail: null,
			});
		});

		it('returns null with no active row — the API key is never read from env', async () => {
			mocks.findFirst.mockResolvedValue(null);
			process.env.RESEND_API_KEY = 're_should_be_ignored';
			process.env.EMAIL_FROM = 'ignored@example.com';

			await expect(getEmailConfig()).resolves.toBeNull();

			delete process.env.RESEND_API_KEY;
			delete process.env.EMAIL_FROM;
		});

		it('reads a legacy bare-string credential as { apiKey }', async () => {
			mocks.findFirst.mockResolvedValue(
				activeRow({ credentials: seal('re_legacy_bare_key') })
			);

			const config = await getEmailConfig();
			expect(config?.credentials).toEqual({ apiKey: 're_legacy_bare_key' });
		});

		it('treats an undecryptable row as not configured', async () => {
			mocks.findFirst.mockResolvedValue(
				activeRow({ credentials: 'v1:bogus:bogus:bogus' })
			);

			await expect(getEmailConfig()).resolves.toBeNull();
		});

		it('requireEmailConfig throws EmailNotConfiguredError when absent', async () => {
			mocks.findFirst.mockResolvedValue(null);
			await expect(requireEmailConfig()).rejects.toThrow(
				EmailNotConfiguredError
			);
		});

		it('memoises, then re-reads after an explicit cache clear', async () => {
			mocks.findFirst.mockResolvedValue(activeRow());

			await getEmailConfig();
			await getEmailConfig();
			expect(mocks.findFirst).toHaveBeenCalledOnce();

			clearEmailConfigCache();
			await getEmailConfig();
			expect(mocks.findFirst).toHaveBeenCalledTimes(2);
		});
	});

	describe('upsert', () => {
		beforeEach(() => {
			mocks.create.mockResolvedValue(activeRow());
			mocks.update.mockResolvedValue(activeRow());
			mocks.updateMany.mockResolvedValue({ count: 0 });
		});

		it('seals the API key rather than storing it in the clear', async () => {
			mocks.findUnique.mockResolvedValue(null);

			await EmailConfigService.upsert({
				provider: 'RESEND',
				fromEmail: 'a@b.com',
				fromName: 'X',
				replyToEmail: null,
				credentials: { apiKey: 're_plaintext_secret' },
			});

			const created = mocks.create.mock.calls[0][0].data;
			expect(created.credentials).not.toContain('re_plaintext_secret');
			expect(created.credentials).toMatch(/^v1:/);
		});

		it('deactivates other providers so only one can be active', async () => {
			mocks.findUnique.mockResolvedValue(null);

			await EmailConfigService.upsert({
				provider: 'RESEND',
				fromEmail: 'a@b.com',
				fromName: 'X',
				replyToEmail: null,
				credentials: { apiKey: 're_key' },
			});

			expect(mocks.updateMany).toHaveBeenCalledWith({
				where: { provider: { not: 'RESEND' }, isActive: true },
				data: { isActive: false },
			});
		});

		it('keeps the stored credential when no new key is supplied', async () => {
			mocks.findUnique.mockResolvedValue(activeRow());

			await EmailConfigService.upsert({
				provider: 'RESEND',
				fromEmail: 'new@b.com',
				fromName: 'New Name',
				replyToEmail: null,
			});

			const update = mocks.update.mock.calls[0][0].data;
			expect(JSON.parse(open(update.credentials))).toEqual({
				apiKey: 're_live_key_1234',
			});
			expect(update.fromEmail).toBe('new@b.com');
		});

		it('refuses to add a provider missing a required declared credential', async () => {
			mocks.findUnique.mockResolvedValue(null);

			await expect(
				EmailConfigService.upsert({
					provider: 'RESEND',
					fromEmail: 'a@b.com',
					fromName: 'X',
					replyToEmail: null,
				})
			).rejects.toThrow(/Missing required credential: API key/);
		});

		it('treats a blank value as unchanged rather than as a clear', async () => {
			mocks.findUnique.mockResolvedValue(activeRow());

			await EmailConfigService.upsert({
				provider: 'RESEND',
				fromEmail: 'a@b.com',
				fromName: 'X',
				replyToEmail: null,
				credentials: { apiKey: '   ' },
			});

			const update = mocks.update.mock.calls[0][0].data;
			expect(JSON.parse(open(update.credentials))).toEqual({
				apiKey: 're_live_key_1234',
			});
		});

		it('merges a new field alongside stored ones, for providers needing several', async () => {
			mocks.findUnique.mockResolvedValue(activeRow());

			await EmailConfigService.upsert({
				provider: 'RESEND',
				fromEmail: 'a@b.com',
				fromName: 'X',
				replyToEmail: null,
				credentials: { webhookSecret: 'whsec_abc' },
			});

			const update = mocks.update.mock.calls[0][0].data;
			expect(JSON.parse(open(update.credentials))).toEqual({
				apiKey: 're_live_key_1234',
				webhookSecret: 'whsec_abc',
			});
		});

		it('clears any prior verification, since the identity changed', async () => {
			mocks.findUnique.mockResolvedValue(activeRow({ lastVerifiedAt: new Date() }));

			await EmailConfigService.upsert({
				provider: 'RESEND',
				fromEmail: 'moved@b.com',
				fromName: 'X',
				replyToEmail: null,
			});

			const update = mocks.update.mock.calls[0][0].data;
			expect(update.lastVerifiedAt).toBeNull();
			expect(update.lastError).toBeNull();
		});
	});

	describe('getForAdmin', () => {
		it('never returns the credential, only whether one exists', async () => {
			mocks.findMany.mockResolvedValue([activeRow()]);

			const result = await EmailConfigService.getForAdmin();
			const serialised = JSON.stringify(result);

			expect(result.configured).toBe(true);
			expect(result.providers[0].storedCredentialFields).toEqual(['apiKey']);
			expect(serialised).not.toContain('re_live_key_1234');
			expect(serialised).not.toContain('credentials');
		});

		it('reports unconfigured when no row is active', async () => {
			mocks.findMany.mockResolvedValue([activeRow({ isActive: false })]);

			const result = await EmailConfigService.getForAdmin();
			expect(result.configured).toBe(false);
		});
	});
});
