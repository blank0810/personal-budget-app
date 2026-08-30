const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Minimum elapsed days before a pace verdict is statistically honest. */
const MIN_DAYS_FOR_VERDICT = 7;

export type BurnStatus = 'ontrack' | 'overpace' | 'insufficient_data';

export interface BurnMetricsInput {
	monthStart: Date;
	monthEnd: Date;
	totalSpent: number;
	budgetLimit: number;
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
}

/**
 * Pace metrics for one envelope-month.
 *
 * `daysElapsed` is clamped to [1, daysInMonth]. Without the upper clamp a past
 * month's elapsed days grow without bound, driving `dailyBurnRate` toward zero
 * and reporting "ontrack" for an envelope that blew its limit months ago.
 *
 * The verdict is suppressed below MIN_DAYS_FOR_VERDICT because straight-line
 * pacing is not honest early in a month — a single day-1 rent posting would
 * otherwise guarantee "overpace".
 */
export function computeBurnMetrics({
	monthStart,
	monthEnd,
	totalSpent,
	budgetLimit,
	today = new Date(),
}: BurnMetricsInput): BurnMetrics {
	// `monthStart`/`monthEnd` are built with local-time setters by the callers,
	// so they must be read with local getters. Reading them as UTC collapses
	// `daysInMonth` to 1 for any negative-offset timezone.
	const daysInMonth = monthEnd.getDate();

	const rawElapsed =
		Math.floor((today.getTime() - monthStart.getTime()) / MS_PER_DAY) + 1;
	const daysElapsed = Math.min(daysInMonth, Math.max(1, rawElapsed));
	const daysRemaining = Math.max(0, daysInMonth - daysElapsed);

	const dailyBurnRate = totalSpent / daysElapsed;
	const allowedDailyRate = budgetLimit > 0 ? budgetLimit / daysInMonth : 0;
	const expectedPercentage = (daysElapsed / daysInMonth) * 100;

	// A month that has not started yet, or has barely started, cannot support a
	// pace verdict — rawElapsed <= 0 means the month is in the future.
	const isFuture = rawElapsed <= 0;
	const tooEarly = daysElapsed < MIN_DAYS_FOR_VERDICT && daysRemaining > 0;

	const burnStatus: BurnStatus =
		isFuture || tooEarly
			? 'insufficient_data'
			: dailyBurnRate > allowedDailyRate
				? 'overpace'
				: 'ontrack';

	return {
		daysElapsed,
		daysRemaining,
		daysInMonth,
		dailyBurnRate,
		allowedDailyRate,
		expectedPercentage,
		burnStatus,
	};
}
