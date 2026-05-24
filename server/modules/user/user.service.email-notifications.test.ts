import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted spies — shared between the mock factory and the test body.
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
	userFindUniqueOrThrow: vi.fn(),
	userFindUnique: vi.fn(),
	userUpdate: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
	default: {
		user: {
			findUniqueOrThrow: mocks.userFindUniqueOrThrow,
			findUnique: mocks.userFindUnique,
			update: mocks.userUpdate,
		},
	},
}));

import { UserService } from './user.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeUser(overrides: {
	email?: string;
	emailNotificationsEnabled?: boolean;
	notificationEmail?: string | null;
}) {
	return {
		email: 'account@example.com',
		emailNotificationsEnabled: true,
		notificationEmail: null,
		...overrides,
	};
}

beforeEach(() => {
	mocks.userFindUniqueOrThrow.mockReset();
	mocks.userFindUnique.mockReset();
	mocks.userUpdate.mockReset();
});

// ===========================================================================
// resolveNotificationRecipient
// ===========================================================================
describe('UserService.resolveNotificationRecipient', () => {
	it('returns null when master gate is OFF', async () => {
		mocks.userFindUniqueOrThrow.mockResolvedValueOnce(
			makeUser({ emailNotificationsEnabled: false })
		);

		const result = await UserService.resolveNotificationRecipient('user-1');

		expect(result).toBeNull();
	});

	it('returns account email when gate is ON and notificationEmail is null', async () => {
		mocks.userFindUniqueOrThrow.mockResolvedValueOnce(
			makeUser({ notificationEmail: null })
		);

		const result = await UserService.resolveNotificationRecipient('user-1');

		expect(result).toBe('account@example.com');
	});

	it('returns custom notificationEmail when gate is ON and override is set', async () => {
		mocks.userFindUniqueOrThrow.mockResolvedValueOnce(
			makeUser({ notificationEmail: 'custom@delivery.io' })
		);

		const result = await UserService.resolveNotificationRecipient('user-1');

		expect(result).toBe('custom@delivery.io');
	});

	it('throws (findUniqueOrThrow) for a non-existent userId', async () => {
		mocks.userFindUniqueOrThrow.mockRejectedValueOnce(
			new Error('No User found')
		);

		await expect(
			UserService.resolveNotificationRecipient('ghost-user')
		).rejects.toThrow('No User found');
	});
});

// ===========================================================================
// setNotificationEmail — normalization
// ===========================================================================
describe('UserService.setNotificationEmail', () => {
	function setupAccountEmail(accountEmail: string) {
		// First call in setNotificationEmail: fetch the account email for comparison
		mocks.userFindUniqueOrThrow.mockResolvedValueOnce({ email: accountEmail });
		mocks.userUpdate.mockResolvedValueOnce(undefined);
	}

	it('stores null when the input exactly equals the account email', async () => {
		setupAccountEmail('account@example.com');

		await UserService.setNotificationEmail('user-1', 'account@example.com');

		expect(mocks.userUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ notificationEmail: null }),
			})
		);
	});

	it('normalizes case and trims — "User@X.com " vs "user@x.com" resolves to null', async () => {
		setupAccountEmail('user@x.com');

		await UserService.setNotificationEmail('user-1', 'User@X.com ');

		expect(mocks.userUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ notificationEmail: null }),
			})
		);
	});

	it('stores the custom address when it differs from the account email', async () => {
		setupAccountEmail('account@example.com');

		await UserService.setNotificationEmail('user-1', 'work@company.io');

		expect(mocks.userUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ notificationEmail: 'work@company.io' }),
			})
		);
	});

	it('stores null directly when called with null — skips account email lookup', async () => {
		// When value is null the service skips the findUniqueOrThrow entirely
		// and goes straight to update. Ensure the DB lookup is never triggered.
		mocks.userUpdate.mockResolvedValueOnce(undefined);

		await UserService.setNotificationEmail('user-1', null);

		expect(mocks.userFindUniqueOrThrow).not.toHaveBeenCalled();
		expect(mocks.userUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ notificationEmail: null }),
			})
		);
	});

	it('trims surrounding whitespace before comparison — padded account email match normalizes to null', async () => {
		setupAccountEmail('account@example.com');

		await UserService.setNotificationEmail('user-1', '  account@example.com  ');

		expect(mocks.userUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ notificationEmail: null }),
			})
		);
	});
});

// ===========================================================================
// getEmailNotificationsEnabled / setEmailNotificationsEnabled
// ===========================================================================
describe('UserService.getEmailNotificationsEnabled', () => {
	it('returns true for a user with default (migration default = true)', async () => {
		mocks.userFindUniqueOrThrow.mockResolvedValueOnce({
			emailNotificationsEnabled: true,
		});

		const result = await UserService.getEmailNotificationsEnabled('user-1');

		expect(result).toBe(true);
	});

	it('returns false after the master toggle is set off', async () => {
		mocks.userFindUniqueOrThrow.mockResolvedValueOnce({
			emailNotificationsEnabled: false,
		});

		const result = await UserService.getEmailNotificationsEnabled('user-1');

		expect(result).toBe(false);
	});
});

describe('UserService.setEmailNotificationsEnabled', () => {
	it('writes the boolean value to the DB', async () => {
		mocks.userUpdate.mockResolvedValueOnce(undefined);

		await UserService.setEmailNotificationsEnabled('user-1', false);

		expect(mocks.userUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: 'user-1' },
				data: { emailNotificationsEnabled: false },
			})
		);
	});
});

// ===========================================================================
// updateNotificationEmailSchema — Zod validation (controller input gate)
// ===========================================================================
import { updateNotificationEmailSchema } from '@/server/modules/notification/notification.types';

describe('updateNotificationEmailSchema', () => {
	it('accepts a valid email string', () => {
		const result = updateNotificationEmailSchema.safeParse({ email: 'valid@email.com' });
		expect(result.success).toBe(true);
	});

	it('accepts null (clear override)', () => {
		const result = updateNotificationEmailSchema.safeParse({ email: null });
		expect(result.success).toBe(true);
		expect(result.data?.email).toBeNull();
	});

	it('rejects an invalid email string', () => {
		const result = updateNotificationEmailSchema.safeParse({ email: 'not-an-email' });
		expect(result.success).toBe(false);
	});

	it('rejects an empty string', () => {
		const result = updateNotificationEmailSchema.safeParse({ email: '' });
		expect(result.success).toBe(false);
	});

	it('rejects a whitespace-only string', () => {
		const result = updateNotificationEmailSchema.safeParse({ email: '   ' });
		expect(result.success).toBe(false);
	});

	it('rejects undefined (email field is required)', () => {
		const result = updateNotificationEmailSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});
