import type { DashboardOverview } from '@/server/modules/dashboard/dashboard.types';
import { DashboardActionButton } from './DashboardActionButton';
import { DASHBOARD_TONE_STYLES } from './dashboard-styles';

export function FinancialHealthVerdict({
	health,
}: {
	health: DashboardOverview['health'];
}) {
	if (!health.verdict) {
		return (
			<section className='grid gap-5 border-y bg-muted/25 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center'>
				<div>
					<h2 className='text-xl font-semibold tracking-[-0.02em]'>
						More activity is needed for a diagnosis.
					</h2>
					<p className='mt-2 max-w-[65ch] text-sm text-muted-foreground'>
						Your balances are available, but savings and cash flow need
						income and expense history before the score is credible.
					</p>
				</div>
				<div className='flex flex-wrap gap-2'>
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
			</section>
		);
	}

	const { verdict } = health;
	const tone = DASHBOARD_TONE_STYLES[verdict.tone];
	return (
		<section
			className='grid gap-5 border-y bg-muted/25 py-4 sm:px-6 xl:grid-cols-[10rem_minmax(0,1fr)_minmax(19rem,0.75fr)] xl:items-center'
			aria-labelledby='financial-health-title'
		>
			<div>
				<div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
					<p className='text-sm font-medium text-muted-foreground'>
						Financial health
					</p>
					<span className={`text-xs font-semibold ${tone.text}`}>
						{verdict.label}
					</span>
				</div>
				<p className='mt-1 font-mono text-5xl font-semibold tabular-nums tracking-[-0.04em]'>
					{verdict.score}
					<span className='text-lg text-muted-foreground'>/100</span>
				</p>
			</div>
			<div>
				<h2
					id='financial-health-title'
					className='max-w-[36ch] text-xl font-semibold leading-7 tracking-[-0.02em] text-balance sm:text-2xl sm:leading-8'
				>
					{verdict.description}
				</h2>
			</div>
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
		</section>
	);
}
