import { Prisma } from '@prisma/client';
import { differenceInUtcCalendarDays } from './budget.month';

/** Minimum elapsed days before a pace verdict is statistically honest. */
export const MIN_DAYS_FOR_VERDICT = 7;

export type BurnStatus = 'ontrack' | 'overpace' | 'insufficient_data';
export type BurnStatusReason = 'future_month' | 'too_early' | null;

export interface BurnMetricsInput {
	monthStart: Date;
	monthEnd: Date;
	totalSpent: Prisma.Decimal.Value;
	budgetLimit: Prisma.Decimal.Value;
	today?: Date;
}

export interface BurnMetrics {
	daysElapsed: number;
	daysRemaining: number;
	daysInMonth: number;
	dailyBurnRate: number;
	allowedDailyRate: number;
	expectedPercentage: number;
	burnStatus: BurnStatus;
	burnStatusReason: BurnStatusReason;
}

export interface SafeToSpendInput {
	budgetLimit: Prisma.Decimal.Value;
	totalSpent: Prisma.Decimal.Value;
	daysRemaining: number;
}

/**
 * Pace metrics for one envelope-month.
 *
 * `daysElapsed` is clamped to [1, daysInMonth]. Without the upper clamp a past
 * month's elapsed days grow without bound, driving `dailyBurnRate` toward zero
 * and reporting "ontrack" for an envelope that blew its limit months ago.
 *
 * The pace verdict is suppressed below MIN_DAYS_FOR_VERDICT because
 * straight-line extrapolation is not honest early in a month. A limit already
 * reached or exceeded is factual, though, so it is reported immediately.
 */
export function computeBurnMetrics({
	monthStart,
	monthEnd,
	totalSpent,
	budgetLimit,
	today = new Date(),
}: BurnMetricsInput): BurnMetrics {
	const spent = new Prisma.Decimal(totalSpent);
	const limit = new Prisma.Decimal(budgetLimit);
	// Budget bounds are UTC calendar boundaries, so both the month length and
	// elapsed-day count must be read in UTC as well.
	const daysInMonth = monthEnd.getUTCDate();

	const rawElapsed = differenceInUtcCalendarDays(today, monthStart) + 1;
	const daysElapsed = Math.min(daysInMonth, Math.max(1, rawElapsed));
	const daysRemaining = Math.max(0, daysInMonth - daysElapsed);

	const dailyBurnRate = spent.dividedBy(daysElapsed);
	const allowedDailyRate = limit.greaterThan(0)
		? limit.dividedBy(daysInMonth)
		: new Prisma.Decimal(0);
	const expectedPercentage = (daysElapsed / daysInMonth) * 100;

	// A month that has not started yet, or has barely started, cannot support a
	// pace verdict — rawElapsed <= 0 means the month is in the future.
	const isFuture = rawElapsed <= 0;
	const tooEarly = daysElapsed < MIN_DAYS_FOR_VERDICT && daysRemaining > 0;
	const isOverLimit =
		limit.greaterThan(0) && spent.greaterThanOrEqualTo(limit);

	let burnStatus: BurnStatus;
	let burnStatusReason: BurnStatusReason = null;
	if (isOverLimit) {
		burnStatus = 'overpace';
	} else if (isFuture) {
		burnStatus = 'insufficient_data';
		burnStatusReason = 'future_month';
	} else if (tooEarly) {
		burnStatus = 'insufficient_data';
		burnStatusReason = 'too_early';
	} else {
		burnStatus = dailyBurnRate.greaterThan(allowedDailyRate)
			? 'overpace'
			: 'ontrack';
	}

	return {
		daysElapsed,
		daysRemaining,
		daysInMonth,
		dailyBurnRate: dailyBurnRate.toNumber(),
		allowedDailyRate: allowedDailyRate.toNumber(),
		expectedPercentage,
		burnStatus,
		burnStatusReason,
	};
}

/**
 * Daily amount that remains available inside one envelope.
 *
 * A completed month has no remaining spending days, and an envelope at or over
 * its limit has no honest daily allowance. Both cases return `null` so callers
 * never render Infinity, NaN, or a misleading positive amount.
 */
export function computeSafeToSpend({
	budgetLimit,
	totalSpent,
	daysRemaining,
}: SafeToSpendInput): number | null {
	const spent = new Prisma.Decimal(totalSpent);
	const limit = new Prisma.Decimal(budgetLimit);
	if (daysRemaining <= 0 || spent.greaterThanOrEqualTo(limit)) return null;

	return limit.minus(spent).dividedBy(daysRemaining).toNumber();
}
