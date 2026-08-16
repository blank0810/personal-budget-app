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
			className='grid gap-6 border-y bg-muted/25 py-5 sm:px-6 lg:grid-cols-[9rem_minmax(0,1fr)_minmax(20rem,0.8fr)] lg:items-center'
			aria-labelledby='financial-health-title'
		>
			<div>
				<p className='text-sm font-medium text-muted-foreground'>
					Financial health
				</p>
				<p className='mt-1 font-mono text-5xl font-semibold tabular-nums tracking-[-0.04em]'>
					{verdict.score}
					<span className='text-lg text-muted-foreground'>/100</span>
				</p>
			</div>
			<div>
				<h2
					id='financial-health-title'
					className={`text-2xl font-semibold tracking-[-0.025em] ${tone.text}`}
				>
					{verdict.label}
				</h2>
				<p className='mt-2 max-w-[65ch] text-sm leading-6 text-muted-foreground'>
					{verdict.description}
				</p>
			</div>
			<div className='grid gap-3 border-t pt-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0'>
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
					className='justify-self-start lg:justify-self-end'
				/>
			</div>
		</section>
	);
}
