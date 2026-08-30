'use client';

import { format, subMonths } from 'date-fns';
import {
	ArrowDownRight,
	ArrowUpRight,
	Minus,
	ReceiptText,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrency } from '@/lib/contexts/currency-context';
import { cn } from '@/lib/utils';
import type { CategorySpendComparison as CategorySpendComparisonItem } from '@/server/modules/budget/budget.analytics.types';

interface CategorySpendComparisonProps {
	items: CategorySpendComparisonItem[];
	month: Date;
}

export function CategorySpendComparison({
	items,
	month,
}: CategorySpendComparisonProps) {
	const { formatCurrency } = useCurrency();
	const previousMonth = subMonths(month, 1);

	return (
		<Card className='rounded-none shadow-none'>
			<CardHeader className='gap-1 border-b'>
				<div className='flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between'>
					<div>
						<CardTitle>Category spending</CardTitle>
						<p className='mt-1 max-w-[65ch] text-sm text-muted-foreground'>
							{format(month, 'MMMM')} compared with{' '}
							{format(previousMonth, 'MMMM yyyy')}. No envelope setup
							required.
						</p>
					</div>
					{items.length > 0 && (
						<p className='text-xs font-medium text-muted-foreground'>
							Biggest movers
						</p>
					)}
				</div>
			</CardHeader>
			<CardContent className='p-0'>
				{items.length === 0 ? (
					<div className='flex flex-col items-start gap-3 p-6 sm:p-8'>
						<ReceiptText
							className='h-5 w-5 text-muted-foreground'
							aria-hidden='true'
						/>
						<div className='space-y-1'>
							<h3 className='font-semibold'>
								No category activity to compare yet
							</h3>
							<p className='text-sm text-muted-foreground'>
								Log expenses to see month-over-month movement here.
							</p>
						</div>
						<Button asChild variant='outline' size='sm'>
							<Link href='/transactions'>View transactions</Link>
						</Button>
					</div>
				) : (
					<div role='table' aria-label='Category spending comparison'>
						<div
							role='row'
							className='hidden grid-cols-[minmax(0,1fr)_repeat(3,minmax(7rem,auto))] gap-4 border-b bg-muted/30 px-5 py-2 text-xs font-medium text-muted-foreground sm:grid'
						>
							<span role='columnheader'>Category</span>
							<span role='columnheader' className='text-right'>
								{format(previousMonth, 'MMM')}
							</span>
							<span role='columnheader' className='text-right'>
								{format(month, 'MMM')}
							</span>
							<span role='columnheader' className='text-right'>
								Change
							</span>
						</div>

						{items.map((item) => {
							const direction =
								item.amountDelta > 0
									? 'up'
									: item.amountDelta < 0
										? 'down'
										: 'flat';
							const DirectionIcon =
								direction === 'up'
									? ArrowUpRight
									: direction === 'down'
										? ArrowDownRight
										: Minus;

							return (
								<div
									key={item.categoryId}
									role='row'
									className='grid gap-3 border-b px-5 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_repeat(3,minmax(7rem,auto))] sm:items-center sm:gap-4'
								>
									<div role='cell' className='min-w-0'>
										<p className='truncate text-sm font-medium'>
											{item.categoryName}
										</p>
									</div>
									<div role='cell' className='flex justify-between gap-4 sm:block sm:text-right'>
										<span className='text-xs text-muted-foreground sm:hidden'>
											{format(previousMonth, 'MMM')}
										</span>
										<span className='font-mono text-sm tabular-nums'>
											{formatCurrency(item.previousTotal)}
										</span>
									</div>
									<div role='cell' className='flex justify-between gap-4 sm:block sm:text-right'>
										<span className='text-xs text-muted-foreground sm:hidden'>
											{format(month, 'MMM')}
										</span>
										<span className='font-mono text-sm font-semibold tabular-nums'>
											{formatCurrency(item.currentTotal)}
										</span>
									</div>
									<div role='cell' className='flex items-center justify-between gap-4 sm:justify-end'>
										<span className='text-xs text-muted-foreground sm:hidden'>
											Change
										</span>
										<div
											className={cn(
												'flex items-center gap-1.5 text-right text-sm',
												direction === 'up' &&
													'text-red-700 dark:text-red-300',
												direction === 'down' &&
													'text-emerald-700 dark:text-emerald-300',
												direction === 'flat' && 'text-muted-foreground'
											)}
										>
											<DirectionIcon
												className='h-4 w-4 shrink-0'
												aria-hidden='true'
											/>
											<div>
												<p className='font-mono font-medium tabular-nums'>
													{item.amountDelta > 0 ? '+' : item.amountDelta < 0 ? '−' : ''}
													{formatCurrency(item.absoluteDelta)}
												</p>
												<p className='text-xs'>
													{item.percentDelta === null
														? 'No prior-month spend'
														: direction === 'flat'
															? 'No change'
															: `${Math.abs(item.percentDelta).toFixed(0)}% ${direction}`}
												</p>
											</div>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
