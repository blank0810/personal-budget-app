import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/modules/landing/statement/PageHero';
import { SectionHead } from '@/components/modules/landing/statement/SectionHead';
import { Faq } from '@/components/modules/landing/statement/Faq';
import { StatementCTA } from '@/components/modules/landing/statement/StatementCTA';
import { FAQ_GROUPS } from '@/components/modules/landing/statement/faq-data';
import { absoluteUrl } from '@/lib/url';

export const metadata: Metadata = {
	title: 'Budgeting App FAQ',
	description:
		'Straight answers about pricing, your data, the AI advisor on the way, and how the app fits the way you manage money.',
	alternates: {
		canonical: '/faq',
	},
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
 * Single source of truth: any edit to faq-data.ts is automatically reflected
 * here. No manual sync required. Schema↔content parity is guaranteed, and
 * because the answers render inside <details> they are in the DOM whether
 * the disclosure is open or closed.
 *
 * Honesty enforced:
 * - No aggregateRating / review.
 * - AI Advisor answer is future-tense only ("not yet … in active development").
 * - All Q&A text matches the visible list 1:1.
 */
const FAQ_JSON_LD = {
	'@context': 'https://schema.org',
	'@type': 'FAQPage',
	mainEntity: FAQ_GROUPS.flatMap((group) =>
		group.items.map((item) => ({
			'@type': 'Question',
			name: item.q,
			acceptedAnswer: {
				'@type': 'Answer',
				text: item.a,
			},
		})),
	),
};

/**
 * /faq — STATIC. PageHero carries the single <h1>; each group heading
 * is an <h2>, so heading order stays valid.
 */
export default function FAQPage() {
	return (
		<>
			{/* FAQPage structured data — server-side, in initial HTML */}
			<script
				type='application/ld+json'
				dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
			/>

			<PageHero
				heading='Every question, answered without the gloss.'
				lead='What the app does, what it costs, what it will not do, and who it is not for. If an answer would be more flattering when vague, it is written specifically instead.'
			/>

			{FAQ_GROUPS.map((group, i) => (
				<section
					key={group.label}
					className={i % 2 === 1 ? 'st-section st-sunk' : 'st-section'}
					aria-labelledby={`faq-${i}`}
				>
					<div className='st-shell'>
						<div className='st-split'>
							<SectionHead id={`faq-${i}`} heading={group.label} />
							<Faq items={group.items} />
						</div>
					</div>
				</section>
			))}

			<section className='st-section' aria-labelledby='more-heading'>
				<div className='st-shell'>
					<div className='st-split'>
						<SectionHead id='more-heading' heading='Something not covered?' />
						<div>
							<p className='st-body-text' style={{ color: 'var(--st-body)' }}>
								Development happens in public. The changelog is where shipped
								work is recorded, and the feature board is where you can ask for
								something and vote on what other people asked for.
							</p>
							<div className='mt-7 flex flex-wrap gap-3'>
								<Link href='/changelog' className='st-btn st-btn--signal'>
									Read the changelog
								</Link>
								<Link href='/register' className='st-btn st-btn--ghost'>
									Try it free
								</Link>
							</div>
						</div>
					</div>
				</div>
			</section>

			<StatementCTA heading='Find out where you actually stand.' />
		</>
	);
}
