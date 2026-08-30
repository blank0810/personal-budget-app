import { AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
	MIN_DAYS_FOR_VERDICT,
	type BurnStatus,
	type BurnStatusReason,
} from '@/server/modules/budget/budget.burn';

interface PaceBadgeProps {
	actualPercentage: number;
	expectedPercentage: number;
	daysElapsed: number;
	daysInMonth: number;
	burnStatus: BurnStatus;
	burnStatusReason: BurnStatusReason;
	className?: string;
}

export function PaceBadge({
	actualPercentage,
	expectedPercentage,
	daysElapsed,
	daysInMonth,
	burnStatus,
	burnStatusReason,
	className,
}: PaceBadgeProps) {
	const actual = Math.round(actualPercentage);
	const expected = Math.round(expectedPercentage);
	const calendarPosition = `Day ${daysElapsed} of ${daysInMonth}`;
	const expectedBy = daysElapsed === daysInMonth ? 'month end' : 'today';

	if (burnStatus === 'insufficient_data') {
		if (burnStatusReason !== 'too_early') return null;

		return (
			<div
				className={cn('flex flex-col items-start gap-0.5', className)}
				title={calendarPosition}
			>
				<div className='inline-flex items-center gap-1 text-xs text-muted-foreground'>
					<Clock3 className='h-3 w-3' aria-hidden='true' />
					<span className='font-mono tabular-nums'>{actual}%</span>
					<span aria-hidden='true'>·</span>
					<span>too early to call</span>
				</div>
				<p className='text-xs leading-4 text-muted-foreground'>
					(pace verdict starts on day {MIN_DAYS_FOR_VERDICT})
				</p>
			</div>
		);
	}

	const isOverLimit = actualPercentage >= 100;
	const label = burnStatus === 'overpace' ? 'ahead of pace' : 'within pace';
	const Icon = burnStatus === 'overpace' ? AlertTriangle : CheckCircle2;
	const tone =
		burnStatus === 'ontrack'
			? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
			: isOverLimit
				? 'border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300'
				: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300';

	return (
		<div
			className={cn('flex flex-col items-start gap-0.5', className)}
			title={calendarPosition}
		>
			<Badge variant='outline' className={cn('gap-1 font-medium', tone)}>
				<Icon className='h-3 w-3' aria-hidden='true' />
				<span className='font-mono tabular-nums'>{actual}%</span>
				<span aria-hidden='true'>·</span>
				<span>{label}</span>
			</Badge>
			<p className='text-xs leading-4 text-muted-foreground'>
				(expected {expected}% by {expectedBy})
			</p>
		</div>
	);
}
