import type { Metadata, Viewport } from 'next';
import { Public_Sans, Martian_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import { LandingSessionProvider } from '@/components/modules/landing/ui/LandingSessionProvider';
import { InstrumentNav } from '@/components/modules/landing/instrument/InstrumentNav';
import { InstrumentFooter } from '@/components/modules/landing/instrument/InstrumentFooter';
import '@/components/modules/landing/instrument/instrument.css';
import { APP_URL } from '@/lib/url';

/**
 * Public Sans carries the whole public surface.
 *
 * Chosen against the brief's three voice words — blunt, precise,
 * unglamorous. It is the typeface of US federal government forms,
 * which is exactly the register for a product whose pitch is that it
 * does not flatter you. Deliberately not Inter / DM Sans / Plus
 * Jakarta: those read as "a website made in 2024", which is the
 * impression this redesign exists to remove.
 */
const publicSans = Public_Sans({
	subsets: ['latin'],
	variable: '--in-font-sans-base',
	display: 'swap',
});

/**
 * Martian Mono is the instrument readout: numerals, grades, column
 * labels. It never sets body copy — monospace as shorthand for
 * "technical" is costume, but a gauge reading genuinely is a readout.
 */
const martianMono = Martian_Mono({
	subsets: ['latin'],
	variable: '--in-font-mono-base',
	display: 'swap',
});

/**
 * Neither face carries U+20B1, so the peso falls back to whatever the
 * system offers and sits visibly wrong beside the figures. Scoping
 * this to the single codepoint fixes the glyph without touching
 * anything else. Same asset the PDF renderer already uses.
 */
const currencyFallback = localFont({
	src: '../../public/fonts/CurrencyFallback.ttf',
	variable: '--in-font-currency',
	display: 'swap',
	declarations: [{ prop: 'unicode-range', value: 'U+20B1' }],
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
	/* Matches --canvas in each theme; the browser chrome should not
	   announce a colour the page never uses. */
	themeColor: [
		{ media: '(prefers-color-scheme: light)', color: '#fcfbfa' },
		{ media: '(prefers-color-scheme: dark)', color: '#000000' },
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
 * Design system: "Instrument" (`instrument.css`). Dual theme with a
 * true-black dark mode, carried on the `data-in-theme` attribute plus
 * the no-flash script below — INDEPENDENT of the authenticated app's
 * next-themes `.dark` class, so the two can never collide.
 *
 * STATIC: no auth() call here, so pages stay cacheable for crawlers.
 * The navbar is auth-aware client-side via useSession (post-hydration
 * swap), and the logged-in redirect lives in middleware.ts.
 */
export default function PublicLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div
			className={`in-root ${publicSans.variable} ${martianMono.variable} ${currencyFallback.variable}`}
			style={{
				// The currency face is listed first so it wins for U+20B1 only.
				['--in-font-sans' as string]:
					'var(--in-font-currency), var(--in-font-sans-base)',
				['--in-font-mono' as string]:
					'var(--in-font-currency), var(--in-font-mono-base)',
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
			 * No-flash theme script — runs synchronously before paint. Applies an
			 * explicit choice if one exists, otherwise follows the operating
			 * system. A public page that forces light on someone whose machine is
			 * dark is a small rudeness, and it also leaves the product
			 * screenshots mismatched against the page around them.
			 */}
			<script
				dangerouslySetInnerHTML={{
					__html: `(function(){try{var k=localStorage.getItem('bp-public-theme');document.documentElement.setAttribute('data-in-theme',k||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));}catch(e){document.documentElement.setAttribute('data-in-theme','dark');}})()`,
				}}
			/>

			<a href='#main-content' className='skip'>
				Skip to main content
			</a>

			<LandingSessionProvider>
				<InstrumentNav />
				<main id='main-content'>{children}</main>
				<InstrumentFooter />
			</LandingSessionProvider>
		</div>
	);
}
