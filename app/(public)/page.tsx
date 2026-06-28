import { LagoonHero } from '@/components/modules/landing/lagoon/LagoonHero';
import { LagoonStats } from '@/components/modules/landing/lagoon/LagoonStats';
import { LagoonFeatureGrid } from '@/components/modules/landing/lagoon/LagoonFeatureGrid';
import { LagoonHowItWorks } from '@/components/modules/landing/lagoon/LagoonHowItWorks';
import { LagoonPricing } from '@/components/modules/landing/lagoon/LagoonPricing';
import { LagoonCTA } from '@/components/modules/landing/lagoon/LagoonCTA';

/**
 * Home (/) — Lagoon design, STATIC server component.
 *
 * The shared LagoonNav + LagoonFooter live in app/(public)/layout.tsx; this
 * page renders only the body sections. The LagoonHero carries the page's
 * single <h1> (SSR-visible, never animated for LCP); every section below uses
 * <h2>, so heading order stays valid.
 *
 * No page-level metadata export — inherits the layout default (home title +
 * canonical '/'). No auth() — kept static for SEO.
 */
export default function HomePage() {
	return (
		<>
			{/* 1. Hero — h1 SSR-visible, staged entrance for everything else */}
			<LagoonHero />

			{/* 2. Honest KPI stats with scroll-triggered count-up */}
			<LagoonStats />

			{/* 3. 6-feature grid — hover lift + scroll reveal */}
			<LagoonFeatureGrid />

			{/* 4. How it works — 3 numbered steps + step connectors */}
			<LagoonHowItWorks />

			{/* 5. Pricing — ₱0 free tier, Pro coming soon (no fake trial) */}
			<LagoonPricing />

			{/* 6. Final CTA — teal panel, free registration */}
			<LagoonCTA />
		</>
	);
}
