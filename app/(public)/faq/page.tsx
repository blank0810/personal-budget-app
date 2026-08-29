import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/modules/landing/instrument/PageHero';
import { Split } from '@/components/modules/landing/instrument/SectionHead';
import { Faq } from '@/components/modules/landing/instrument/Faq';
import { InstrumentCTA } from '@/components/modules/landing/instrument/InstrumentCTA';
import { FAQ_GROUPS } from '@/components/modules/landing/instrument/faq-data';
import { absoluteUrl } from '@/lib/url';

export const metadata: Metadata = {
	title: 'Budgeting App FAQ',
	description:
		'Straight answers about pricing, your data, the AI advisor on the way, and how the app fits the way you manage money.',
	alternates: { canonical: '/faq' },
	openGraph: {
		title: 'Budgeting App FAQ',
		description:
			'Straight answers about pricing, your data, the AI advisor on the way, and how the app fits the way you manage money.',
		url: absoluteUrl('/faq'),
		siteName: 'Budget Planner',
		// og:image comes from the route-level opengraph-image.tsx (file convention).
	},
};

/**
 * FAQPage JSON-LD — generated from the shared faq-data module.
 *
 * Single source of truth: any edit to faq-data.ts is reflected here, so
 * schema↔content parity is guaranteed. Because the answers render
 * inside <details>, they are in the DOM whether open or closed.
 *
 * Honesty enforced:
 * - No aggregateRating / review.
 * - AI Advisor answer is future-tense only.
 * - All Q&A text matches the visible list 1:1.
 */
const FAQ_JSON_LD = {
	'@context': 'https://schema.org',
	'@type': 'FAQPage',
	mainEntity: FAQ_GROUPS.flatMap((group) =>
		group.items.map((item) => ({
			'@type': 'Question',
			name: item.q,
			acceptedAnswer: { '@type': 'Answer', text: item.a },
		})),
	),
};

/** /faq — STATIC. PageHero carries the single <h1>; each group is an <h2>. */
export default function FAQPage() {
	return (
		<>
			<script
				type='application/ld+json'
				dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
			/>

			<PageHero
				heading='Every question, answered without the gloss.'
				lead='What the app does, what it costs, what it will not do, and who it is not for. If an answer would be more flattering when vague, it is written specifically instead.'
				actions={false}
			/>

			{FAQ_GROUPS.map((group, i) => (
				<Split
					key={group.label}
					heading={group.label}
					headingId={`faq-${i}`}
					band={i % 2 === 1}
				>
					<Faq items={group.items} />
				</Split>
			))}

			<Split heading='Something not covered?' headingId='more'>
				<div className='prose'>
					<p>
						Development happens in public. The changelog is where shipped work is
						recorded, and the feature board is where you can ask for something and
						vote on what other people asked for.
					</p>
				</div>
				<div className='btn-row'>
					<Link href='/changelog' className='btn btn--orange'>
						Read the changelog
					</Link>
					<Link href='/register' className='btn btn--outline'>
						Try it free
					</Link>
				</div>
			</Split>

			<InstrumentCTA heading='Find out where you actually stand.' />
		</>
	);
}
