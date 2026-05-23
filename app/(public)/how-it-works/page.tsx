import type { Metadata } from 'next';
import { ProblemStatement } from '@/components/modules/landing/ProblemStatement';
import { HowItWorks } from '@/components/modules/landing/HowItWorks';
import { FinalCTA } from '@/components/modules/landing/CTA';

export const metadata: Metadata = {
	title: 'How it works',
	description:
		'From invoice to income to budget. See how one app keeps the money you earn and the money you plan in the same place.',
	alternates: {
		canonical: '/how-it-works',
	},
};

/**
 * /how-it-works — STATIC. The ProblemStatement lead section carries the
 * page's single <h1>; the reused sections below it use <h2>.
 */
export default function HowItWorksPage() {
	return (
		<>
			<ProblemStatement lead />
			<HowItWorks />
			<FinalCTA />
		</>
	);
}
