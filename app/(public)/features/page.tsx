import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/modules/landing/instrument/PageHero';
import { Split } from '@/components/modules/landing/instrument/SectionHead';
import { Ledger, LedgerRow } from '@/components/modules/landing/instrument/Ledger';
import { Shot } from '@/components/modules/landing/instrument/Shot';
import { InstrumentCTA } from '@/components/modules/landing/instrument/InstrumentCTA';
import { HEALTH_PILLARS } from '@/lib/financial-health-copy';
import { APP_URL } from '@/lib/url';

export const metadata: Metadata = {
	title: 'Budgeting App Features',
	description:
		'Track every transaction, set budgets that show safe-to-spend, reach savings goals, and send polished invoices — one free app for managing your money.',
	alternates: { canonical: '/features' },
	openGraph: {
		title: 'Budgeting App Features · Budget Planner',
		description:
			'Track every transaction, set budgets that show safe-to-spend, reach savings goals, and send polished invoices — one free app for managing your money.',
		url: `${APP_URL}/features`,
		type: 'website',
		siteName: 'Budget Planner',
		locale: 'en_US',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Budgeting App Features · Budget Planner',
		description:
			'Track every transaction, set budgets that show safe-to-spend, reach savings goals, and send polished invoices — one free app for managing your money.',
	},
};

const TRACKING = [
	['Unified transactions', 'Income, expenses, transfers between your own accounts, and payments toward a liability — one table, one filter set, one place to look.'],
	['Accounts and ledgers', 'Cash, bank, savings, credit and loan accounts side by side, each with its own running ledger and an opening balance you can audit back to.'],
	['Bulk actions', 'Select a run of rows and recategorise, move or delete them together instead of one at a time.'],
	['CSV import with undo', 'Map your bank’s columns once. Likely duplicates are flagged before they land, and the whole batch rolls back in a single action.'],
] as const;

const PLANNING = [
	['Envelope budgets', 'A limit per category per month. Logged expenses move the envelope, so “what is left” is read from your ledger rather than estimated.'],
	['Savings goals', 'Link a goal to the account that actually holds the money. Progress comes from the balance, so it cannot drift from reality.'],
	['Emergency fund tracking', 'A goal type measured in months of runway rather than a flat target, with your own thresholds for what counts as funded.'],
	['Reports and monthly digest', 'Category and account breakdowns, PDF export, and an optional monthly summary by email. One click to unsubscribe.'],
] as const;

/**
 * /features — STATIC. PageHero carries the single <h1>.
 *
 * The five pillars are imported from lib/financial-health-copy, the
 * same module the authenticated dashboard reads, so this page cannot
 * drift from the product's actual scoring model.
 */
export default function FeaturesPage() {
	return (
		<>
			<PageHero
				heading='Everything it measures, stated plainly.'
				lead='No tiered comparison table and no asterisks. This is the whole product as it exists today, plus one honest note about the part that does not exist yet.'
			/>

			<Split
				heading='The score'
				headingId='score'
				intro='Five pillars, weighted, combined into one number out of 100 with a letter grade on each. Computed only from what you logged.'
			>
				<Ledger>
					{HEALTH_PILLARS.map((pillar) => (
						<LedgerRow
							key={pillar.name}
							label={pillar.name}
							note={pillar.question}
							reading={`${Math.round(pillar.weight * 100)}%`}
						/>
					))}
				</Ledger>
				<p className='fine' style={{ marginTop: '1.5rem' }}>
					The score sharpens as you log more. With thin data it says so rather
					than guessing.
				</p>
			</Split>

			<Split heading='Getting money in' headingId='tracking' band>
				<Ledger>
					{TRACKING.map(([label, note]) => (
						<LedgerRow key={label} label={label} note={note} />
					))}
				</Ledger>
				<div style={{ marginTop: '2rem' }}>
					<Shot
						slug='transactions'
						alt='The unified transactions table listing expenses with amount, account, category and date.'
						caption='Every type in one table'
						surface='Transactions'
					/>
				</div>
			</Split>

			<Split heading='Deciding where it goes' headingId='planning'>
				<Ledger>
					{PLANNING.map(([label, note]) => (
						<LedgerRow key={label} label={label} note={note} />
					))}
				</Ledger>
				<div style={{ marginTop: '2rem' }}>
					<Shot
						slug='budgets'
						alt='Envelope budgets for August with Rent fully spent, Dining Out ₱560 over, and Transport ₱3,550 over their limits.'
						caption='Including the ones you blew'
						surface='Budgets'
					/>
				</div>
			</Split>

			<Split
				heading='Billing clients'
				headingId='billing'
				intro={
					<>
						All shipped.{' '}
						<Link href='/invoicing' className='link'>
							More on invoicing
						</Link>
						.
					</>
				}
				band
			>
				<Ledger>
					<LedgerRow
						label='Invoices'
						note='Business identity, line items, PDF export, and email delivery from inside the app.'
					/>
					<LedgerRow
						label='Clients'
						note='A saved client list so you are not retyping the same billing details every month.'
					/>
					<LedgerRow
						label='Payment details'
						note='Payout methods and a QR code attached to the invoice so a client can pay without asking how.'
					/>
				</Ledger>
				<p className='fine' style={{ marginTop: '1.5rem' }}>
					Invoices and transactions sit in the same app but are not wired
					together. When a client pays, you log the income yourself.
				</p>
			</Split>

			<Split heading='Not built yet' headingId='not-yet'>
				<span className='marker'>In development</span>
				<div className='prose' style={{ marginTop: '1.25rem' }}>
					<p>
						The AI advisor is the next major feature and is not available. A
						non-interactive preview sits on the dashboard so you can see the shape
						of it. It will be announced on the changelog when it works.
					</p>
				</div>
				<p style={{ marginTop: '1.5rem' }}>
					<Link href='/ai-advisor' className='link'>
						What it will do
					</Link>
				</p>
			</Split>

			<InstrumentCTA heading='Everything above, at no cost.' />
		</>
	);
}
