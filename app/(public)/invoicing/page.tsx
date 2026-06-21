import type { Metadata } from 'next';
import {
	FileText,
	Mail,
	QrCode,
	Globe,
	Building2,
	ArrowRight,
} from 'lucide-react';
import { InvoiceCardMock } from '@/components/modules/landing/ui/InvoiceCardMock';
import { FinalCTA } from '@/components/modules/landing/CTA';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://budgetplanner.app';

export const metadata: Metadata = {
	title: 'Client Invoicing — Send & Track Invoices',
	description:
		'Send polished invoices by email, export to PDF, and share payment links or QR codes. Log a client payment in the same app where you manage your budget. Free to start.',
	alternates: {
		canonical: '/invoicing',
	},
	openGraph: {
		title: 'Client Invoicing — Send & Track Invoices · Budget Planner',
		description:
			'Send polished invoices by email, export to PDF, and share payment links or QR codes. Log a client payment in the same app where you manage your budget. Free to start.',
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
 * /invoicing — STATIC server component.
 *
 * This page is the sole home for the invoicing feature explainer after it was
 * removed from the landing home page. All features described here are SHIPPED.
 *
 * Honesty rules (PRODUCT.md):
 * - NO "automatically syncs", "flows into", or "closed-loop" language.
 * - The co-location note is explicitly framed as a manual step ("you log it").
 * - No fabricated metrics, no fake reviews.
 *
 * Heading order: this page renders its own <h1> in the hero section.
 * Feature items use <h3>; FinalCTA uses <h2>.
 *
 * JSON-LD: WebPage type only — the sitewide layout already emits WebApplication
 * + Organization; a second app node would conflict.
 */

const pageJsonLd = {
	'@context': 'https://schema.org',
	'@type': 'WebPage',
	'@id': `${APP_URL}/invoicing`,
	name: 'Client Invoicing — Send & Track Invoices · Budget Planner',
	description:
		'Send polished invoices by email, export to PDF, and share payment links or QR codes. Log a client payment in the same app where you manage your budget. Free to start.',
	url: `${APP_URL}/invoicing`,
	isPartOf: { '@id': `${APP_URL}/#app` },
};

const FEATURES = [
	{
		icon: Mail,
		title: 'Send invoices by email',
		description:
			'Compose and send a polished invoice directly from the app. Your client receives a clean, professional email — no third-party tool required.',
	},
	{
		icon: FileText,
		title: 'PDF export',
		description:
			'Download any invoice as a PDF. Attach it to your own email, archive it, or share it however your client prefers.',
	},
	{
		icon: QrCode,
		title: 'Payment links and QR codes',
		description:
			'Every invoice includes a shareable payment link and a scannable QR code so clients can see the total and your payment details in one tap.',
	},
	{
		icon: Globe,
		title: 'Multi-currency',
		description:
			'Invoice in any currency. The currency is set on each invoice, so you can bill international clients without changing your account settings.',
	},
	{
		icon: Building2,
		title: 'Your business identity on every invoice',
		description:
			'Add your business name, address, and contact details once. They appear on every invoice you generate — no re-entering per client.',
	},
];

export default function InvoicingPage() {
	return (
		<>
			<script
				type='application/ld+json'
				dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
			/>

			{/* ── Hero ─────────────────────────────────────────────────────────── */}
			<section className='relative overflow-hidden pb-20 pt-28 sm:pb-28 sm:pt-36'>
				<div className='mx-auto max-w-5xl px-6'>
					<div className='mx-auto max-w-2xl text-center'>
						<p className='mb-4 text-sm font-semibold uppercase tracking-widest text-l-accent'>
							Invoicing
						</p>
						<h1 className='mb-5 text-4xl font-bold leading-tight tracking-tight text-l-text-1 sm:text-5xl'>
							Send invoices, get paid — without a second tool
						</h1>
						<p className='mb-10 text-base leading-relaxed text-l-text-3 sm:text-lg'>
							Create a polished invoice, email it to your client, and share a
							payment link or QR code — all from the same app where you track
							your budget and savings goals.
						</p>
						<a
							href='/register'
							className='inline-flex items-center gap-2 rounded-lg bg-l-accent px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90'
						>
							Start for free
							<ArrowRight className='h-4 w-4' />
						</a>
					</div>

					{/* Invoice card preview */}
					<div className='mx-auto mt-14 max-w-sm'>
						<InvoiceCardMock />
					</div>
				</div>
			</section>

			{/* ── Feature list ─────────────────────────────────────────────────── */}
			<section className='pb-20 sm:pb-28'>
				<div className='mx-auto max-w-5xl px-6'>
					<div className='grid gap-8 sm:grid-cols-2 lg:grid-cols-3'>
						{FEATURES.map(({ icon: Icon, title, description }) => (
							<div
								key={title}
								className='rounded-xl border border-l-border bg-l-surface-1 p-6'
							>
								<div className='mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-l-surface-2'>
									<Icon className='h-5 w-5 text-l-accent' />
								</div>
								<h3 className='mb-2 text-sm font-semibold text-l-text-1'>
									{title}
								</h3>
								<p className='text-sm leading-relaxed text-l-text-3'>
									{description}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── Co-location note (honest, explicit manual step) ───────────────── */}
			<section className='pb-20 sm:pb-28'>
				<div className='mx-auto max-w-5xl px-6'>
					<div className='rounded-xl border border-l-border bg-l-surface-1 px-8 py-10 sm:flex sm:items-start sm:gap-8'>
						<div className='mb-4 shrink-0 sm:mb-0'>
							<div className='inline-flex h-12 w-12 items-center justify-center rounded-lg bg-l-surface-2'>
								<ArrowRight className='h-5 w-5 text-l-accent' />
							</div>
						</div>
						<div>
							<h2 className='mb-2 text-base font-semibold text-l-text-1'>
								Budget and invoicing in one place
							</h2>
							<p className='text-sm leading-relaxed text-l-text-3'>
								When a client pays, you log the income in the same app where you
								track your budget. One place for your money — no tab-switching
								between a separate invoicing tool and a separate budgeting
								spreadsheet.
							</p>
						</div>
					</div>
				</div>
			</section>

			<FinalCTA />
		</>
	);
}
