import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => ({
	count: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
	default: { emailSendLog: { count: mocks.count } },
}));

// Limits are read at module load, so they are pinned before the import below.
process.env.EMAIL_DAILY_LIMIT = '100';
process.env.EMAIL_DAILY_RESERVE = '40';

const { checkQuota, countSentToday, getQuotaStatus } = await import(
	'./email.quota'
);

describe('email.quota', () => {
	beforeEach(() => {
		mocks.count.mockReset();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('checkQuota', () => {
		it('allows CRITICAL without even counting — a password reset is never withheld', async () => {
			const result = await checkQuota('CRITICAL');

			expect(result.allowed).toBe(true);
			expect(mocks.count).not.toHaveBeenCalled();
		});

		it('allows HIGH without counting — client invoice mail is never withheld', async () => {
			const result = await checkQuota('HIGH');

			expect(result.allowed).toBe(true);
			expect(mocks.count).not.toHaveBeenCalled();
		});

		it('allows NORMAL while the reserve is untouched', async () => {
			mocks.count.mockResolvedValue(59);
			await expect(checkQuota('NORMAL')).resolves.toEqual({ allowed: true });
		});

		it('suppresses NORMAL exactly when only the reserve remains', async () => {
			// limit 100 - reserve 40 => the 60th send is the first suppressed one.
			mocks.count.mockResolvedValue(60);

			const result = await checkQuota('NORMAL');

			expect(result).toEqual({
				allowed: false,
				sentToday: 60,
				dailyLimit: 100,
			});
		});

		it('keeps suppressing NORMAL past the daily limit', async () => {
			mocks.count.mockResolvedValue(140);
			const result = await checkQuota('NORMAL');
			expect(result.allowed).toBe(false);
		});
	});

	describe('countSentToday', () => {
		it('counts only SENT rows since local midnight', async () => {
			mocks.count.mockResolvedValue(7);

			const now = new Date('2026-08-17T15:30:00');
			await expect(countSentToday(now)).resolves.toBe(7);

			const where = mocks.count.mock.calls[0][0].where;
			expect(where.status).toBe('SENT');

			// Failed attempts consumed no provider quota, and counting
			// SUPPRESSED_QUOTA rows would make the guard tighten against itself.
			const expectedStart = new Date(now);
			expectedStart.setHours(0, 0, 0, 0);
			expect(where.createdAt.gte).toEqual(expectedStart);
		});
	});

	describe('getQuotaStatus', () => {
		it('reports remaining headroom and the suppression state', async () => {
			mocks.count.mockResolvedValue(75);

			await expect(getQuotaStatus()).resolves.toEqual({
				sentToday: 75,
				dailyLimit: 100,
				remaining: 25,
				normalSuppressed: true,
				reserveForPriority: 40,
			});
		});

		it('never reports negative remaining headroom', async () => {
			mocks.count.mockResolvedValue(130);
			const status = await getQuotaStatus();
			expect(status.remaining).toBe(0);
		});
	});
});
