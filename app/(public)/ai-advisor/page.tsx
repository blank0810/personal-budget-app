import type { Metadata } from 'next';
import { AIAdvisorHero } from '@/components/modules/landing/lagoon/ai-advisor/AIAdvisorHero';
import { AIAdvisorVision } from '@/components/modules/landing/lagoon/ai-advisor/AIAdvisorVision';
import { AIAdvisorPreview } from '@/components/modules/landing/lagoon/ai-advisor/AIAdvisorPreview';
import { LagoonCTA } from '@/components/modules/landing/lagoon/LagoonCTA';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://budgetplanner.app';

/**
 * /ai-advisor — marketing page for the planned AI Budget Advisor.
 *
 * HONESTY (hard gate): the AI advisor is NOT live. Metadata, JSON-LD, and
 * every line of body copy is future-tense / "in development". No fabricated
 * metrics, reviews, waitlist, or present-tense AI capability claims.
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
 * JSON-LD: WebPage only — future-tense description matches page copy.
 * Sitewide layout already emits WebApplication + Organization.
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

export default function AIAdvisorPage() {
	return (
		<>
			<script
				type='application/ld+json'
				dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
			/>

			{/* Section 1: Hero — carries the page's single h1, "in development" status prominent */}
			<AIAdvisorHero />

			{/* Section 2: Planned capabilities — future-tense throughout */}
			<AIAdvisorVision />

			{/* Section 3: Concept chat preview — static mock, clearly labeled */}
			<AIAdvisorPreview />

			{/* CTA — teal gradient panel, shared across all public pages */}
			<LagoonCTA heading='Track your money while AI Advisor is in development.' />
		</>
	);
}
