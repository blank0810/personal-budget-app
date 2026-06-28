import type { Metadata } from 'next';
import { PricingHero } from '@/components/modules/landing/lagoon/pricing/PricingHero';
import { PricingPlans } from '@/components/modules/landing/lagoon/pricing/PricingPlans';
import { PricingFAQ } from '@/components/modules/landing/lagoon/pricing/PricingFAQ';
import { LagoonCTA } from '@/components/modules/landing/lagoon/LagoonCTA';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://budgetplanner.app';

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

/**
 * /pricing — STATIC, Lagoon design. PricingHero carries the single <h1>.
 * Honesty: ₱0 Free forever; Pro has no price, no trial, future-tense only.
 *
 * Section order: hero → plan cards (Free featured + Pro coming soon) →
 * pricing FAQ → shared CTA.
 */
export default function PricingPage() {
	return (
		<>
			<PricingHero />
			<PricingPlans />
			<PricingFAQ />
			<LagoonCTA heading='Free forever. No credit card, no bank sync.' />
		</>
	);
}
