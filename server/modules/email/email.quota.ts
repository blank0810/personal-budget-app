import { EmailPriority } from '@prisma/client';
import prisma from '@/lib/prisma';

/**
 * Daily-quota guard.
 *
 * The Resend free tier allows 100 sends/day and 3,000/month — lower than the
 * Gmail SMTP it replaces. Without a guard, the monthly-report batch would spend
 * the day's allowance before a password reset could get through, and the failure
 * would surface as an opaque provider error to whoever asked for the reset.
 *
 * So sends are tiered, and NORMAL traffic stops early enough to leave the
 * reserve for mail a user is actively waiting on. The provider's own
 * `daily_quota_exceeded` code remains the backstop if these numbers drift out of
 * step with the plan.
 */

const DAILY_LIMIT = Number(process.env.EMAIL_DAILY_LIMIT ?? 100);

/**
 * Sends held back for CRITICAL/HIGH traffic. NORMAL mail is suppressed once
 * fewer than this many sends remain in the day.
 */
const RESERVE_FOR_PRIORITY = Number(process.env.EMAIL_DAILY_RESERVE ?? 40);

export type QuotaDecision =
	| { allowed: true }
	| { allowed: false; sentToday: number; dailyLimit: number };

function startOfToday(now: Date): Date {
	const start = new Date(now);
	start.setHours(0, 0, 0, 0);
	return start;
}

/**
 * Count of successful sends since local midnight. Backed by the
 * `email_send_logs(createdAt)` index.
 *
 * Only SENT rows count: a FAILED attempt never consumed provider quota, and
 * counting SUPPRESSED_QUOTA rows would make the guard tighten against itself.
 */
export async function countSentToday(now: Date = new Date()): Promise<number> {
	return prisma.emailSendLog.count({
		where: { status: 'SENT', createdAt: { gte: startOfToday(now) } },
	});
}

/**
 * Decide whether a send of this priority may proceed.
 *
 * CRITICAL and HIGH always proceed — password resets, security alerts, and a
 * freelancer's invoice to their client are never worth withholding to protect a
 * digest. Their overflow is handled by the provider, not by us.
 */
export async function checkQuota(
	priority: EmailPriority,
	now: Date = new Date()
): Promise<QuotaDecision> {
	if (priority !== EmailPriority.NORMAL) return { allowed: true };

	const sentToday = await countSentToday(now);
	if (sentToday >= DAILY_LIMIT - RESERVE_FOR_PRIORITY) {
		return { allowed: false, sentToday, dailyLimit: DAILY_LIMIT };
	}

	return { allowed: true };
}

/** Quota snapshot for the admin system panel. */
export async function getQuotaStatus(now: Date = new Date()) {
	const sentToday = await countSentToday(now);
	return {
		sentToday,
		dailyLimit: DAILY_LIMIT,
		remaining: Math.max(0, DAILY_LIMIT - sentToday),
		normalSuppressed: sentToday >= DAILY_LIMIT - RESERVE_FOR_PRIORITY,
		reserveForPriority: RESERVE_FOR_PRIORITY,
	};
}
