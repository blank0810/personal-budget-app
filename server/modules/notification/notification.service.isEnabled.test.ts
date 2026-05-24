import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted spies
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
	getEmailNotificationsEnabled: vi.fn(),
	notifTypeFindUnique: vi.fn(),
}));

// Mock UserService BEFORE NotificationService is imported, so the isEnabled
// call to UserService.getEmailNotificationsEnabled uses our spy.
vi.mock('@/server/modules/user/user.service', () => ({
	UserService: {
		getEmailNotificationsEnabled: mocks.getEmailNotificationsEnabled,
		// Stub every other UserService method referenced by
		// notification.service.ts at module load / in other methods.
		getCurrency: vi.fn(),
		getEmailAndName: vi.fn(),
		getPhoneNumber: vi.fn(),
		resolveNotificationRecipient: vi.fn(),
	},
}));

vi.mock('@/lib/prisma', () => ({
	default: {
		notificationType: {
			findUnique: mocks.notifTypeFindUnique,
			findUniqueOrThrow: vi.fn(),
		},
		userNotificationPreference: {
			upsert: vi.fn(),
		},
	},
}));

// Stub BullMQ queue so no real Redis connection is opened
vi.mock('./sms.queue', () => ({ addSmsJob: vi.fn() }));
vi.mock('@/server/modules/email/email.service', () => ({
	EmailService: { send: vi.fn(), sendWithAttachment: vi.fn() },
}));

import { NotificationService } from './notification.service';
import type { NotificationChannel } from '@prisma/client';

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------
function makeNotifType(defaultEnabled: boolean, userPrefEnabled?: boolean) {
	return {
		defaultEnabled,
		userPreferences:
			userPrefEnabled !== undefined ? [{ enabled: userPrefEnabled }] : [],
	};
}

beforeEach(() => {
	mocks.getEmailNotificationsEnabled.mockReset();
	mocks.notifTypeFindUnique.mockReset();
});

// ===========================================================================
// isEnabled — master gate (EMAIL only)
// ===========================================================================
describe('NotificationService.isEnabled — master gate', () => {
	it('returns false for EMAIL when master gate is OFF, regardless of per-type pref', async () => {
		mocks.getEmailNotificationsEnabled.mockResolvedValueOnce(false);
		// Should never be reached, but set up for completeness
		mocks.notifTypeFindUnique.mockResolvedValueOnce(makeNotifType(true, true));

		const result = await NotificationService.isEnabled('user-1', 'budget_alerts', 'EMAIL');

		expect(result).toBe(false);
		// Short-circuit: notificationType table never queried
		expect(mocks.notifTypeFindUnique).not.toHaveBeenCalled();
	});

	it('returns true for EMAIL when master is ON and per-type pref is enabled', async () => {
		mocks.getEmailNotificationsEnabled.mockResolvedValueOnce(true);
		mocks.notifTypeFindUnique.mockResolvedValueOnce(makeNotifType(true, true));

		const result = await NotificationService.isEnabled('user-1', 'budget_alerts', 'EMAIL');

		expect(result).toBe(true);
	});

	it('returns false for EMAIL when master is ON but per-type pref is disabled', async () => {
		mocks.getEmailNotificationsEnabled.mockResolvedValueOnce(true);
		mocks.notifTypeFindUnique.mockResolvedValueOnce(makeNotifType(true, false));

		const result = await NotificationService.isEnabled('user-1', 'budget_alerts', 'EMAIL');

		expect(result).toBe(false);
	});

	it('EMAIL falls back to type.defaultEnabled when no per-type pref row exists and master is ON', async () => {
		mocks.getEmailNotificationsEnabled.mockResolvedValueOnce(true);
		mocks.notifTypeFindUnique.mockResolvedValueOnce(makeNotifType(true)); // no userPreferences

		const result = await NotificationService.isEnabled('user-1', 'income_notifications', 'EMAIL');

		expect(result).toBe(true);
	});

	it('returns false when notificationType key does not exist', async () => {
		mocks.getEmailNotificationsEnabled.mockResolvedValueOnce(true);
		mocks.notifTypeFindUnique.mockResolvedValueOnce(null);

		const result = await NotificationService.isEnabled('user-1', 'nonexistent_key', 'EMAIL');

		expect(result).toBe(false);
	});
});

// ===========================================================================
// isEnabled — SMS channel is fully independent of the master gate
// ===========================================================================
describe('NotificationService.isEnabled — SMS bypasses master gate', () => {
	it('never calls getEmailNotificationsEnabled for SMS', async () => {
		mocks.notifTypeFindUnique.mockResolvedValueOnce(makeNotifType(true, true));

		await NotificationService.isEnabled('user-1', 'budget_alerts', 'SMS');

		expect(mocks.getEmailNotificationsEnabled).not.toHaveBeenCalled();
	});

	it('returns true for SMS when per-type SMS pref is enabled (no master check)', async () => {
		mocks.notifTypeFindUnique.mockResolvedValueOnce(makeNotifType(false, true));

		const result = await NotificationService.isEnabled('user-1', 'budget_alerts', 'SMS');

		expect(result).toBe(true);
		expect(mocks.getEmailNotificationsEnabled).not.toHaveBeenCalled();
	});

	it('returns false for SMS when per-type SMS pref is disabled', async () => {
		mocks.notifTypeFindUnique.mockResolvedValueOnce(makeNotifType(true, false));

		const result = await NotificationService.isEnabled('user-1', 'budget_alerts', 'SMS');

		expect(result).toBe(false);
		expect(mocks.getEmailNotificationsEnabled).not.toHaveBeenCalled();
	});

	it('defaults to false for SMS when no per-type pref row exists', async () => {
		mocks.notifTypeFindUnique.mockResolvedValueOnce(makeNotifType(true)); // no userPreferences

		const result = await NotificationService.isEnabled('user-1', 'income_notifications', 'SMS');

		expect(result).toBe(false);
		expect(mocks.getEmailNotificationsEnabled).not.toHaveBeenCalled();
	});

	// Regression guard: master toggle = OFF must not suppress SMS
	it('SMS still resolves to true even when EMAIL master would be OFF', async () => {
		// Intentionally do NOT set up getEmailNotificationsEnabled —
		// it must never fire for SMS.
		mocks.notifTypeFindUnique.mockResolvedValueOnce(makeNotifType(false, true));

		const result = await NotificationService.isEnabled('user-1', 'budget_alerts', 'SMS');

		expect(result).toBe(true);
		expect(mocks.getEmailNotificationsEnabled).not.toHaveBeenCalled();
	});
});

// ===========================================================================
// Default channel parameter
// ===========================================================================
describe('NotificationService.isEnabled — default channel is EMAIL', () => {
	it('uses EMAIL channel when no channel argument is passed', async () => {
		mocks.getEmailNotificationsEnabled.mockResolvedValueOnce(true);
		mocks.notifTypeFindUnique.mockResolvedValueOnce(makeNotifType(true, true));

		// Call without explicit channel
		const result = await (NotificationService.isEnabled as (
			userId: string,
			key: string,
			channel?: NotificationChannel
		) => Promise<boolean>)('user-1', 'budget_alerts');

		// If default is EMAIL, the master gate must have fired
		expect(mocks.getEmailNotificationsEnabled).toHaveBeenCalledOnce();
		expect(result).toBe(true);
	});
});
