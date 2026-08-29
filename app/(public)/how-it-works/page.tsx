import type { Metadata } from 'next';
import { PageHero } from '@/components/modules/landing/instrument/PageHero';
import { Split } from '@/components/modules/landing/instrument/SectionHead';
import { Ledger, LedgerRow, Steps } from '@/components/modules/landing/instrument/Ledger';
import { Shot } from '@/components/modules/landing/instrument/Shot';
import { InstrumentCTA } from '@/components/modules/landing/instrument/InstrumentCTA';
import { APP_URL } from '@/lib/url';

export const metadata: Metadata = {
	title: 'How Budget Planner Works — Manual Tracking',
	description:
		'Set budgets, track every transaction, and reach your savings goals. Also send client invoices and log income — all in one app, no switching between tools.',
	alternates: { canonical: '/how-it-works' },
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
		meta: 'about 2 minutes',
	},
	{
		title: 'Create envelopes for what you actually spend on',
		body: 'A limit per category per month — rent, groceries, transport, whatever your life is made of. You can change them any month.',
		meta: 'about 2 minutes',
	},
	{
		title: 'Log transactions, or import them',
		body: 'Add each one as it happens, or download a CSV from your bank and run the import wizard. It flags likely duplicates before they land and the whole batch can be undone.',
		meta: 'ongoing, or one import',
	},
	{
		title: 'Read what it says',
		body: 'The dashboard grades five pillars, gives one score out of 100, and names the single thing most worth fixing. It updates the moment you log — no overnight sync.',
		meta: 'immediate',
	},
] as const;

const TRADEOFFS = [
	['You do the entering', 'That is the cost, and it is a real one. Aggregator apps fill themselves in; this one does not.'],
	['No banking credentials, ever', 'The app never asks for your online-banking login, because it has nothing to do with it. There is no third-party aggregator holding a token to your account.'],
	['You notice your own spending', 'The side effect people report from manual logging is that typing an amount makes you register it. An automatic feed never makes you look.'],
	['Nothing to reconcile', 'No mis-categorised feed imports, no duplicate merchant rows, no waiting for a connection to come back after your bank changes something.'],
	['Import when it gets tedious', 'If a month of manual entry is too much, export a CSV from your bank and bring it in at once. Manual does not mean typing everything.'],
] as const;

/**
 * /how-it-works — STATIC. PageHero carries the single <h1>.
 *
 * Honesty: the manual-logging trade-off is stated as a cost first, not
 * spun as pure upside. Naming the work is the honest move; selling
 * "no bank linking" as free benefit would not be.
 */
export default function HowItWorksPage() {
	return (
		<>
			<PageHero
				heading='You log it. Nothing is guessed on your behalf.'
				lead='Budget Planner has no connection to your bank. You record what moves, and the app turns that into budgets, goals, reports and a graded score. Here is the whole loop.'
			/>

			<Split
				heading='Four steps, then it runs'
				headingId='steps'
				intro='Most people have something worth reading inside five minutes. A useful score takes a few weeks of logging, because a score built on two transactions would be a guess.'
			>
				<Steps items={STEPS} />
			</Split>

			<Split
				heading='What comes out the other end'
				headingId='result'
				intro='A verdict, the evidence behind it, and one named next action. The demo account below is running a deficit this month, and the first line of the dashboard says so.'
				band
			>
				<Shot
					slug='dashboard'
					alt='Budget Planner dashboard showing a net worth of ₱204,440, a Fair 67 out of 100 health score, and the Health Ledger grading five pillars.'
					caption='One verdict, five graded pillars'
					surface='Dashboard'
				/>
			</Split>

			<Split
				heading='Why manual, honestly'
				headingId='manual'
				intro='It is more work than an app that syncs itself. That is the trade, stated plainly, so you can decide against it.'
			>
				<Ledger>
					{TRADEOFFS.map(([label, note]) => (
						<LedgerRow key={label} label={label} note={note} />
					))}
				</Ledger>
			</Split>

			<InstrumentCTA heading='Start logging. No bank access required.' />
		</>
	);
}
