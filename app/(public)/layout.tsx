import type { Metadata } from 'next';
import { LazyMotionProvider } from '@/components/modules/landing/ui/LazyMotionProvider';
import { LandingSessionProvider } from '@/components/modules/landing/ui/LandingSessionProvider';
import { LandingNavbar } from '@/components/modules/landing/Navbar';
import { LandingFooter } from '@/components/modules/landing/Footer';
import './landing.css';

const BASE_DESCRIPTION =
	'Personal budgeting and expense tracking app. Track income and expenses, set budgets for every category, reach savings goals, and send client invoices. Free to start. An AI financial advisor is in development.';

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
 * - priceCurrency omitted from the free Offer — the product uses PHP (peso)
 *   but billing currency is not yet locked, so we omit rather than invent USD.
 */
const SITEWIDE_JSON_LD = {
	'@context': 'https://schema.org',
	'@graph': [
		{
			'@type': 'Organization',
			'@id': `${APP_URL}/#org`,
			name: 'Budget Planner',
			url: `${APP_URL}/`,
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

export const metadata: Metadata = {
	title: {
		default: 'Budget Planner — Budgeting, expense tracking & client invoicing',
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
		title: 'Budget Planner — Budgeting, expense tracking & client invoicing',
		description:
			'Track income and expenses, set budgets for every category, reach savings goals, and send client invoices. Free to start.',
		type: 'website',
		url: '/',
		siteName: 'Budget Planner',
		locale: 'en_US',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Budget Planner',
		description:
			'Budgeting, expense tracking, and client invoicing. Free to start.',
	},
};

/**
 * Public layout — shared shell for the multi-page marketing site.
 *
 * The header (LandingNavbar) and footer (LandingFooter) live here so they
 * render identically on every public route (/, /features, /how-it-works,
 * /ai-advisor, /pricing, /faq). Each route only renders its page body into
 * <main>.
 *
 * STATIC: no auth() call here — the pages stay cacheable for crawlers. The
 * navbar is auth-aware client-side via useSession (post-hydration swap), and
 * the logged-in → /dashboard redirect lives in middleware.ts.
 *
 * Title template lives on metadata above (`%s · Budget Planner`); each route
 * exports its own honest title/description. opengraph-image.tsx and
 * twitter-image.tsx remain file-convention based — we never duplicate
 * openGraph.images here so they keep working.
 */
export default function PublicLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className='landing'>
			<script
				type='application/ld+json'
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(SITEWIDE_JSON_LD),
				}}
			/>
			<LazyMotionProvider>
				<LandingSessionProvider>
					<div className='relative min-h-screen bg-l-bg'>
						<LandingNavbar />
						<main>{children}</main>
						<LandingFooter />
					</div>
				</LandingSessionProvider>
			</LazyMotionProvider>
		</div>
	);
}
