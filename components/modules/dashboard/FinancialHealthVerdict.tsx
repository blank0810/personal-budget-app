import { formatCurrency } from '@/lib/formatters';
import type { DashboardOverview } from '@/server/modules/dashboard/dashboard.types';
import { DashboardActionButton } from './DashboardActionButton';
import { DASHBOARD_TONE_STYLES } from './dashboard-styles';

export function FinancialHealthVerdict({
	health,
	evidence,
	currency,
}: {
	health: DashboardOverview['health'];
	evidence: DashboardOverview['evidence'];
	currency: string;
}) {
	const { verdict } = health;
	const tone = verdict ? DASHBOARD_TONE_STYLES[verdict.tone] : null;
	const amounts = [
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
				evidence.surplus >= 0 ? 'Surplus this month' : 'Deficit this month',
			value: evidence.surplus,
			tone:
				evidence.surplus >= 0
					? 'text-emerald-700 dark:text-emerald-300'
					: 'text-red-700 dark:text-red-300',
		},
	];

	return (
		<section
			className='border-y bg-muted/25 py-4 sm:px-6'
			aria-labelledby='financial-health-title'
		>
			<div className='grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,0.75fr)] xl:items-center'>
				<div>
					<p className='text-xs font-medium text-muted-foreground'>Net worth</p>
					<div className='mt-1 flex flex-wrap items-center gap-3'>
						<p className='font-mono text-4xl font-semibold tabular-nums tracking-[-0.04em] sm:text-5xl'>
							{formatCurrency(evidence.netWorth, { currency })}
						</p>
						{verdict && tone && (
							<span
								className={`inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs font-semibold ${tone.badge}`}
							>
								<span
									className={`size-2 rounded-full ${tone.marker}`}
									aria-hidden='true'
								/>
								<span className='sr-only'>Financial health: </span>
								{verdict.label} · {verdict.score}/100
							</span>
						)}
					</div>
					<h2
						id='financial-health-title'
						className='mt-2 max-w-[60ch] text-base font-normal leading-6 text-muted-foreground'
					>
						{verdict
							? verdict.description
							: 'Your balances are available, but savings and cash flow need income and expense history before the score is credible.'}
					</h2>
				</div>
				{verdict ? (
					<div className='grid gap-3 border-t pt-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0'>
						<div>
							<p className='text-sm font-medium'>
								{verdict.focus.pillarName
									? `Focus: ${verdict.focus.pillarName}`
									: 'No weak pillar'}
							</p>
							<p className='mt-1 text-sm leading-5 text-muted-foreground'>
								{verdict.focus.recommendation}
							</p>
						</div>
						<DashboardActionButton
							action={verdict.focus.action}
							variant='default'
							className='justify-self-start sm:justify-self-end'
						/>
					</div>
				) : (
					<div className='flex flex-wrap gap-2 border-t pt-4 xl:justify-end xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0'>
						<DashboardActionButton
							action={{
								kind: 'quick-action',
								action: 'income',
								label: 'Add income',
							}}
							variant='default'
						/>
						<DashboardActionButton
							action={{
								kind: 'quick-action',
								action: 'expense',
								label: 'Add expense',
							}}
						/>
					</div>
				)}
			</div>
			<dl className='-mb-4 mt-4 grid border-t sm:-mx-6 sm:grid-cols-3'>
				{amounts.map((item) => (
					<div
						key={item.label}
						className='border-b py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:px-6 sm:last:border-r-0'
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
		</section>
	);
}
