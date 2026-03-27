'use client';

import { isToday, isYesterday, format, parseISO } from 'date-fns';
import { formatCurrency as fmtCurrency } from '@/lib/formatters';
import { useCurrency } from '@/lib/contexts/currency-context';

interface DateGroupHeaderProps {
	date: string; // ISO date string (YYYY-MM-DD)
	totalAmount: number;
	currency?: string; // Use client/entry currency when available
}

function formatGroupDate(dateStr: string): string {
	// Parse as local date to avoid timezone shifts on date-only strings
	const date = parseISO(dateStr);
	if (isToday(date)) return 'Today';
	if (isYesterday(date)) return 'Yesterday';
	return format(date, 'MMM d, yyyy');
}

export function DateGroupHeader({ date, totalAmount, currency }: DateGroupHeaderProps) {
	const { formatCurrency } = useCurrency();

	const displayAmount = currency
		? fmtCurrency(totalAmount, { currency })
		: formatCurrency(totalAmount);

	return (
		<div className='flex items-center justify-between py-2 border-b'>
			<span className='text-sm font-semibold text-foreground'>
				{formatGroupDate(date)}
			</span>
			<span className='text-xs text-muted-foreground tabular-nums'>
				<span className='mr-1'>Unbilled:</span>
				{displayAmount}
			</span>
		</div>
	);
}
