import type { Metadata } from 'next';
import { PageHero } from '@/components/modules/landing/statement/PageHero';
import { SectionHead } from '@/components/modules/landing/statement/SectionHead';
import { Ledger, LedgerRow } from '@/components/modules/landing/statement/Ledger';
import { Shot } from '@/components/modules/landing/statement/Shot';
import { StatementCTA } from '@/components/modules/landing/statement/StatementCTA';
import { APP_URL } from '@/lib/url';

export const metadata: Metadata = {
	title: 'How Budget Planner Works — Manual Tracking',
	description:
		'Set budgets, track every transaction, and reach your savings goals. Also send client invoices and log income — all in one app, no switching between tools.',
	alternates: {
		canonical: '/how-it-works',
	},
	openGraph: {
		title: 'How Budget Planner Works — Manual Tracking · Budget Planner',
		description:
			'Set budgets, track every transaction, and reach your savings goals. All in one app — no bank linking required.',
		url: `${APP_URL}/how-it-works`,
		type: 'website',
		siteName: 'Budget Planner',
		locale: 'en_US',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'How Budget Planner Works — Manual Tracking · Budget Planner',
		description:
			'Set budgets, track every transaction, and reach your savings goals. All in one app — no bank linking required.',
	},
};

const STEPS = [
	{
		title: 'Add the accounts you actually have',
		body: 'Cash, bank, savings, credit cards, loans. Enter each one’s current balance as its opening figure; every later change is traceable back to it.',
		time: 'about 2 minutes',
	},
	{
		title: 'Create envelopes for what you actually spend on',
		body: 'A limit per category per month — rent, groceries, transport, whatever your life is made of. You can change them any month.',
		time: 'about 2 minutes',
	},
	{
		title: 'Log transactions, or import them',
		body: 'Add each one as it happens, or download a CSV from your bank and run the import wizard. It flags likely duplicates before they land and the whole batch can be undone.',
		time: 'ongoing, or one import',
	},
	{
		title: 'Read what it says',
		body: 'The dashboard grades five pillars, gives one score out of 100, and names the single thing most worth fixing. It updates the moment you log — no overnight sync.',
		time: 'immediate',
	},
];

const TRADEOFFS = [
	{
		label: 'You do the entering',
		note: 'That is the cost, and it is a real one. Aggregator apps fill themselves in; this one does not.',
	},
	{
		label: 'No banking credentials, ever',
		note: 'The app never asks for your online-banking login, because it has nothing to do with it. There is no third-party aggregator holding a token to your account.',
	},
	{
		label: 'You notice your own spending',
		note: 'The side effect people report from manual logging is that typing an amount makes you register it. An automatic feed never makes you look.',
	},
	{
		label: 'Nothing to reconcile',
		note: 'No mis-categorised feed imports, no duplicate merchant rows, no waiting for a connection to come back after your bank changes something.',
	},
	{
		label: 'Import when it gets tedious',
		note: 'If a month of manual entry is too much, export a CSV from your bank and bring it in at once. The manual model does not mean typing everything.',
	},
];

/**
 * /how-it-works — STATIC. PageHero carries the single <h1>.
 *
 * Honesty: the manual-logging trade-off is stated as a cost first, not
 * spun as a feature. Overselling "no bank linking" as pure upside would
 * be the marketing move; naming the work is the honest one.
 */
export default function HowItWorksPage() {
	return (
		<>
			<PageHero
				heading='You log it. Nothing is guessed on your behalf.'
				lead='Budget Planner has no connection to your bank. You record what moves, and the app turns that into budgets, goals, reports and a graded score. Here is the whole loop.'
			/>

			<section className='st-section' aria-labelledby='steps-heading'>
				<div className='st-shell'>
					<div className='st-split'>
						<SectionHead id='steps-heading' heading='Four steps, then it runs.'>
							<p>
								Most people have something worth reading inside five minutes.
								A useful score takes a few weeks of logging, because a score
								built on two transactions would be a guess.
							</p>
						</SectionHead>

						<ol className='border-t' style={{ borderColor: 'var(--st-ink)' }}>
							{STEPS.map((step, i) => (
								<li
									key={step.title}
									className='grid gap-x-6 gap-y-2 border-b py-7 sm:grid-cols-[auto_minmax(0,1fr)]'
									style={{ borderColor: 'var(--st-rule)' }}
								>
									<span
										className='st-num text-[0.9375rem] font-semibold leading-none sm:pt-1'
										style={{ color: 'var(--st-signal)' }}
										aria-hidden='true'
									>
										{String(i + 1).padStart(2, '0')}
									</span>
									<div>
										<h3 className='st-h3'>{step.title}</h3>
										<p
											className='mt-2 text-[1rem] leading-relaxed'
											style={{ color: 'var(--st-body)', maxWidth: '58ch' }}
										>
											{step.body}
										</p>
										<p className='st-micro mt-3'>{step.time}</p>
									</div>
								</li>
							))}
						</ol>
					</div>
				</div>
			</section>

			<section className='st-section st-sunk' aria-labelledby='result-heading'>
				<div className='st-shell'>
					<div className='st-split'>
						<SectionHead id='result-heading' heading='What comes out the other end'>
							<p>
								A verdict, the evidence behind it, and one named next action.
								The demo account below is running a deficit this month, and the
								first line of the dashboard says so.
							</p>
						</SectionHead>

						<Shot
							slug='dashboard'
							alt='Budget Planner dashboard showing a net worth of ₱204,440, a Fair 67 out of 100 health score, and the Health Ledger grading Solvency, Liquidity, Savings, Debt Management and Cash Flow.'
							caption='One verdict, five graded pillars'
							surface='Dashboard'
						/>
					</div>
				</div>
			</section>

			<section className='st-section' aria-labelledby='manual-heading'>
				<div className='st-shell'>
					<div className='st-split'>
						<SectionHead id='manual-heading' heading='Why manual, honestly'>
							<p>
								It is more work than an app that syncs itself. That is the
								trade, stated plainly, so you can decide against it.
							</p>
						</SectionHead>

						<Ledger>
							{TRADEOFFS.map((row) => (
								<LedgerRow key={row.label} label={row.label} note={row.note} />
							))}
						</Ledger>
					</div>
				</div>
			</section>

			<StatementCTA heading='Start logging. No bank access required.' />
		</>
	);
}
