const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface UtcMonthBounds {
	start: Date;
	end: Date;
	endExclusive: Date;
}

/**
 * Budget.month is a UTC-midnight anchor. Every budget query must derive its
 * calendar fields from UTC as well, or a server west of UTC will select the
 * previous month.
 */
export function normalizeBudgetMonth(date: Date): Date {
	return new Date(
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0)
	);
}

export function addUtcMonths(date: Date, amount: number): Date {
	const month = normalizeBudgetMonth(date);
	return new Date(
		Date.UTC(
			month.getUTCFullYear(),
			month.getUTCMonth() + amount,
			1,
			0,
			0,
			0,
			0
		)
	);
}

export function getUtcMonthBounds(date: Date): UtcMonthBounds {
	const start = normalizeBudgetMonth(date);
	const endExclusive = addUtcMonths(start, 1);
	return {
		start,
		end: new Date(endExclusive.getTime() - 1),
		endExclusive,
	};
}

export function getUtcYearBounds(year: number) {
	return {
		start: new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)),
		endExclusive: new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0)),
	};
}

export function getUtcMonthKey(date: Date): string {
	const month = normalizeBudgetMonth(date);
	return `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function getUtcCategoryMonthKey(
	categoryId: string,
	date: Date
): string {
	return `${categoryId}:${getUtcMonthKey(date)}`;
}

export function eachUtcMonth(from: Date, to: Date): Date[] {
	const start = normalizeBudgetMonth(from);
	const end = normalizeBudgetMonth(to);
	const months: Date[] = [];

	for (
		let month = start;
		month.getTime() <= end.getTime();
		month = addUtcMonths(month, 1)
	) {
		months.push(month);
	}

	return months;
}

export function differenceInUtcCalendarDays(later: Date, earlier: Date): number {
	const laterDay = Date.UTC(
		later.getUTCFullYear(),
		later.getUTCMonth(),
		later.getUTCDate()
	);
	const earlierDay = Date.UTC(
		earlier.getUTCFullYear(),
		earlier.getUTCMonth(),
		earlier.getUTCDate()
	);
	return Math.floor((laterDay - earlierDay) / MS_PER_DAY);
}

export function formatUtcMonth(
	date: Date,
	month: 'short' | 'long' = 'short'
): string {
	return new Intl.DateTimeFormat('en-US', {
		month,
		year: 'numeric',
		timeZone: 'UTC',
	}).format(date);
}
