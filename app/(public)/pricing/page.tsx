import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/modules/landing/instrument/PageHero';
import { Split } from '@/components/modules/landing/instrument/SectionHead';
import { Ledger, LedgerRow } from '@/components/modules/landing/instrument/Ledger';
import { Faq } from '@/components/modules/landing/instrument/Faq';
import { InstrumentCTA } from '@/components/modules/landing/instrument/InstrumentCTA';
import { APP_URL } from '@/lib/url';

export const metadata: Metadata = {
	title: 'Free Budget Planner — No Bank Sync',
	description:
		'Free to start, no credit card. Everything you can see today is free while the product grows, and we stay honest about what is next.',
	alternates: { canonical: '/pricing' },
	openGraph: {
		title: 'Free Budget Planner — No Bank Sync · Budget Planner',
		description:
			'Free to start, no credit card required. Manual budgeting, no bank connection. We stay honest about what comes next.',
		url: `${APP_URL}/pricing`,
		type: 'website',
		siteName: 'Budget Planner',
		locale: 'en_US',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Free Budget Planner — No Bank Sync · Budget Planner',
		description:
			'Free to start, no credit card required. Manual budgeting, no bank connection.',
	},
};

const INCLUDED = [
	['Accounts and transactions', 'Unlimited accounts and unlimited income, expense, transfer and payment records.'],
	['Envelope budgets', 'Unlimited categories, a limit per category per month, replicated forward when you want.'],
	['Savings goals', 'Including emergency-fund goals measured in months of runway.'],
	['Financial health score', 'Five weighted pillars, a letter grade on each, recalculated as you log.'],
	['CSV import', 'Column mapping, duplicate detection, and one-action batch undo.'],
	['Reports and PDF export', 'Category and account breakdowns, plus an optional monthly summary by email.'],
	['Client invoicing', 'Business identity, PDF invoices, email delivery, saved clients, payment details.'],
	['Export and deletion', 'Take your full transaction history out as CSV whenever you like, and delete the account when you are done.'],
] as const;

/** Pricing-specific questions, deliberately distinct from the /faq set so
 *  the two pages do not compete for the same query. No FAQPage schema is
 *  emitted here — /faq owns that. */
const PRICING_FAQ = [
	{
		q: 'What does “free to start” actually mean?',
		a: 'Every feature listed on this page is free right now, with no credit card, no trial period, and no usage cap. It is not a limited tier of a paid product; it is the product.',
	},
	{
		q: 'Will you start charging?',
		a: 'Possibly, for the AI advisor, because running a language model costs money per question. Nothing that is free today is planned to move behind a paywall, and any change would be announced on the public changelog before it took effect.',
	},
	{
		q: 'Why is there no price for Pro?',
		a: 'Because there is no Pro. Advertising a price for something that does not exist yet, or a trial for a tier nobody can use, would be inventing a product. When there is something to charge for, there will be a price here.',
	},
	{
		q: 'How do you make money right now?',
		a: 'We do not. It is built in the open by one developer, and the running costs are small because there is no bank-aggregation vendor to pay. There are no ads and your data is not sold.',
	},
];

/**
 * /pricing — STATIC. PageHero carries the single <h1>.
 *
 * Honesty (PRODUCT.md rule 6): "free to start", never a blanket "free
 * forever" — a paid tier may exist once the AI advisor ships. Pro
 * carries no price and no trial, because Pro does not exist.
 */
export default function PricingPage() {
	return (
		<>
			<PageHero
				heading='It costs nothing, and we will tell you if that changes.'
				lead='Everything that exists today is free to use. No credit card, no trial clock, no feature held back to sell you later.'
				actions={false}
				aside={
					<div className='gauge-panel'>
						<span className='micro'>Today</span>
						<div
							className='gauge-read'
							style={{ justifyContent: 'flex-start', marginTop: '.75rem' }}
						>
							<b>₱0</b>
							<span>/month</span>
						</div>
						<p className='fine' style={{ marginTop: '1rem' }}>
							For everything on this page. The only thing that may ever cost
							money is the AI advisor, which is not built.
						</p>
						<Link
							href='/register'
							className='btn btn--orange btn--lg'
							style={{ width: '100%', marginTop: '1.25rem' }}
						>
							Create your free account
						</Link>
					</div>
				}
			/>

			<Split heading='What you get for that' headingId='included'>
				<Ledger>
					{INCLUDED.map(([label, note]) => (
						<LedgerRow key={label} label={label} note={note} />
					))}
				</Ledger>
			</Split>

			<Split heading='What might cost money later' headingId='later' band>
				<span className='marker'>Not built · no price</span>
				<div className='prose' style={{ marginTop: '1.25rem' }}>
					<p>
						The AI advisor is the one feature with a real per-use cost behind it.
						It does not exist yet, so there is no plan to sign up for, no waiting
						list to join, and no price to quote. When there is, it will appear
						here and on the changelog first.
					</p>
				</div>
				<p className='fine' style={{ marginTop: '1rem' }}>
					This section exists so that the free tier above is not quietly
					load-bearing on a promise nobody made.
				</p>
			</Split>

			<Split heading='Reasonable suspicions' headingId='pricing-faq'>
				<Faq items={PRICING_FAQ} />
			</Split>

			<InstrumentCTA
				heading='Free to start. Nothing to cancel.'
				note='No credit card, no bank connection, no ads, and an export button if you want your data back out.'
			/>
		</>
	);
}
