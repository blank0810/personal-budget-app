import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Inter } from 'next/font/google';
import { LazyMotionProvider } from '@/components/modules/landing/ui/LazyMotionProvider';
import { LandingSessionProvider } from '@/components/modules/landing/ui/LandingSessionProvider';
import { LagoonNav } from '@/components/modules/landing/lagoon/LagoonNav';
import { LagoonFooter } from '@/components/modules/landing/lagoon/LagoonFooter';
import '@/components/modules/landing/lagoon/lagoon.css';

/**
 * Display heading font — Plus Jakarta Sans (700, 800).
 * Exposed as --lagoon-font-heading so server-rendered h* can use it.
 */
const plusJakarta = Plus_Jakarta_Sans({
	subsets: ['latin'],
	weight: ['700', '800'],
	variable: '--lagoon-font-heading',
	display: 'swap',
});

/** Body font — Inter (400, 500, 600). Swiss-style workhorse for 14–17px. */
const inter = Inter({
	subsets: ['latin'],
	weight: ['400', '500', '600'],
	variable: '--lagoon-font-body',
	display: 'swap',
});

const BASE_DESCRIPTION =
	'Personal budgeting and expense tracking app. Track income and expenses, set budgets, reach savings goals, and send invoices. Free to start.';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://budgetplanner.app';

/**
 * Sitewide structured data — WebApplication + Organization @graph.
 *
 * Emitted once in the shared public layout so it appears in the initial HTML
 * on every marketing route. Per-page JSON-LD (e.g. FAQPage on /faq) is
 * injected by each page's own server component.
 *
 * Honesty rules (PRODUCT.md + SEO architecture doc):
 * - NO aggregateRating / review — no real reviews exist; fabrication risks a
 *   Google manual action. The "missing rating" validator recommendation is
 *   expected and acceptable.
 * - AI Advisor is future-tense only ("in development").
 * - No personal/founder name — Organization is "Budget Planner".
 * - priceCurrency: 'PHP' on the free Offer — product is peso-first.
 */
const SITEWIDE_JSON_LD = {
	'@context': 'https://schema.org',
	'@graph': [
		{
			'@type': 'Organization',
			'@id': `${APP_URL}/#org`,
			name: 'Budget Planner',
			url: `${APP_URL}/`,
			description: 'Free personal budgeting and expense tracking app.',
		},
		{
			'@type': 'WebApplication',
			'@id': `${APP_URL}/#app`,
			name: 'Budget Planner',
			url: `${APP_URL}/`,
			applicationCategory: 'FinanceApplication',
			operatingSystem: 'Web',
			browserRequirements:
				'Requires JavaScript. Requires a modern web browser.',
			publisher: { '@id': `${APP_URL}/#org` },
			offers: {
				'@type': 'Offer',
				price: '0',
				priceCurrency: 'PHP',
			},
			description:
				'Personal budgeting and expense tracking app. Track income and expenses, set budgets for every category, reach savings goals, and send client invoices. Free to start. An AI financial advisor is in development.',
			featureList: [
				'Income and expense tracking',
				'Envelope budgets',
				'Savings goals',
				'Recurring transaction automation',
				'Client invoicing and PDF export',
				'CSV import with duplicate detection',
				'Financial reports and PDF export',
				'Dashboard with financial health score',
			],
			// NO aggregateRating / review -- see honesty comment above
		},
	],
};

export const viewport: Viewport = {
	themeColor: '#0d9488',
};

export const metadata: Metadata = {
	title: {
		default: 'Budget Planner — Budgeting, expense tracking & invoicing',
		template: '%s · Budget Planner',
	},
	description: BASE_DESCRIPTION,
	alternates: {
		canonical: '/',
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			'max-image-preview': 'large',
			'max-snippet': -1,
		},
	},
	openGraph: {
		title: 'Budget Planner — Budgeting, expense tracking & invoicing',
		description:
			'Track income and expenses, set budgets, reach savings goals, and send invoices. Free to start.',
		type: 'website',
		url: '/',
		siteName: 'Budget Planner',
		locale: 'en_US',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Budget Planner — Budgeting, expense tracking & invoicing',
		description:
			'Track income and expenses, set budgets, reach savings goals, and send invoices. Free to start.',
	},
};

/**
 * Public layout — shared shell for the multi-page marketing site.
 *
 * Design system: the "Lagoon" landing kit (light-first, teal accent, with a
 * self-contained dark mode via the `data-lagoon-theme` attribute + the
 * no-flash inline script below). This is INDEPENDENT of the app's global
 * next-themes `.dark` class — the two never collide because Lagoon reads its
 * own attribute and paints its own `.lagoon-root` canvas.
 *
 * The header (LagoonNav) and footer (LagoonFooter) render identically on every
 * public route (/, /features, /how-it-works, /pricing, /faq, /invoicing,
 * /ai-advisor). Each route only renders its page body into <main>.
 *
 * STATIC: no auth() call here — pages stay cacheable for crawlers. The navbar
 * is auth-aware client-side via useSession (post-hydration swap), and the
 * logged-in → /dashboard redirect lives in middleware.ts.
 *
 * Title template lives on metadata above (`%s · Budget Planner`); each route
 * exports its own honest title/description. opengraph-image.tsx and
 * twitter-image.tsx remain file-convention based.
 */
export default function PublicLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div
			className={`lagoon-root ${plusJakarta.variable} ${inter.variable}`}
			style={{
				fontFamily: 'var(--lagoon-font-body), Inter, system-ui, sans-serif',
				WebkitFontSmoothing: 'antialiased',
				MozOsxFontSmoothing: 'grayscale',
			}}
		>
			{/* Sitewide structured data — first in the body so it lands in initial HTML */}
			<script
				type='application/ld+json'
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(SITEWIDE_JSON_LD),
				}}
			/>

			{/*
			 * No-flash theme script — runs synchronously before paint.
			 * Reads localStorage['lagoon-theme'] and applies data-lagoon-theme to
			 * <html> so dark-mode CSS variables take effect before React hydrates.
			 * Default is 'light' when no preference is stored.
			 */}
			<script
				dangerouslySetInnerHTML={{
					__html: `(function(){try{var t=localStorage.getItem('lagoon-theme');document.documentElement.setAttribute('data-lagoon-theme',t==='dark'?'dark':'light');}catch(e){document.documentElement.setAttribute('data-lagoon-theme','light');}})()`,
				}}
			/>

			{/* Heading font injection — scoped to .lagoon-root */}
			<style>{`
				.lagoon-root h1,
				.lagoon-root h2,
				.lagoon-root h3,
				.lagoon-root h4 {
					font-family: var(--lagoon-font-heading), 'Plus Jakarta Sans', system-ui, sans-serif;
				}
			`}</style>

			{/* Skip to content — WCAG 2.1 */}
			<a
				href='#main-content'
				className='sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-[100] focus-visible:rounded-lg focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:font-semibold focus-visible:outline-2 focus-visible:outline-white'
				style={{ background: 'var(--lagoon-accent)', color: 'var(--lagoon-on-accent)' }}
			>
				Skip to main content
			</a>

			<LazyMotionProvider>
				<LandingSessionProvider>
					<LagoonNav />
					<main id='main-content'>{children}</main>
					<LagoonFooter />
				</LandingSessionProvider>
			</LazyMotionProvider>
		</div>
	);
}
