import type { Metadata, Viewport } from 'next';
import { Archivo } from 'next/font/google';
import { LandingSessionProvider } from '@/components/modules/landing/ui/LandingSessionProvider';
import { StatementNav } from '@/components/modules/landing/statement/StatementNav';
import { StatementFooter } from '@/components/modules/landing/statement/StatementFooter';
import '@/components/modules/landing/statement/statement.css';
import { APP_URL } from '@/lib/url';

/**
 * Archivo — one family carries the entire public surface.
 *
 * Chosen against the brief's three voice words (blunt, precise,
 * unglamorous): a grotesque with real width, no charm, and a `wdth`
 * axis that lets display type run slightly condensed like a headline
 * instead of a logotype. Deliberately not Inter / DM Sans / Plus Jakarta
 * — those read as "a website made in 2024", which is the exact impression
 * this redesign exists to remove.
 *
 * Financial figures reuse the app's own `--font-geist-mono`, already
 * loaded by the root layout, so the marketing site sets money in the
 * same face the product does — and costs zero extra bytes to do it.
 */
const archivo = Archivo({
	subsets: ['latin'],
	axes: ['wdth'],
	variable: '--st-font-sans',
	display: 'swap',
});

const BASE_DESCRIPTION =
	'Log your income, expenses, transfers, and payments — Budget Planner turns that into a live financial health score, net worth trend, budgets, and reports. Free to start. No bank linking required.';

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
			logo: {
				'@type': 'ImageObject',
				url: `${APP_URL}/logo.svg`,
				width: 512,
				height: 512,
			},
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
				'Personal budgeting and expense-tracking app that scores your financial health. Log income, expenses, transfers, and payments, and Budget Planner computes a financial health score across five pillars, plus budgets, savings goals, and reports. Free to start. An AI financial advisor is in development.',
			featureList: [
				'Financial health score across five pillars',
				'Income and expense tracking',
				'Financial reports and PDF export',
				'Envelope budgets',
				'Savings goals',
				'CSV import with duplicate detection',
				'Client invoicing and PDF export',
			],
			// NO aggregateRating / review -- see honesty comment above
		},
	],
};

export const viewport: Viewport = {
	/* Matches --st-canvas in light mode; the browser chrome should not
	   announce a colour the page never uses. */
	themeColor: [
		{ media: '(prefers-color-scheme: light)', color: '#fcfaf9' },
		{ media: '(prefers-color-scheme: dark)', color: '#140f0e' },
	],
};

export const metadata: Metadata = {
	title: {
		default: 'Budget Planner — See your real financial health score',
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
		title: 'Budget Planner — See your real financial health score',
		description:
			'Log your income and expenses and get a financial health score out of 100 — plus budgets, savings goals, and monthly reports. Free to start. No bank linking.',
		type: 'website',
		url: '/',
		siteName: 'Budget Planner',
		locale: 'en_US',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Budget Planner — See your real financial health score',
		description:
			'Log your income and expenses and get a financial health score out of 100 — plus budgets, savings goals, and monthly reports. Free to start. No bank linking.',
	},
};

/**
 * Public layout — shared shell for the multi-page marketing site.
 *
 * Design system: "Plain Statement" (`statement.css`). Light-first bone
 * canvas, near-black ink, one signal red-orange, hairline rules, and
 * the app's own Health Ledger as the recurring object. It carries its
 * own dark mode through the `data-st-theme` attribute plus the
 * no-flash script below — INDEPENDENT of the authenticated app's
 * next-themes `.dark` class, so the two can never collide.
 *
 * STATIC: no auth() call here — pages stay cacheable for crawlers. The
 * navbar is auth-aware client-side via useSession (post-hydration swap),
 * and the logged-in → /dashboard redirect lives in middleware.ts.
 */
export default function PublicLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div
			className={`st-root ${archivo.variable}`}
			style={{
				// Geist Mono is loaded once by the root layout; reuse it here.
				['--st-font-mono' as string]: 'var(--font-geist-mono)',
				fontFamily: 'var(--st-font-sans), system-ui, sans-serif',
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
			 * No-flash theme script — runs synchronously before paint. Reads the
			 * current key, falls back to the retired Lagoon key so anyone who had
			 * chosen dark mode keeps it, then applies data-st-theme to <html> so
			 * the dark tokens take effect before React hydrates.
			 */}
			<script
				dangerouslySetInnerHTML={{
					__html: `(function(){try{var t=localStorage.getItem('bp-public-theme')||localStorage.getItem('lagoon-theme');document.documentElement.setAttribute('data-st-theme',t==='dark'?'dark':'light');}catch(e){document.documentElement.setAttribute('data-st-theme','light');}})()`,
				}}
			/>

			{/* Skip to content — WCAG 2.1 */}
			<a
				href='#main-content'
				className='sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-[300] focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:font-semibold focus-visible:outline-2'
				style={{
					background: 'var(--st-signal)',
					color: 'var(--st-on-signal)',
					outlineColor: 'var(--st-ink)',
				}}
			>
				Skip to main content
			</a>

			<LandingSessionProvider>
				<StatementNav />
				<main id='main-content'>{children}</main>
				<StatementFooter />
			</LandingSessionProvider>
		</div>
	);
}
