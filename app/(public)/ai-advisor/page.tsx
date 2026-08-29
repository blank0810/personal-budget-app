import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/modules/landing/instrument/PageHero';
import { Split } from '@/components/modules/landing/instrument/SectionHead';
import { Ledger, LedgerRow } from '@/components/modules/landing/instrument/Ledger';
import { InstrumentCTA } from '@/components/modules/landing/instrument/InstrumentCTA';
import { APP_URL } from '@/lib/url';

/**
 * /ai-advisor — the planned AI Budget Advisor.
 *
 * HONESTY (hard gate, PRODUCT.md rule 3): the advisor is NOT live.
 * Metadata, JSON-LD and every line of copy is future-tense or "in
 * development". No fabricated metrics, reviews, waiting list, or
 * present-tense capability claims. The page opens by saying it does
 * not exist, before it says anything about what it will do.
 */
export const metadata: Metadata = {
	title: 'AI Budget Advisor — Coming Soon',
	description:
		'An AI assistant being built to read your actual transaction data and answer the money questions you ask. In development — not yet available.',
	alternates: { canonical: '/ai-advisor' },
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
	['Answer from your own numbers', 'Questions about your actual ledger — where a month went, what changed, whether something is affordable — rather than generic advice you could get anywhere.'],
	['Explain the score', 'The dashboard already names your weakest pillar. The advisor should be able to say what specifically to do about it, in the order that matters.'],
	['Notice things you did not ask about', 'Spending that quietly moved, a subscription that renewed at a new price, a category that has crept for three months.'],
	['Stay inside your data', 'Grounded in what you logged. An advisor that invents a number is worse than no advisor, and the whole product is built around not guessing.'],
] as const;

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
				actions={false}
				aside={
					<div className='gauge-panel'>
						<span className='marker'>Status · in development</span>
						<Ledger className='' >
							<LedgerRow label='Available today' reading='No' />
							<LedgerRow label='Waiting list' reading='None' />
							<LedgerRow label='Price' reading='Not set' />
							<LedgerRow label='Ship date' reading='Not announced' />
						</Ledger>
						<p className='fine' style={{ marginTop: '1rem' }}>
							There is nothing to sign up for. It will be announced on the{' '}
							<Link href='/changelog' className='link'>
								changelog
							</Link>{' '}
							when it works.
						</p>
					</div>
				}
			/>

			<Split
				heading='What it is meant to do'
				headingId='intent'
				intro='Written as intent, because that is all it is. None of the following is implemented.'
			>
				<Ledger>
					{INTENT.map(([label, note]) => (
						<LedgerRow key={label} label={label} note={note} />
					))}
				</Ledger>
			</Split>

			<Split heading='The thing on your dashboard' headingId='preview' band>
				<div className='prose'>
					<p>
						Signed-in users see an advisor panel on the dashboard. It is a
						non-interactive mock — a looping script that shows the intended shape
						of the conversation. You cannot type into it and it is not reading
						your data. It is labelled as a preview in the app for the same reason
						it is labelled here.
					</p>
				</div>
				<p className='fine' style={{ marginTop: '1rem' }}>
					It would be easy to leave that ambiguous and let people assume the
					feature exists. Saying it outright costs a little excitement and buys
					the right to be believed about everything else on this site.
				</p>
			</Split>

			<Split heading='What works now' headingId='meanwhile'>
				<div className='prose'>
					<p>
						The scoring the advisor would eventually talk about is already
						running: five weighted pillars, a grade on each, a named weakest link,
						and a concrete next action. No language model required.
					</p>
				</div>
				<p style={{ marginTop: '1.5rem' }}>
					<Link href='/features' className='link'>
						What ships today
					</Link>
				</p>
			</Split>

			<InstrumentCTA heading='Start with the part that already works.' />
		</>
	);
}
