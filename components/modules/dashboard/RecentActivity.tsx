import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { ArrowDown, ArrowLeftRight, ArrowUp, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import type { DashboardOverview } from '@/server/modules/dashboard/dashboard.types';

const META = {
	income: { label: 'Income', icon: ArrowUp },
	expense: { label: 'Expense', icon: ArrowDown },
	transfer: { label: 'Transfer', icon: ArrowLeftRight },
	payment: { label: 'Payment', icon: CreditCard },
};

export function RecentActivity({
	items,
	currency,
}: {
	items: DashboardOverview['recentActivity'];
	currency: string;
}) {
	return (
		<section
			className='border p-5 sm:p-6'
			aria-labelledby='recent-activity-title'
		>
			<div className='flex items-center justify-between gap-4'>
				<h2 id='recent-activity-title' className='text-lg font-semibold'>
					Recent activity
				</h2>
				<Button asChild variant='ghost' size='sm'>
					<Link href='/transactions'>View all</Link>
				</Button>
			</div>
			{items.length === 0 ? (
				<p className='mt-5 text-sm text-muted-foreground'>
					Income, expenses, transfers, and debt payments will appear here.
				</p>
			) : (
				<ul className='mt-4 divide-y'>
					{items.map((item) => {
						const meta = META[item.kind];
						const Icon = meta.icon;
						return (
							<li
								key={`${item.kind}-${item.id}`}
								className='grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3'
							>
								<Icon
									className='size-4 text-muted-foreground'
									aria-hidden='true'
								/>
								<div className='min-w-0'>
									<div className='flex items-center gap-2'>
										<p className='truncate text-sm font-medium'>{item.title}</p>
										<span className='text-xs text-muted-foreground'>
											{meta.label}
										</span>
									</div>
									<p className='truncate text-xs text-muted-foreground'>
										{item.context} · {format(parseISO(item.date), 'MMM d')}
									</p>
								</div>
								<span
									className={`font-mono text-sm font-semibold tabular-nums ${
										item.direction === 'in'
											? 'text-emerald-700 dark:text-emerald-300'
											: item.direction === 'out'
												? 'text-red-700 dark:text-red-300'
												: 'text-foreground'
									}`}
								>
									{item.direction === 'in'
										? '+'
										: item.direction === 'out'
											? '−'
											: ''}
									{formatCurrency(item.amount, { currency })}
								</span>
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
}
