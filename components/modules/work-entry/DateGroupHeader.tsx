'use client';

import { isToday, isYesterday, format, parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/formatters';

interface DateGroupHeaderProps {
	date: string; // ISO date string (YYYY-MM-DD)
	/** Map of currency code → unbilled total for that currency */
	currencyTotals: Record<string, number>;
}

function formatGroupDate(dateStr: string): string {
	// Parse as local date to avoid timezone shifts on date-only strings
	const date = parseISO(dateStr);
	if (isToday(date)) return 'Today';
	if (isYesterday(date)) return 'Yesterday';
	return format(date, 'MMM d, yyyy');
}

export function DateGroupHeader({ date, currencyTotals }: DateGroupHeaderProps) {
	const currencies = Object.entries(currencyTotals).filter(
		([, total]) => total > 0
	);

	return (
		<div className='flex items-center justify-between py-2 border-b'>
			<span className='text-sm font-semibold text-foreground'>
				{formatGroupDate(date)}
			</span>
			{currencies.length > 0 && (
				<span className='text-xs text-muted-foreground tabular-nums'>
					<span className='mr-1'>Unbilled:</span>
					{currencies.map(([currency, total], i) => (
						<span key={currency}>
							{i > 0 && <span className='mx-1 text-border'>|</span>}
							{formatCurrency(total, { currency })}
						</span>
					))}
				</span>
			)}
		</div>
	);
}
