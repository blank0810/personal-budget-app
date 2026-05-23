import type { Metadata } from 'next';
import { FeaturesBento } from '@/components/modules/landing/FeaturesBento';
import { LoopReveal } from '@/components/modules/landing/LoopReveal';
import { TrustSecurity } from '@/components/modules/landing/TrustSecurity';
import { FinalCTA } from '@/components/modules/landing/CTA';

export const metadata: Metadata = {
	title: 'Features',
	description:
		'Send invoices and get paid faster, see every peso in and out, set budgets that show what is safe to spend, and reach your savings goals. One app for freelancers and solo operators.',
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
			<LoopReveal />
			<TrustSecurity />
			<FinalCTA />
		</>
	);
}
