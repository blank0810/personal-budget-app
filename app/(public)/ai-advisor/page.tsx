import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/modules/landing/statement/PageHero';
import { SectionHead } from '@/components/modules/landing/statement/SectionHead';
import { Ledger, LedgerRow } from '@/components/modules/landing/statement/Ledger';
import { StatementCTA } from '@/components/modules/landing/statement/StatementCTA';
import { APP_URL } from '@/lib/url';

/**
 * /ai-advisor — marketing page for the planned AI Budget Advisor.
 *
 * HONESTY (hard gate, PRODUCT.md rule 3): the AI advisor is NOT live.
 * Metadata, JSON-LD, and every line of body copy is future-tense or
 * "in development". No fabricated metrics, reviews, waiting list, or
 * present-tense capability claims. The page opens by saying it does not
 * exist, before it says anything about what it will do.
 */
export const metadata: Metadata = {
	title: 'AI Budget Advisor — Coming Soon',
	description:
		'An AI assistant being built to read your actual transaction data and answer the money questions you ask. In development — not yet available.',
	alternates: {
		canonical: '/ai-advisor',
	},
	openGraph: {
		title: 'AI Budget Advisor — Coming Soon · Budget Planner',
		description:
			'An AI assistant that will read your actual transaction data and answer the money questions you ask. In active development — not yet available.',
		type: 'website',
		url: `${APP_URL}/ai-advisor`,
		siteName: 'Budget Planner',
		locale: 'en_US',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'AI Budget Advisor — Coming Soon · Budget Planner',
		description:
			'An AI advisor that will read your numbers and answer the money questions you actually ask. In development.',
	},
};

/**
 * JSON-LD: WebPage only — future-tense description matching the page copy.
 * The sitewide layout already emits WebApplication + Organization.
 */
const pageJsonLd = {
	'@context': 'https://schema.org',
	'@type': 'WebPage',
	'@id': `${APP_URL}/ai-advisor`,
	name: 'AI Budget Advisor — Coming Soon · Budget Planner',
	description:
		'An AI assistant being built to read your actual transaction data and answer the money questions you ask. Not yet available.',
	url: `${APP_URL}/ai-advisor`,
	isPartOf: { '@id': `${APP_URL}/#app` },
};

const INTENT = [
	{
		label: 'Answer from your own numbers',
		note: 'Questions about your actual ledger — where a month went, what changed, whether something is affordable — rather than generic advice you could get anywhere.',
	},
	{
		label: 'Explain the score',
		note: 'The dashboard already names your weakest pillar. The advisor should be able to say what specifically to do about it, in the order that matters.',
	},
	{
		label: 'Notice things you did not ask about',
		note: 'Spending that quietly moved, a subscription that renewed at a new price, a category that has crept for three months.',
	},
	{
		label: 'Stay inside your data',
		note: 'Grounded in what you logged. An advisor that invents a number is worse than no advisor, and the whole product is built around not guessing.',
	},
];

export default function AIAdvisorPage() {
	return (
		<>
			<script
				type='application/ld+json'
				dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
			/>

			<PageHero
				heading='This one does not exist yet.'
				lead='An AI advisor is the next major feature and it is in development. It cannot answer anything today. This page describes what it is meant to become, and nothing on it is a working capability.'
				aside={
					<div>
						<span className='st-marker'>Status · in development</span>
						<Ledger className='mt-5'>
							<LedgerRow label='Available today' reading='No' />
							<LedgerRow label='Waiting list' reading='None' />
							<LedgerRow label='Price' reading='Not set' />
							<LedgerRow label='Ship date' reading='Not announced' />
						</Ledger>
						<p
							className='mt-5 text-[0.9375rem] leading-relaxed'
							style={{ color: 'var(--st-body)' }}
						>
							There is nothing to sign up for. It will be announced on the{' '}
							<Link href='/changelog' className='st-link'>
								changelog
							</Link>{' '}
							when it works.
						</p>
					</div>
				}
			/>

			<section className='st-section' aria-labelledby='intent-heading'>
				<div className='st-shell'>
					<div className='st-split'>
						<SectionHead id='intent-heading' heading='What it is meant to do'>
							<p>
								Written as intent, because that is all it is. None of the
								following is implemented.
							</p>
						</SectionHead>

						<Ledger>
							{INTENT.map((row) => (
								<LedgerRow key={row.label} label={row.label} note={row.note} />
							))}
						</Ledger>
					</div>
				</div>
			</section>

			<section className='st-section st-sunk' aria-labelledby='preview-heading'>
				<div className='st-shell'>
					<div className='st-split'>
						<SectionHead id='preview-heading' heading='The thing on your dashboard' />
						<div>
							<p className='st-body-text' style={{ color: 'var(--st-body)' }}>
								Signed-in users see an advisor panel on the dashboard. It is a
								non-interactive mock — a looping script that shows the intended
								shape of the conversation. You cannot type into it and it is not
								reading your data. It is labelled as a preview in the app for the
								same reason it is labelled here.
							</p>
							<p
								className='mt-4 text-[0.9375rem] leading-relaxed'
								style={{ color: 'var(--st-muted)', maxWidth: '58ch' }}
							>
								It would be easy to leave that ambiguous and let people assume
								the feature exists. Saying it outright costs a little excitement
								and buys the right to be believed about everything else on this
								site.
							</p>
						</div>
					</div>
				</div>
			</section>

			<section className='st-section' aria-labelledby='meanwhile-heading'>
				<div className='st-shell'>
					<div className='st-split'>
						<SectionHead id='meanwhile-heading' heading='What works now' />
						<div>
							<p className='st-body-text' style={{ color: 'var(--st-body)' }}>
								The scoring the advisor would eventually talk about is already
								running: five weighted pillars, a grade on each, a named weakest
								link, and a concrete next action. No language model required.
							</p>
							<p className='mt-6'>
								<Link href='/features' className='st-link'>
									What ships today
								</Link>
							</p>
						</div>
					</div>
				</div>
			</section>

			<StatementCTA heading='Start with the part that already works.' />
		</>
	);
}
