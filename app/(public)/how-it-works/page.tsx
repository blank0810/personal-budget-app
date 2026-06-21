import type { Metadata } from 'next';
import { ProblemStatement } from '@/components/modules/landing/ProblemStatement';
import { HowItWorks } from '@/components/modules/landing/HowItWorks';
import { FinalCTA } from '@/components/modules/landing/CTA';

export const metadata: Metadata = {
	title: 'How it works',
	description:
		'Set budgets, track every transaction, and reach your savings goals. Also send client invoices and log income — all in one app, no switching between tools.',
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
