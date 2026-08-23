'use client';

import {
	ArrowLeftRight,
	CreditCard,
	Droplets,
	PiggyBank,
	Shield,
} from 'lucide-react';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
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

const COLUMNS = 'md:grid-cols-[minmax(0,1.2fr)_7rem_minmax(0,1fr)]';

type Pillars = DashboardOverview['health']['pillars'];

function weakestPillar(pillars: Pillars) {
	return pillars.reduce<Pillars[number] | null>((weakest, pillar) => {
		if (pillar.status !== 'supported' || pillar.score === null) return weakest;
		if (!weakest || weakest.score === null) return pillar;
		return pillar.score < weakest.score ? pillar : weakest;
	}, null);
}

export function HealthLedger({ pillars }: { pillars: Pillars }) {
	const weakest = weakestPillar(pillars);

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
						Five questions. One comparable view. Open a pillar for what to do
						about it.
					</p>
				</div>
				<span className='text-sm text-muted-foreground'>100% total weight</span>
			</div>
			<div
				className={`mt-3 hidden border-b pb-2 text-xs font-medium text-muted-foreground md:grid md:gap-x-6 md:pr-8 ${COLUMNS}`}
			>
				<span>Pillar</span>
				<span>Grade</span>
				<span>Evidence</span>
			</div>
			<Accordion
				type='multiple'
				defaultValue={weakest ? [weakest.name] : []}
				className='border-b'
			>
				{pillars.map((pillar) => {
					const Icon = ICONS[pillar.name];
					const tone = DASHBOARD_TONE_STYLES[pillar.tone];
					return (
						<AccordionItem key={pillar.name} value={pillar.name}>
							<AccordionTrigger className='py-3 hover:no-underline'>
								<span
									className={`grid w-full gap-2 md:items-center md:gap-x-6 ${COLUMNS}`}
								>
									<span className='flex gap-3'>
										<Icon
											aria-hidden='true'
											className={`mt-0.5 size-4 shrink-0 ${tone.text}`}
										/>
										<span className='block'>
											<span className='flex flex-wrap items-baseline gap-x-2'>
												<span className='font-medium'>{pillar.name}</span>
												<span className='text-xs font-normal text-muted-foreground'>
													{Math.round(pillar.weight * 100)}% weight
												</span>
											</span>
											<span className='mt-0.5 block text-sm font-normal text-muted-foreground'>
												{pillar.question}
											</span>
										</span>
									</span>
									<span className='flex items-center gap-2'>
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
									</span>
									<span className='block text-sm font-normal text-muted-foreground'>
										{pillar.evidence}
									</span>
								</span>
							</AccordionTrigger>
							<AccordionContent className='pb-3 pl-7'>
								<div className='grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center'>
									<p className='max-w-[75ch] leading-5 text-muted-foreground'>
										{pillar.recommendation ??
											'Add more history and this pillar will start scoring.'}
									</p>
									<DashboardActionButton
										action={pillar.action}
										variant='outline'
										className='justify-self-start sm:justify-self-end'
									/>
								</div>
							</AccordionContent>
						</AccordionItem>
					);
				})}
			</Accordion>
		</section>
	);
}
