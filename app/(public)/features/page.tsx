import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/modules/landing/statement/PageHero';
import { SectionHead } from '@/components/modules/landing/statement/SectionHead';
import { Ledger, LedgerRow } from '@/components/modules/landing/statement/Ledger';
import { Shot } from '@/components/modules/landing/statement/Shot';
import { StatementCTA } from '@/components/modules/landing/statement/StatementCTA';
import { HEALTH_PILLARS } from '@/lib/financial-health-copy';
import { APP_URL } from '@/lib/url';

export const metadata: Metadata = {
	title: 'Budgeting App Features',
	description:
		'Track every transaction, set budgets that show safe-to-spend, reach savings goals, and send polished invoices — one free app for managing your money.',
	alternates: {
		canonical: '/features',
	},
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
	{
		label: 'Unified transactions',
		note: 'Income, expenses, transfers between your own accounts, and payments toward a liability. One table, one filter set, one place to look.',
	},
	{
		label: 'Accounts and ledgers',
		note: 'Cash, bank, savings, credit and loan accounts side by side, each with its own running ledger and an opening balance you can audit back to.',
	},
	{
		label: 'Bulk actions',
		note: 'Select a run of rows and recategorise, move or delete them together instead of one at a time.',
	},
	{
		label: 'CSV import with undo',
		note: 'Map your bank’s columns once. Likely duplicates are flagged before they land, and the whole batch rolls back in a single action if it goes wrong.',
	},
];

const PLANNING = [
	{
		label: 'Envelope budgets',
		note: 'A limit per category per month. Logged expenses move the envelope, so "what is left" is read from your ledger rather than estimated.',
	},
	{
		label: 'Savings goals',
		note: 'Link a goal to the account that actually holds the money. Progress comes from the balance, so it cannot drift from reality.',
	},
	{
		label: 'Emergency fund tracking',
		note: 'A goal type that measures months of runway rather than a flat target, with your own thresholds for what counts as funded.',
	},
	{
		label: 'Reports and monthly digest',
		note: 'Category and account breakdowns, PDF export, and an optional monthly summary by email. One click to unsubscribe.',
	},
];

/**
 * /features — STATIC. PageHero carries the single <h1>; every section
 * below uses <h2>.
 *
 * The five pillars are imported from lib/financial-health-copy — the
 * same module the authenticated dashboard reads — so this page cannot
 * drift from the product's actual scoring model.
 */
export default function FeaturesPage() {
	return (
		<>
			<PageHero
				heading='Everything it does, stated plainly.'
				lead='No tiered comparison table and no asterisks. This is the whole product as it exists today, plus one honest note about the part that does not exist yet.'
			/>

			<section className='st-section' aria-labelledby='score-heading'>
				<div className='st-shell'>
					<div className='st-split'>
						<SectionHead
							id='score-heading'
							heading='The financial health score'
						>
							<p>
								Five pillars, weighted, combined into one number out of 100 with
								a letter grade on each. Computed only from what you logged —
								nothing is inferred from a bank feed.
							</p>
						</SectionHead>

						<div>
							<Ledger>
								{HEALTH_PILLARS.map((pillar) => (
									<LedgerRow
										key={pillar.name}
										label={pillar.name}
										note={pillar.question}
										reading={
											<span className='st-num'>
												{Math.round(pillar.weight * 100)}%
											</span>
										}
									/>
								))}
							</Ledger>

							<p
								className='mt-6 text-[0.9375rem] leading-relaxed'
								style={{ color: 'var(--st-muted)', maxWidth: '58ch' }}
							>
								The score sharpens as you log more. With thin data it says so
								rather than guessing.
							</p>
						</div>
					</div>
				</div>
			</section>

			<section className='st-section st-sunk' aria-labelledby='tracking-heading'>
				<div className='st-shell'>
					<div className='st-split'>
						<SectionHead id='tracking-heading' heading='Getting money in' />
						<Ledger>
							{TRACKING.map((row) => (
								<LedgerRow key={row.label} label={row.label} note={row.note} />
							))}
						</Ledger>
					</div>

					<div className='st-split mt-12'>
						<div />
						<Shot
							slug='transactions'
							alt='The unified transactions table listing expenses with amount, account, category and date, filtered by type.'
							caption='Every type in one table'
							surface='Transactions'
						/>
					</div>
				</div>
			</section>

			<section className='st-section' aria-labelledby='planning-heading'>
				<div className='st-shell'>
					<div className='st-split'>
						<SectionHead id='planning-heading' heading='Deciding where it goes' />
						<Ledger>
							{PLANNING.map((row) => (
								<LedgerRow key={row.label} label={row.label} note={row.note} />
							))}
						</Ledger>
					</div>

					<div className='st-split mt-12'>
						<div />
						<Shot
							slug='budgets'
							alt='Envelope budgets for August with Rent fully spent, Dining Out ₱560 over, and Transport ₱3,550 over their limits.'
							caption='Including the envelopes you blew'
							surface='Budgets'
						/>
					</div>
				</div>
			</section>

			<section className='st-section st-sunk' aria-labelledby='billing-heading'>
				<div className='st-shell'>
					<div className='st-split'>
						<SectionHead id='billing-heading' heading='Billing clients'>
							<p>
								<Link href='/invoicing' className='st-link'>
									More on invoicing
								</Link>
							</p>
						</SectionHead>

						<div>
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

							<p
								className='mt-6 text-[0.9375rem] leading-relaxed'
								style={{ color: 'var(--st-muted)', maxWidth: '58ch' }}
							>
								Invoices and transactions sit in the same app but are not wired
								together. When a client pays, you log the income yourself.
							</p>
						</div>
					</div>
				</div>
			</section>

			<section className='st-section' aria-labelledby='not-yet-heading'>
				<div className='st-shell'>
					<div className='st-split'>
						<SectionHead id='not-yet-heading' heading='Not built yet' />
						<div>
							<span className='st-marker'>In development</span>
							<p className='st-body-text mt-5' style={{ color: 'var(--st-body)' }}>
								The AI advisor is the next major feature and is not available.
								A non-interactive preview sits on the dashboard so you can see
								the shape of it. It will be announced on the changelog when it
								works.
							</p>
							<p className='mt-6'>
								<Link href='/ai-advisor' className='st-link'>
									What it will do
								</Link>
							</p>
						</div>
					</div>
				</div>
			</section>

			<StatementCTA heading='Everything above, at no cost.' />
		</>
	);
}
