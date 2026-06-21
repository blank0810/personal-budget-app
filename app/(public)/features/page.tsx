import type { Metadata } from 'next';
import { FeaturesBento } from '@/components/modules/landing/FeaturesBento';
import { TrustSecurity } from '@/components/modules/landing/TrustSecurity';
import { FinalCTA } from '@/components/modules/landing/CTA';

export const metadata: Metadata = {
	title: 'Features',
	description:
		'Track every transaction in and out, set budgets that show what is safe to spend, reach your savings goals, and send polished invoices to clients. One app for managing your money.',
	alternates: {
		canonical: '/features',
	},
};

/**
 * /features — STATIC. The FeaturesBento lead section carries the page's
 * single <h1> (its own bold eyebrow + maximalist heading lead the page);
 * every section below it uses <h2>, so heading order stays valid.
 */
export default function FeaturesPage() {
	return (
		<>
			<FeaturesBento lead />
			<TrustSecurity />
			<FinalCTA />
		</>
	);
}
