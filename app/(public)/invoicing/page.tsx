import type { Metadata } from 'next';
import { InvoicingHero } from '@/components/modules/landing/lagoon/invoicing/InvoicingHero';
import { InvoicingFeatures } from '@/components/modules/landing/lagoon/invoicing/InvoicingFeatures';
import { InvoicingWorkflow } from '@/components/modules/landing/lagoon/invoicing/InvoicingWorkflow';
import { LagoonCTA } from '@/components/modules/landing/lagoon/LagoonCTA';
import { APP_URL } from '@/lib/url';

export const metadata: Metadata = {
	title: 'Client Invoicing — Send & Track Invoices',
	description:
		'Send polished invoices by email, export to PDF, and share payment links. Log payments in the same app where you track your budget. Free to start.',
	alternates: {
		canonical: '/invoicing',
	},
	openGraph: {
		title: 'Client Invoicing — Send & Track Invoices · Budget Planner',
		description:
			'Send polished invoices by email, export to PDF, and share payment links. Log payments in the same app where you track your budget. Free to start.',
		type: 'website',
		url: `${APP_URL}/invoicing`,
		siteName: 'Budget Planner',
		locale: 'en_US',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Client Invoicing — Send & Track Invoices · Budget Planner',
		description:
			'Send polished invoices by email, export to PDF, and share payment links or QR codes. Free to start.',
	},
};

/**
 * /invoicing — marketing page for the invoicing feature.
 *
 * All features described are SHIPPED. Honesty rules:
 * - No "auto-sync" or "closed-loop" language.
 * - Logging a payment as income is framed as a manual step.
 * - No fabricated metrics, reviews, or user counts.
 *
 * JSON-LD: WebPage only — sitewide layout emits WebApplication + Organization.
 */
const pageJsonLd = {
	'@context': 'https://schema.org',
	'@type': 'WebPage',
	'@id': `${APP_URL}/invoicing`,
	name: 'Client Invoicing — Send & Track Invoices · Budget Planner',
	description:
		'Send polished invoices by email, export to PDF, and share payment links. Log payments in the same app where you track your budget. Free to start.',
	url: `${APP_URL}/invoicing`,
	isPartOf: { '@id': `${APP_URL}/#app` },
};

export default function InvoicingPage() {
	return (
		<>
			<script
				type='application/ld+json'
				dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
			/>

			{/* Section 1: Hero — carries the page's single h1 */}
			<InvoicingHero />

			{/* Section 2: Feature cards — 5 shipped capabilities */}
			<InvoicingFeatures />

			{/* Section 3: 3-step workflow + honest co-location note */}
			<InvoicingWorkflow />

			{/* CTA — teal gradient panel, shared across all public pages */}
			<LagoonCTA heading='Send your first invoice in minutes.' />
		</>
	);
}
