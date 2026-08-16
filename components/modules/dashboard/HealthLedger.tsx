import {
	ArrowLeftRight,
	CreditCard,
	Droplets,
	PiggyBank,
	Shield,
} from 'lucide-react';
import type { DashboardOverview } from '@/server/modules/dashboard/dashboard.types';
import { DashboardActionButton } from './DashboardActionButton';
import { DASHBOARD_TONE_STYLES } from './dashboard-styles';

const ICONS = {
	Solvency: Shield,
	Liquidity: Droplets,
	Savings: PiggyBank,
	'Debt Management': CreditCard,
	'Cash Flow': ArrowLeftRight,
};

export function HealthLedger({
	pillars,
}: {
	pillars: DashboardOverview['health']['pillars'];
}) {
	return (
		<section aria-labelledby='health-ledger-title'>
			<div className='flex items-end justify-between gap-4'>
				<div>
					<h2
						id='health-ledger-title'
						className='text-xl font-semibold tracking-[-0.02em]'
					>
						Health Ledger
					</h2>
					<p className='mt-1 text-sm text-muted-foreground'>
						Five questions. One comparable view.
					</p>
				</div>
				<span className='text-sm text-muted-foreground'>100% total weight</span>
			</div>
			<div className='mt-3 md:grid md:grid-cols-[minmax(12rem,1.2fr)_7rem_minmax(12rem,1fr)_auto] md:gap-x-6'>
				<div className='hidden border-b pb-2 text-xs font-medium text-muted-foreground md:col-span-full md:grid md:grid-cols-subgrid'>
					<span>Pillar</span>
					<span>Grade</span>
					<span>Evidence</span>
					<span className='text-right'>Next action</span>
				</div>
				<ol className='md:col-span-full md:grid md:grid-cols-subgrid'>
					{pillars.map((pillar) => {
						const Icon = ICONS[pillar.name];
						const tone = DASHBOARD_TONE_STYLES[pillar.tone];
						return (
							<li
								key={pillar.name}
								className='grid gap-3 border-b py-3 md:col-span-full md:grid-cols-subgrid md:items-center md:gap-x-6'
							>
								<div className='flex gap-3'>
									<Icon
										aria-hidden='true'
										className={`mt-0.5 size-4 shrink-0 ${tone.text}`}
									/>
									<div>
										<div className='flex flex-wrap items-baseline gap-x-2'>
											<h3 className='font-medium'>{pillar.name}</h3>
											<span className='text-xs text-muted-foreground'>
												{Math.round(pillar.weight * 100)}% weight
											</span>
										</div>
										<p className='mt-0.5 text-sm text-muted-foreground'>
											{pillar.question}
										</p>
									</div>
								</div>
								<div className='flex items-center gap-2'>
									<span
										className={`size-2 rounded-full ${tone.marker}`}
										aria-hidden='true'
									/>
									<span
										className={`rounded-md px-2 py-1 text-xs font-semibold ${tone.badge}`}
									>
										{pillar.status === 'needs-data'
											? 'Needs data'
											: `${pillar.grade} · ${pillar.score}`}
									</span>
								</div>
								<p className='text-sm text-muted-foreground'>
									{pillar.evidence}
								</p>
								<DashboardActionButton
									action={pillar.action}
									variant='ghost'
									className='justify-self-start md:justify-self-end'
								/>
							</li>
						);
					})}
				</ol>
			</div>
		</section>
	);
}
