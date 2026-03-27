'use client';

import { isToday, isYesterday, format, parseISO } from 'date-fns';
import { useCurrency } from '@/lib/contexts/currency-context';

interface DateGroupHeaderProps {
	date: string; // ISO date string (YYYY-MM-DD)
	totalAmount: number;
}

function formatGroupDate(dateStr: string): string {
	// Parse as local date to avoid timezone shifts on date-only strings
	const date = parseISO(dateStr);
	if (isToday(date)) return 'Today';
	if (isYesterday(date)) return 'Yesterday';
	return format(date, 'MMM d, yyyy');
}

export function DateGroupHeader({ date, totalAmount }: DateGroupHeaderProps) {
	const { formatCurrency } = useCurrency();

	return (
		<div className='flex items-center justify-between py-2 border-b'>
			<span className='text-sm font-semibold text-foreground'>
				{formatGroupDate(date)}
			</span>
			<span className='text-xs text-muted-foreground tabular-nums'>
				<span className='mr-1'>Unbilled:</span>
				{formatCurrency(totalAmount)}
			</span>
		</div>
	);
}
