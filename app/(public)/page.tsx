import { LandingHero } from '@/components/modules/landing/Hero';
import { CredibilityStrip } from '@/components/modules/landing/CredibilityStrip';
import { BudgetDemo } from '@/components/modules/landing/BudgetDemo';
import { FeaturesBento } from '@/components/modules/landing/FeaturesBento';
import { FinalCTA } from '@/components/modules/landing/CTA';
import Link from 'next/link';

/**
 * Home (/) — lean overview, STATIC server component.
 *
 * The shared header + footer live in app/(public)/layout.tsx. Composition:
 * the Hero (which carries the page's single <h1>), the honest CredibilityStrip,
 * the BudgetDemo centerpiece, the budgeting FeaturesBento, and the closing CTA.
 * Invoicing is NOT pitched here — it lives on its own /invoicing page, reached
 * via the nav/footer and a single contextual link below the bento.
 *
 * No PageHeader here — the Hero is the h1. No auth() — kept static for SEO.
 */
export default function HomePage() {
	return (
		<>
			<LandingHero />
			<CredibilityStrip />
			<BudgetDemo />
			<FeaturesBento />
			{/* Single contextual link to the standalone invoicing page (off the home flow) */}
			<section className='mx-auto max-w-[1184px] px-6 pb-10 md:px-10 xl:px-12'>
				<Link
					href='/invoicing'
					className='inline-flex items-center gap-1.5 text-sm text-l-text-3 transition-colors hover:text-l-text-1'
				>
					Need to send client invoices? Budget Planner includes a standalone invoicing module.
					<span aria-hidden='true'>→</span>
				</Link>
			</section>
			<FinalCTA />
		</>
	);
}
