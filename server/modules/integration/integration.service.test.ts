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
		integration: {
			findFirst: mocks.findFirst,
			findMany: mocks.findMany,
			findUnique: mocks.findUnique,
			create: mocks.create,
			update: mocks.update,
			updateMany: mocks.updateMany,
		},
		$transaction: mocks.transaction,
	},
}));

process.env.SECRET_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');

const { IntegrationService } = await import('./integration.service');
const { seal, open } = await import('@/server/lib/crypto');

const SETTINGS = {
	fromEmail: 'noreply@budget.umbra.build',
	fromName: 'Budget Planner',
	replyToEmail: null,
};

function row(overrides: Record<string, unknown> = {}) {
	return {
		id: 'int_1',
		category: 'EMAIL',
		provider: 'RESEND',
		isActive: true,
		credentials: seal(JSON.stringify({ apiKey: 're_live_1234' })),
		settings: SETTINGS,
		lastVerifiedAt: null,
		lastError: null,
		...overrides,
	};
}

describe('IntegrationService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.create.mockResolvedValue(row());
		mocks.update.mockResolvedValue(row());
		mocks.updateMany.mockResolvedValue({ count: 0 });
		mocks.transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
			cb({
				integration: {
					updateMany: mocks.updateMany,
					create: mocks.create,
					update: mocks.update,
				},
			})
		);
	});

	describe('getActive', () => {
		it('decrypts credentials and passes settings through untouched', async () => {
			mocks.findFirst.mockResolvedValue(row());

			await expect(IntegrationService.getActive('EMAIL')).resolves.toMatchObject(
				{
					provider: 'RESEND',
					credentials: { apiKey: 're_live_1234' },
					settings: SETTINGS,
				}
			);
		});

		it('scopes the lookup to the active row in that category', async () => {
			mocks.findFirst.mockResolvedValue(row());
			await IntegrationService.getActive('EMAIL');

			expect(mocks.findFirst).toHaveBeenCalledWith({
				where: { category: 'EMAIL', isActive: true },
			});
		});

		it('returns null when nothing is active', async () => {
			mocks.findFirst.mockResolvedValue(null);
			await expect(IntegrationService.getActive('EMAIL')).resolves.toBeNull();
		});

		it('returns null on an undecryptable row rather than throwing', async () => {
			mocks.findFirst.mockResolvedValue(
				row({ credentials: 'v1:bogus:bogus:bogus' })
			);
			await expect(IntegrationService.getActive('EMAIL')).resolves.toBeNull();
		});

		it('reads a legacy bare-string credential as { apiKey }', async () => {
			mocks.findFirst.mockResolvedValue(
				row({ credentials: seal('re_legacy_bare') })
			);

			const result = await IntegrationService.getActive('EMAIL');
			expect(result?.credentials).toEqual({ apiKey: 're_legacy_bare' });
		});
	});

	describe('upsert', () => {
		it('seals credentials as JSON rather than storing them in the clear', async () => {
			mocks.findUnique.mockResolvedValue(null);

			await IntegrationService.upsert({
				category: 'EMAIL',
				provider: 'RESEND',
				credentials: { apiKey: 're_plaintext' },
				settings: SETTINGS,
			});

			const created = mocks.create.mock.calls[0][0].data;
			expect(created.credentials).not.toContain('re_plaintext');
			expect(JSON.parse(open(created.credentials))).toEqual({
				apiKey: 're_plaintext',
			});
		});

		it('deactivates other providers in the SAME category only', async () => {
			mocks.findUnique.mockResolvedValue(null);

			await IntegrationService.upsert({
				category: 'EMAIL',
				provider: 'RESEND',
				credentials: { apiKey: 're_key' },
				settings: SETTINGS,
			});

			// Scoped by category: activating an email provider must not disturb an
			// SMS or payment integration.
			expect(mocks.updateMany).toHaveBeenCalledWith({
				where: {
					category: 'EMAIL',
					provider: { not: 'RESEND' },
					isActive: true,
				},
				data: { isActive: false },
			});
		});

		it('keeps the stored secret when none is supplied', async () => {
			mocks.findUnique.mockResolvedValue(row());

			await IntegrationService.upsert({
				category: 'EMAIL',
				provider: 'RESEND',
				settings: { ...SETTINGS, fromName: 'Renamed' },
			});

			const data = mocks.update.mock.calls[0][0].data;
			expect(JSON.parse(open(data.credentials))).toEqual({
				apiKey: 're_live_1234',
			});
			expect(data.settings).toMatchObject({ fromName: 'Renamed' });
		});

		it('treats a blank value as unchanged, never as a clear', async () => {
			mocks.findUnique.mockResolvedValue(row());

			await IntegrationService.upsert({
				category: 'EMAIL',
				provider: 'RESEND',
				credentials: { apiKey: '   ' },
				settings: SETTINGS,
			});

			const data = mocks.update.mock.calls[0][0].data;
			expect(JSON.parse(open(data.credentials))).toEqual({
				apiKey: 're_live_1234',
			});
		});

		it('merges a second secret alongside the first', async () => {
			mocks.findUnique.mockResolvedValue(row());

			await IntegrationService.upsert({
				category: 'EMAIL',
				provider: 'RESEND',
				credentials: { webhookSecret: 'whsec_abc' },
				settings: SETTINGS,
			});

			const data = mocks.update.mock.calls[0][0].data;
			expect(JSON.parse(open(data.credentials))).toEqual({
				apiKey: 're_live_1234',
				webhookSecret: 'whsec_abc',
			});
		});

		it('rejects a missing required credential', async () => {
			mocks.findUnique.mockResolvedValue(null);

			await expect(
				IntegrationService.upsert({
					category: 'EMAIL',
					provider: 'RESEND',
					settings: SETTINGS,
					requiredCredentials: ['apiKey'],
				})
			).rejects.toThrow(/Missing required credential: apiKey/);
		});

		it('clears prior verification state on any change', async () => {
			mocks.findUnique.mockResolvedValue(row({ lastVerifiedAt: new Date() }));

			await IntegrationService.upsert({
				category: 'EMAIL',
				provider: 'RESEND',
				settings: SETTINGS,
			});

			const data = mocks.update.mock.calls[0][0].data;
			expect(data.lastVerifiedAt).toBeNull();
			expect(data.lastError).toBeNull();
		});
	});

	describe('listForAdmin', () => {
		it('exposes credential key names but never a value', async () => {
			mocks.findMany.mockResolvedValue([row()]);

			const result = await IntegrationService.listForAdmin('EMAIL');

			expect(result[0].storedCredentialKeys).toEqual(['apiKey']);
			expect(JSON.stringify(result)).not.toContain('re_live_1234');
		});
	});
});
