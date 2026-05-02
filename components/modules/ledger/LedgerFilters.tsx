'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const TYPE_CHIPS = [
	{ value: null, label: 'All' },
	{ value: 'income', label: 'Income' },
	{ value: 'expense', label: 'Expense' },
	{ value: 'transfer', label: 'Transfer' },
	{ value: 'payment', label: 'Payment' },
] as const;

interface LedgerFiltersProps {
	accounts: Array<{ id: string; name: string }>;
}

export function LedgerFilters({ accounts }: LedgerFiltersProps) {
	const router = useRouter();
	const searchParams = useSearchParams();

	const activeType = searchParams.get('type') ?? null;
	const startDate = searchParams.get('from') ?? '';
	const endDate = searchParams.get('to') ?? '';
	const activeAccountIds = searchParams.getAll('accountId');

	const hasAnyFilter =
		activeType !== null ||
		startDate !== '' ||
		endDate !== '' ||
		activeAccountIds.length > 0;

	const updateParams = useCallback(
		(updates: Record<string, string | string[] | null>) => {
			const params = new URLSearchParams(searchParams.toString());
			for (const [key, value] of Object.entries(updates)) {
				if (value === null || (Array.isArray(value) && value.length === 0)) {
					params.delete(key);
				} else if (Array.isArray(value)) {
					params.delete(key);
					for (const v of value) {
						params.append(key, v);
					}
				} else {
					params.set(key, value);
				}
			}
			params.delete('page');
			router.replace(`?${params.toString()}`, { scroll: false });
		},
		[router, searchParams]
	);

	const toggleAccount = (id: string) => {
		const next = activeAccountIds.includes(id)
			? activeAccountIds.filter((a) => a !== id)
			: [...activeAccountIds, id];
		updateParams({ accountId: next.length > 0 ? next : null });
	};

	const resetAll = () => {
		router.replace('?', { scroll: false });
	};

	const dateLabel =
		startDate && endDate
			? `${format(new Date(startDate), 'MMM d')} – ${format(new Date(endDate), 'MMM d, yyyy')}`
			: startDate
				? `From ${format(new Date(startDate), 'MMM d, yyyy')}`
				: endDate
					? `Until ${format(new Date(endDate), 'MMM d, yyyy')}`
					: 'All time';

	return (
		<div className='space-y-3'>
			{/* Row 1: date range + reset */}
			<div className='flex flex-wrap items-center gap-2'>
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant='outline'
							size='sm'
							className={cn(
								'gap-2 text-xs',
								(startDate || endDate) && 'border-primary'
							)}
						>
							<CalendarIcon className='h-3.5 w-3.5' />
							{dateLabel}
						</Button>
					</PopoverTrigger>
					<PopoverContent className='w-auto p-0' align='start'>
						<Calendar
							mode='range'
							selected={{
								from: startDate ? new Date(startDate) : undefined,
								to: endDate ? new Date(endDate) : undefined,
							}}
							onSelect={(range) => {
								updateParams({
									from: range?.from ? range.from.toISOString() : null,
									to: range?.to ? range.to.toISOString() : null,
								});
							}}
							numberOfMonths={2}
						/>
					</PopoverContent>
				</Popover>

				{hasAnyFilter && (
					<Button
						variant='ghost'
						size='sm'
						className='gap-1.5 text-xs text-muted-foreground ml-auto'
						onClick={resetAll}
					>
						<X className='h-3 w-3' />
						Reset filters
					</Button>
				)}
			</div>

			{/* Row 2: type chips */}
			<div className='flex flex-wrap items-center gap-2'>
				{TYPE_CHIPS.map((chip) => (
					<button
						key={chip.label}
						type='button'
						onClick={() => updateParams({ type: chip.value })}
						className={cn(
							'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
							activeType === chip.value ||
								(chip.value === null && activeType === null)
								? 'border-primary bg-primary text-primary-foreground'
								: 'border-border bg-background text-muted-foreground hover:bg-accent'
						)}
					>
						{chip.label}
					</button>
				))}
			</div>

			{/* Row 3: account chips (only shown if there are accounts) */}
			{accounts.length > 0 && (
				<div className='flex flex-wrap items-center gap-2'>
					<span className='text-xs text-muted-foreground'>Accounts:</span>
					{accounts.map((account) => {
						const isActive = activeAccountIds.includes(account.id);
						return (
							<button
								key={account.id}
								type='button'
								onClick={() => toggleAccount(account.id)}
								className={cn(
									'flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
									isActive
										? 'border-primary bg-primary/10 text-primary'
										: 'border-border bg-background text-muted-foreground hover:bg-accent'
								)}
							>
								{account.name}
								{isActive && <X className='h-2.5 w-2.5' />}
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}
