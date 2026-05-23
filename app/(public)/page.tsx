import { LandingHero } from '@/components/modules/landing/Hero';
import { CredibilityStrip } from '@/components/modules/landing/CredibilityStrip';
import { HomeHighlights } from '@/components/modules/landing/HomeHighlights';
import { FinalCTA } from '@/components/modules/landing/CTA';

/**
 * Home (/) — lean overview, STATIC server component.
 *
 * The shared header + footer live in app/(public)/layout.tsx. This route is
 * deliberately thin: the Hero (which carries the page's single <h1>), the
 * honest CredibilityStrip, a compact HomeHighlights teaser that links out to
 * the dedicated pages, and the closing CTA. The full Features / How it works /
 * AI Advisor / Pricing / FAQ sections each live on their own route now, so we
 * do NOT duplicate them here.
 *
 * No PageHeader here — the Hero is the h1. No auth() — kept static for SEO.
 */
export default function HomePage() {
	return (
		<>
			<LandingHero />
			<CredibilityStrip />
			<HomeHighlights />
			<FinalCTA />
		</>
	);
}
