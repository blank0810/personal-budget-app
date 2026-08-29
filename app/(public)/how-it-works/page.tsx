import type { Metadata } from 'next';
import { HowItWorksHero } from '@/components/modules/landing/lagoon/how-it-works/HowItWorksHero';
import { HowItWorksSteps } from '@/components/modules/landing/lagoon/how-it-works/HowItWorksSteps';
import { HowItWorksWhyManual } from '@/components/modules/landing/lagoon/how-it-works/HowItWorksWhyManual';
import { LagoonCTA } from '@/components/modules/landing/lagoon/LagoonCTA';
import { APP_URL } from '@/lib/url';

export const metadata: Metadata = {
	title: 'How Budget Planner Works — Manual Tracking',
	description:
		'Set budgets, track every transaction, and reach your savings goals. Also send client invoices and log income — all in one app, no switching between tools.',
	alternates: {
		canonical: '/how-it-works',
	},
	openGraph: {
		title: 'How Budget Planner Works — Manual Tracking · Budget Planner',
		description:
			'Set budgets, track every transaction, and reach your savings goals. All in one app — no bank linking required.',
		url: `${APP_URL}/how-it-works`,
		type: 'website',
		siteName: 'Budget Planner',
		locale: 'en_US',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'How Budget Planner Works — Manual Tracking · Budget Planner',
		description:
			'Set budgets, track every transaction, and reach your savings goals. All in one app — no bank linking required.',
	},
};

/**
 * /how-it-works — STATIC, Lagoon design. HowItWorksHero carries the single
 * <h1>; sections below use <h2>.
 *
 * Section order: hero → 4-step timeline → "why manual logging?" → shared CTA.
 */
export default function HowItWorksPage() {
	return (
		<>
			<HowItWorksHero />
			<HowItWorksSteps />
			<HowItWorksWhyManual />
			<LagoonCTA heading='Start tracking in minutes. No bank access required.' />
		</>
	);
}
