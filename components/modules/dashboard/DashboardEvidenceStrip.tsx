import { formatCurrency } from '@/lib/formatters';
import type { DashboardOverview } from '@/server/modules/dashboard/dashboard.types';

export function DashboardEvidenceStrip({
	evidence,
	currency,
}: {
	evidence: DashboardOverview['evidence'];
	currency: string;
}) {
	const values = [
		{ label: 'Net worth', value: evidence.netWorth, tone: '' },
		{
			label: 'Income this month',
			value: evidence.income,
			tone: 'text-emerald-700 dark:text-emerald-300',
		},
		{
			label: 'Expenses this month',
			value: evidence.expense,
			tone: 'text-red-700 dark:text-red-300',
		},
		{
			label:
				evidence.surplus >= 0
					? 'Surplus this month'
					: 'Deficit this month',
			value: evidence.surplus,
			tone:
				evidence.surplus >= 0
					? 'text-emerald-700 dark:text-emerald-300'
					: 'text-red-700 dark:text-red-300',
		},
	];

	return (
		<dl className='grid border-y sm:grid-cols-2 lg:grid-cols-4'>
			{values.map((item) => (
				<div
					key={item.label}
					className='border-b py-4 sm:px-5 sm:[&:nth-child(odd)]:border-r lg:border-b-0 lg:border-r lg:last:border-r-0'
				>
					<dt className='text-xs font-medium text-muted-foreground'>
						{item.label}
					</dt>
					<dd
						className={`mt-1 font-mono text-xl font-semibold tabular-nums ${item.tone}`}
					>
						{formatCurrency(item.value, { currency })}
					</dd>
				</div>
			))}
		</dl>
	);
}
