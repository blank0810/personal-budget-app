import type { Metadata } from 'next';
import { Pricing } from '@/components/modules/landing/Pricing';
import { FinalCTA } from '@/components/modules/landing/CTA';

export const metadata: Metadata = {
	title: 'Pricing',
	description:
		'Free to start, no credit card. Everything you can see today is free while the product grows, and we stay honest about what is next.',
	alternates: {
		canonical: '/pricing',
	},
};

/**
 * /pricing — STATIC. The Pricing lead section carries the page's single
 * <h1>; the FinalCTA below it uses <h2>.
 */
export default function PricingPage() {
	return (
		<>
			<Pricing lead />
			<FinalCTA />
		</>
	);
}
