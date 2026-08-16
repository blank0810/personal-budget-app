import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import type { DashboardOverview } from '@/server/modules/dashboard/dashboard.types';

export function AccountsDebtSummary({
	data,
	currency,
}: {
	data: DashboardOverview['accountsDebt'];
	currency: string;
}) {
	const rows = [
		{
			label: 'Liquid assets',
			value: formatCurrency(data.liquidAssets, { currency }),
		},
		{
			label: 'Liabilities',
			value: formatCurrency(data.liabilities, { currency }),
		},
		{
			label: 'Net worth',
			value: formatCurrency(data.netWorth, { currency }),
		},
		{
			label: 'Credit utilization',
			value:
				data.creditUtilization === null
					? 'No credit accounts'
					: `${data.creditUtilization.toFixed(1)}%`,
		},
	];

	return (
		<section
			className='border p-5 sm:p-6'
			aria-labelledby='accounts-debt-title'
		>
			<h2 id='accounts-debt-title' className='text-lg font-semibold'>
				Accounts and debt
			</h2>
			<dl className='mt-5 divide-y'>
				{rows.map((row) => (
					<div
						key={row.label}
						className='flex items-center justify-between gap-4 py-3 first:pt-0'
					>
						<dt className='text-sm text-muted-foreground'>{row.label}</dt>
						<dd className='font-mono text-sm font-semibold tabular-nums'>
							{row.value}
						</dd>
					</div>
				))}
			</dl>
			<Button asChild variant='ghost' size='sm' className='mt-3 px-0'>
				<Link href='/accounts'>Open Accounts</Link>
			</Button>
		</section>
	);
}
