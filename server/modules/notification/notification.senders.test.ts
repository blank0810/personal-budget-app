import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
	send: vi.fn(),
	isEnabledMaster: vi.fn(),
	resolveRecipient: vi.fn(),
	getCurrency: vi.fn(),
	getEmailAndName: vi.fn(),
	notifTypeFindUnique: vi.fn(),
}));

vi.mock('@/server/modules/email/email.service', () => ({
	EmailService: { send: mocks.send, sendWithAttachment: vi.fn() },
}));

vi.mock('@/server/modules/user/user.service', () => ({
	UserService: {
		getEmailNotificationsEnabled: mocks.isEnabledMaster,
		resolveNotificationRecipient: mocks.resolveRecipient,
		getCurrency: mocks.getCurrency,
		getEmailAndName: mocks.getEmailAndName,
	},
}));

vi.mock('@/lib/prisma', () => ({
	default: {
		notificationType: {
			findUnique: mocks.notifTypeFindUnique,
			findMany: vi.fn(),
			findUniqueOrThrow: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
		},
		userNotificationPreference: { upsert: vi.fn(), createMany: vi.fn() },
		user: { findMany: vi.fn() },
	},
}));

const { NotificationService } = await import('./notification.service');

/** Enable a type by returning a row with an explicit `true` preference. */
function enable() {
	mocks.notifTypeFindUnique.mockResolvedValue({
		id: 'nt_1',
		defaultEnabled: true,
		userPreferences: [{ enabled: true }],
	});
}

function disable() {
	mocks.notifTypeFindUnique.mockResolvedValue({
		id: 'nt_1',
		defaultEnabled: false,
		userPreferences: [{ enabled: false }],
	});
}

function lastSend() {
	return mocks.send.mock.calls.at(-1)?.[0];
}

