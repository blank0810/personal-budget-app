import { HomeHero } from '@/components/modules/landing/statement/home/HomeHero';
import { HomeMethod } from '@/components/modules/landing/statement/home/HomeMethod';
import { HomeSurfaces } from '@/components/modules/landing/statement/home/HomeSurfaces';
import { HomeIndex } from '@/components/modules/landing/statement/home/HomeIndex';
import { HomeInvoicing } from '@/components/modules/landing/statement/home/HomeInvoicing';
import { HomePrice } from '@/components/modules/landing/statement/home/HomePrice';
import { HomeAdvisor } from '@/components/modules/landing/statement/home/HomeAdvisor';
import { StatementCTA } from '@/components/modules/landing/statement/StatementCTA';

/**
 * Home (/) — "Plain Statement" design, STATIC server component.
 *
 * The shared nav and footer live in app/(public)/layout.tsx; this page
 * renders only the body. HomeHero carries the page's single <h1>
 * (server-rendered, never animated, it is the LCP element); every
 * section below uses <h2>, so heading order stays valid.
 *
 * Narrative order: the verdict → how it is produced → the running
 * product → what ships → the differentiator → what it costs → what
 * isn't built yet → the ask. Nothing unbuilt is claimed in the
 * present tense.
 *
 * No page-level metadata export — inherits the layout default (home
 * title + canonical '/'). No auth() — kept static for SEO.
 */
export default function HomePage() {
	return (
		<>
			<HomeHero />
			<HomeMethod />
			<HomeSurfaces />
			<HomeIndex />
			<HomeInvoicing />
			<HomePrice />
			<HomeAdvisor />
			<StatementCTA heading='Find out where you actually stand.' />
		</>
	);
}
