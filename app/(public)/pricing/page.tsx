import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/modules/landing/statement/PageHero';
import { SectionHead } from '@/components/modules/landing/statement/SectionHead';
import { Ledger, LedgerRow } from '@/components/modules/landing/statement/Ledger';
import { Faq } from '@/components/modules/landing/statement/Faq';
import { StatementCTA } from '@/components/modules/landing/statement/StatementCTA';
import { APP_URL } from '@/lib/url';

export const metadata: Metadata = {
	title: 'Free Budget Planner — No Bank Sync',
	description:
		'Free to start, no credit card. Everything you can see today is free while the product grows, and we stay honest about what is next.',
	alternates: {
		canonical: '/pricing',
	},
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
	{
		label: 'Accounts and transactions',
		note: 'Unlimited accounts and unlimited income, expense, transfer and payment records.',
	},
	{
		label: 'Envelope budgets',
		note: 'Unlimited categories, a limit per category per month, replicated forward when you want.',
	},
	{
		label: 'Savings goals',
		note: 'Including emergency-fund goals measured in months of runway.',
	},
	{
		label: 'Financial health score',
		note: 'Five weighted pillars, a letter grade on each, recalculated as you log.',
	},
	{
		label: 'CSV import',
		note: 'Column mapping, duplicate detection, and one-action batch undo.',
	},
	{
		label: 'Reports and PDF export',
		note: 'Category and account breakdowns, plus an optional monthly summary by email.',
	},
	{
		label: 'Client invoicing',
		note: 'Business identity, PDF invoices, email delivery, saved clients, payment details.',
	},
	{
		label: 'Export and deletion',
		note: 'Take your full transaction history out as CSV whenever you like, and delete the account when you are done.',
	},
];

/** Pricing-specific questions. Deliberately distinct from the /faq set so
 *  the two pages do not compete for the same query, and no FAQPage schema
 *  is emitted here — /faq owns that. */
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
 * forever" — a paid tier may exist once the AI advisor ships, and this
 * page must not promise otherwise on the product's behalf. Pro carries
 * no price and no trial, because Pro does not exist.
 */
export default function PricingPage() {
	return (
		<>
			<PageHero
				heading='It costs nothing, and we will tell you if that changes.'
				lead='Everything that exists today is free to use. No credit card, no trial clock, no feature held back to sell you later.'
				aside={
					<div>
						<span className='st-micro'>Today</span>
						<div className='mt-3 flex items-baseline gap-2'>
							<span className='st-score'>&#8369;0</span>
							<span
								className='st-num text-[1rem]'
								style={{ color: 'var(--st-muted)' }}
							>
								/month
							</span>
						</div>
						<p
							className='mt-4 text-[0.9375rem] leading-relaxed'
							style={{ color: 'var(--st-body)' }}
						>
							For everything on this page. The only thing that may ever cost
							money is the AI advisor, which is not built.
						</p>
						<Link
							href='/register'
							className='st-btn st-btn--signal st-btn--lg mt-6 w-full'
						>
							Create your free account
						</Link>
					</div>
				}
			/>

			<section className='st-section' aria-labelledby='included-heading'>
				<div className='st-shell'>
					<div className='st-split'>
						<SectionHead id='included-heading' heading='What you get for that' />
						<Ledger>
							{INCLUDED.map((row) => (
								<LedgerRow key={row.label} label={row.label} note={row.note} />
							))}
						</Ledger>
					</div>
				</div>
			</section>

			<section className='st-section st-sunk' aria-labelledby='later-heading'>
				<div className='st-shell'>
					<div className='st-split'>
						<SectionHead id='later-heading' heading='What might cost money later' />
						<div>
							<span className='st-marker'>Not built · no price</span>
							<p className='st-body-text mt-5' style={{ color: 'var(--st-body)' }}>
								The AI advisor is the one feature with a real per-use cost
								behind it. It does not exist yet, so there is no plan to sign
								up for, no waiting list to join, and no price to quote. When
								there is, it will appear here and on the changelog first.
							</p>
							<p
								className='mt-4 text-[0.9375rem] leading-relaxed'
								style={{ color: 'var(--st-muted)', maxWidth: '58ch' }}
							>
								This section exists so that the free tier above is not
								quietly load-bearing on a promise nobody made.
							</p>
						</div>
					</div>
				</div>
			</section>

			<section className='st-section' aria-labelledby='pricing-faq-heading'>
				<div className='st-shell'>
					<div className='st-split'>
						<SectionHead id='pricing-faq-heading' heading='Reasonable suspicions' />
						<Faq items={PRICING_FAQ} />
					</div>
				</div>
			</section>

			<StatementCTA
				heading='Free to start. Nothing to cancel.'
				note='No credit card, no bank connection, no ads, and an export button if you want your data back out.'
			/>
		</>
	);
}
