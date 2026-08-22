import {
	endOfMonth,
	endOfQuarter,
	endOfYear,
	startOfMonth,
	startOfQuarter,
	startOfYear,
	subMonths,
} from 'date-fns';

export type DatePreset =
	| 'THIS_MONTH'
	| 'LAST_MONTH'
	| 'LAST_2_MONTHS'
	| 'LAST_3_MONTHS'
	| 'THIS_QUARTER'
	| 'THIS_YEAR';

export function resolveDatePreset(
	preset: DatePreset,
	today: Date
): { from: Date; to: Date } {
	switch (preset) {
		case 'THIS_MONTH':
			return {
				from: startOfMonth(today),
				to: endOfMonth(today),
			};
		case 'LAST_MONTH': {
			const lastMonth = subMonths(today, 1);
			return {
				from: startOfMonth(lastMonth),
				to: endOfMonth(lastMonth),
			};
		}
		case 'LAST_2_MONTHS':
			return {
				from: startOfMonth(subMonths(today, 2)),
				to: endOfMonth(subMonths(today, 1)),
			};
		case 'LAST_3_MONTHS':
			return {
				from: startOfMonth(subMonths(today, 3)),
				to: endOfMonth(subMonths(today, 1)),
			};
		case 'THIS_QUARTER':
			return {
				from: startOfQuarter(today),
				to: endOfQuarter(today),
			};
		case 'THIS_YEAR':
			return {
				from: startOfYear(today),
				to: endOfYear(today),
			};
	}
}