describe('owner notification senders', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.isEnabledMaster.mockResolvedValue(true);
		mocks.resolveRecipient.mockResolvedValue('owner@example.com');
		mocks.getCurrency.mockResolvedValue('USD');
		mocks.getEmailAndName.mockResolvedValue({
			email: 'owner@example.com',
			name: 'Ehnand',
		});
		enable();
	});

	describe('gating', () => {
		it('sends nothing when the preference is off', async () => {
			disable();

			await NotificationService.sendImportComplete('u1', {
				imported: 5,
				skipped: 0,
				accountName: 'Checking',
			});

			expect(mocks.send).not.toHaveBeenCalled();
		});

		it('sends nothing when the master gate suppresses the recipient', async () => {
			mocks.resolveRecipient.mockResolvedValue(null);

			await NotificationService.sendImportComplete('u1', {
				imported: 5,
				skipped: 0,
				accountName: 'Checking',
			});

			expect(mocks.send).not.toHaveBeenCalled();
		});

		it('checks the preference before doing any other work', async () => {
			disable();

			await NotificationService.sendImportComplete('u1', {
				imported: 1,
				skipped: 0,
				accountName: 'A',
			});

			// Cheapest check first: no recipient lookup, no currency fetch.
			expect(mocks.resolveRecipient).not.toHaveBeenCalled();
			expect(mocks.getCurrency).not.toHaveBeenCalled();
		});

		it('tags every send with its notification key for the audit log', async () => {
			await NotificationService.sendImportComplete('u1', {
				imported: 1,
				skipped: 0,
				accountName: 'A',
			});

			expect(lastSend()).toMatchObject({
				userId: 'u1',
				notificationKey: 'import_complete',
				tags: [{ name: 'kind', value: 'import_complete' }],
			});
		});
	});

	describe('security alerts', () => {
		it('sends at CRITICAL priority so the quota guard cannot hold it back', async () => {
			await NotificationService.sendSecurityAlert('u1', {
				kind: 'password_changed',
			});

			expect(lastSend()).toMatchObject({
				priority: 'CRITICAL',
				notificationKey: 'security_alerts',
			});
			expect(lastSend().subject).toMatch(/password was changed/i);
		});

		it('is still governed by the user preference', async () => {
			disable();
			await NotificationService.sendSecurityAlert('u1', {
				kind: 'password_changed',
			});
			expect(mocks.send).not.toHaveBeenCalled();
		});
	});

	describe('overdue invoice digest', () => {
		const invoices = [
			{
				invoiceNumber: 'INV-001',
				clientName: 'Acme Co',
				amount: 100,
				dueDate: new Date('2026-08-01'),
			},
			{
				invoiceNumber: 'INV-002',
				clientName: 'Globex',
				amount: 250,
				dueDate: new Date('2026-08-05'),
			},
		];

		it('sends ONE email listing every invoice, not one per invoice', async () => {
			await NotificationService.sendInvoiceOverdueDigest('u1', invoices);

			expect(mocks.send).toHaveBeenCalledOnce();
			expect(lastSend().subject).toBe('2 invoices are now overdue');
			expect(lastSend().html).toContain('INV-001');
			expect(lastSend().html).toContain('INV-002');
		});

		it('names the single invoice when only one lapsed', async () => {
			await NotificationService.sendInvoiceOverdueDigest('u1', [invoices[0]]);
			expect(lastSend().subject).toBe('Invoice INV-001 is overdue');
		});

		it('sends nothing for an empty list', async () => {
			await NotificationService.sendInvoiceOverdueDigest('u1', []);
			expect(mocks.send).not.toHaveBeenCalled();
		});

		it('escapes a client name that contains markup', async () => {
			await NotificationService.sendInvoiceOverdueDigest('u1', [
				{ ...invoices[0], clientName: '<script>x</script>' },
			]);

			expect(lastSend().html).not.toContain('<script>');
			expect(lastSend().html).toContain('&lt;script&gt;');
		});
	});

	describe('goal milestones', () => {
		const goal = { name: 'Emergency Fund', targetAmount: 1000, currentAmount: 0 };

		it('fires when crossing 50%', async () => {
			await NotificationService.sendGoalMilestone(
				'u1',
				{ ...goal, currentAmount: 500 },
				40,
				50
			);
			expect(lastSend().subject).toContain('50%');
		});

		it('fires when crossing 100%', async () => {
			await NotificationService.sendGoalMilestone(
				'u1',
				{ ...goal, currentAmount: 1000 },
				90,
				100
			);
			expect(lastSend().subject).toContain('100%');
		});

		it('stays silent when no threshold was crossed', async () => {
			await NotificationService.sendGoalMilestone('u1', goal, 55, 60);
			expect(mocks.send).not.toHaveBeenCalled();
		});

		it('stays silent when already past a threshold — no repeat on re-sync', async () => {
			// The linked-account sync runs on every /goals page load, so a goal
			// sitting above 50% must not re-notify.
			await NotificationService.sendGoalMilestone('u1', goal, 60, 61);
			expect(mocks.send).not.toHaveBeenCalled();
		});

		it('reports 100% rather than 50% when a single jump passes both', async () => {
			await NotificationService.sendGoalMilestone(
				'u1',
				{ ...goal, currentAmount: 1000 },
				10,
				100
			);
			expect(lastSend().subject).toContain('100%');
		});
	});

	describe('large expense alert', () => {
		it('includes both the amount and the threshold that triggered it', async () => {
			await NotificationService.sendLargeExpenseAlert(
				'u1',
				{ amount: 15000, description: 'Laptop', categoryName: 'Equipment' },
				10000
			);

			expect(lastSend().notificationKey).toBe('large_expense_alert');
			expect(lastSend().html).toContain('Laptop');
			expect(lastSend().html).toContain('Equipment');
		});

		it('omits the description row when there is none', async () => {
			await NotificationService.sendLargeExpenseAlert(
				'u1',
				{ amount: 15000, description: null, categoryName: 'Equipment' },
				10000
			);

			expect(lastSend().html).not.toContain('Description');
		});
	});

	describe('invoice paid confirmation', () => {
		it('sends to the owner with the recorded amount and date', async () => {
			await NotificationService.sendInvoicePaidOwner('u1', {
				invoiceNumber: 'INV-009',
				clientName: 'Acme Co',
				amount: 400,
				paidAt: new Date('2026-08-17'),
			});

			expect(lastSend().notificationKey).toBe('invoice_paid_owner');
			expect(lastSend().subject).toContain('INV-009');
			expect(lastSend().html).toContain('Acme Co');
		});
	});
});
