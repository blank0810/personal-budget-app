import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import type { DashboardOverview } from '@/server/modules/dashboard/dashboard.types';

export function BudgetPressure({
	data,
	currency,
}: {
	data: DashboardOverview['budgetPressure'];
	currency: string;
}) {
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
						{formatCurrency(data.totalSpent, { currency })} of{' '}
						{formatCurrency(data.totalBudgeted, { currency })} used
					</p>
				</div>
				<span className='font-mono text-xl font-semibold tabular-nums'>
					{Math.round(data.utilizationPercent ?? 0)}%
				</span>
			</div>
			<ul className='mt-6 divide-y'>
				{data.items.map((budget) => (
					<li key={budget.id} className='py-4 first:pt-0 last:pb-0'>
						<div className='flex items-center justify-between gap-4 text-sm'>
							<span className='font-medium'>{budget.name}</span>
							<span className='font-mono tabular-nums text-muted-foreground'>
								{Math.round(budget.percentage)}%
							</span>
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
