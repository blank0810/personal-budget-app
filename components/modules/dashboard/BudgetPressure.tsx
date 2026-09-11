'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/lib/contexts/currency-context';
import type { DashboardOverview } from '@/server/modules/dashboard/dashboard.types';
import { PaceBadge } from '@/components/modules/budget/PaceBadge';

export function BudgetPressure({
	data,
}: {
	data: DashboardOverview['budgetPressure'];
}) {
	const { formatCurrency } = useCurrency();

	if (!data.hasBudgets) {
		return (
			<section
				className='border p-5 sm:p-6'
				aria-labelledby='budget-pressure-title'
			>
				<h2 id='budget-pressure-title' className='text-lg font-semibold'>
					Budget pressure
				</h2>
				<p className='mt-2 text-sm text-muted-foreground'>
					No current-month budgets exist yet.
				</p>
				<Button asChild variant='outline' size='sm' className='mt-5'>
					<Link href='/budgets'>Create a budget</Link>
				</Button>
			</section>
		);
	}

	return (
		<section
			className='border p-5 sm:p-6'
			aria-labelledby='budget-pressure-title'
		>
			<div className='flex items-end justify-between gap-4'>
				<div>
					<h2 id='budget-pressure-title' className='text-lg font-semibold'>
						Budget pressure
					</h2>
					<p className='mt-1 text-sm text-muted-foreground'>
						{formatCurrency(data.totalSpent)} of{' '}
						{formatCurrency(data.totalBudgeted)} used
					</p>
					{data.safeToSpendToday !== null && (
						<div className='mt-3'>
							<p className='text-xs text-muted-foreground'>
								Safe to spend today
							</p>
							<p className='font-mono text-lg font-semibold tabular-nums'>
								{formatCurrency(data.safeToSpendToday, { decimals: 0 })}
							</p>
							<p className='text-xs leading-4 text-muted-foreground'>
								Across envelopes still within their limits
							</p>
						</div>
					)}
				</div>
				<span className='font-mono text-xl font-semibold tabular-nums'>
					{Math.round(data.utilizationPercent ?? 0)}%
				</span>
			</div>
			<ul className='mt-6 divide-y'>
				{data.items.map((budget) => (
					<li key={budget.id} className='py-4 first:pt-0 last:pb-0'>
						<div className='flex items-start justify-between gap-4 text-sm'>
							<div className='flex min-w-0 flex-wrap items-center gap-2'>
								<span className='font-medium'>{budget.name}</span>
								{budget.unlinkedExpenseCount > 0 && (
									<Badge variant='outline'>
										{budget.unlinkedExpenseCount} not in envelope
									</Badge>
								)}
							</div>
							<PaceBadge
								actualPercentage={budget.percentage}
								expectedPercentage={budget.expectedPercentage}
								daysElapsed={budget.daysElapsed}
								daysInMonth={budget.daysInMonth}
								burnStatus={budget.burnStatus}
								burnStatusReason={budget.burnStatusReason}
								className='shrink-0 items-end text-right'
							/>
						</div>
						<div
							className='mt-2 h-1.5 overflow-hidden rounded-full bg-muted'
							role='progressbar'
							aria-label={`${budget.name} budget used`}
							aria-valuemin={0}
							aria-valuemax={100}
							aria-valuenow={Math.round(Math.min(100, budget.percentage))}
						>
							<div
								className={`h-full rounded-full ${
									budget.percentage > 100
										? 'bg-red-500'
										: budget.percentage >= 80
											? 'bg-amber-500'
											: 'bg-emerald-500'
								}`}
								style={{ width: `${Math.min(100, budget.percentage)}%` }}
							/>
						</div>
					</li>
				))}
			</ul>
			<Button asChild variant='ghost' size='sm' className='mt-5 px-0'>
				<Link href='/budgets'>Open Budgets</Link>
			</Button>
		</section>
	);
}
