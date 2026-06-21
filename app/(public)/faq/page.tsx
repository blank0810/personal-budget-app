import type { Metadata } from 'next';
import { FAQ } from '@/components/modules/landing/FAQ';
import { FAQ_ITEMS } from '@/components/modules/landing/faq-data';
import { FinalCTA } from '@/components/modules/landing/CTA';

export const metadata: Metadata = {
	title: 'FAQ',
	description:
		'Straight answers about pricing, your data, the AI advisor on the way, and how the app fits the way you manage money.',
	alternates: {
		canonical: '/faq',
	},
};

/**
 * FAQPage JSON-LD is generated 1:1 from the FAQ_ITEMS array exported by
 * FAQ.tsx — the single source of truth. The visible accordion and the
 * structured data are always in sync (no schema drift).
 *
 * Server-rendered so it appears in the initial HTML. No aggregateRating,
 * no fake reviews.
 */
const faqJsonLd = {
	'@context': 'https://schema.org',
	'@type': 'FAQPage',
	'@id': `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://budgetplanner.app'}/faq#faq`,
	mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
		'@type': 'Question',
		name: q,
		acceptedAnswer: {
			'@type': 'Answer',
			text: a,
		},
	})),
};

/**
 * /faq — STATIC. The FAQ lead section carries the page's single <h1>; the
 * FinalCTA below it uses <h2>.
 */
export default function FAQPage() {
	return (
		<>
			<script
				type='application/ld+json'
				dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
			/>
			<FAQ lead />
			<FinalCTA />
		</>
	);
}
