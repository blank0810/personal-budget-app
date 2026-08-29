import type { Metadata } from 'next';
import { FeaturesHero } from '@/components/modules/landing/lagoon/features/FeaturesHero';
import { FeatureRowBudgets } from '@/components/modules/landing/lagoon/features/FeatureRowBudgets';
import { FeatureRowTransactions } from '@/components/modules/landing/lagoon/features/FeatureRowTransactions';
import { FeatureRowGoals } from '@/components/modules/landing/lagoon/features/FeatureRowGoals';
import { FeatureRowImport } from '@/components/modules/landing/lagoon/features/FeatureRowImport';
import { FeatureRowReports } from '@/components/modules/landing/lagoon/features/FeatureRowReports';
import { FeatureRowAI } from '@/components/modules/landing/lagoon/features/FeatureRowAI';
import { LagoonCTA } from '@/components/modules/landing/lagoon/LagoonCTA';
import { APP_URL } from '@/lib/url';

export const metadata: Metadata = {
	title: 'Budgeting App Features',
	description:
		'Track every transaction, set budgets that show safe-to-spend, reach savings goals, and send polished invoices — one free app for managing your money.',
	alternates: {
		canonical: '/features',
	},
	openGraph: {
		title: 'Budgeting App Features · Budget Planner',
		description:
			'Track every transaction, set budgets that show safe-to-spend, reach savings goals, and send polished invoices — one free app for managing your money.',
		url: `${APP_URL}/features`,
		type: 'website',
		siteName: 'Budget Planner',
		locale: 'en_US',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Budgeting App Features · Budget Planner',
		description:
			'Track every transaction, set budgets that show safe-to-spend, reach savings goals, and send polished invoices — one free app for managing your money.',
	},
};

/**
 * /features — STATIC, Lagoon design. The FeaturesHero carries the page's
 * single <h1>; every FeatureRow below uses <h2>, so heading order stays valid.
 *
 * Section order: hero → budgets → transactions → goals → import → reports →
 * AI (future-tense teaser) → shared CTA.
 */
export default function FeaturesPage() {
	return (
		<>
			<FeaturesHero />
			<FeatureRowBudgets />
			<FeatureRowTransactions />
			<FeatureRowGoals />
			<FeatureRowImport />
			<FeatureRowReports />
			<FeatureRowAI />
			<LagoonCTA heading='Everything you need — without the subscription.' />
		</>
	);
}
