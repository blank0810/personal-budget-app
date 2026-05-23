import type { Metadata } from 'next';
import { AIAdvisorSpotlight } from '@/components/modules/landing/AIAdvisorSpotlight';
import { FinalCTA } from '@/components/modules/landing/CTA';

export const metadata: Metadata = {
	title: 'AI Advisor',
	description:
		'An advisor that will read your numbers and answer the money questions you actually ask. Coming soon, in active development.',
	alternates: {
		canonical: '/ai-advisor',
	},
};

/**
 * /ai-advisor — STATIC. The AIAdvisorSpotlight lead section carries the
 * page's single <h1>; the FinalCTA below it uses <h2>.
 *
 * HONESTY (PRODUCT.md): the advisor is the flagship VISION, not a live
 * feature. Every line on this page is future-tense and framed as in
 * development. No fabricated metrics, no waitlist.
 */
export default function AIAdvisorPage() {
	return (
		<>
			<AIAdvisorSpotlight lead />
			<FinalCTA />
		</>
	);
}
