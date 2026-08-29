import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/modules/landing/statement/PageHero';
import { SectionHead } from '@/components/modules/landing/statement/SectionHead';
import { Ledger, LedgerRow } from '@/components/modules/landing/statement/Ledger';
import { StatementCTA } from '@/components/modules/landing/statement/StatementCTA';
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
 * - No "auto-sync" or "closed-loop" language. The workflow section says
 *   outright that logging the payment is a manual step, because a
 *   previous version of this page implied otherwise.
 * - No fabricated metrics, reviews, or user counts.
 *
 * JSON-LD: WebPage only — the sitewide layout emits WebApplication +
 * Organization.
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

const CAPABILITIES = [
	{
		label: 'Business identity',
		note: 'Your business name, address, tax ID and payment instructions are stored once and applied to every invoice you issue.',
	},
	{
		label: 'Saved clients',
		note: 'A client list, so billing the same person next month does not mean retyping their details.',
	},
	{
		label: 'PDF invoices',
		note: 'Line items, totals and your identity block rendered to a PDF you can download or archive.',
	},
	{
		label: 'Email delivery',
		note: 'Send the invoice to the client from inside the app instead of exporting and attaching it yourself.',
	},
	{
		label: 'Payment details and QR',
		note: 'Attach your payout methods and a QR code to the invoice so the client can pay without a follow-up message asking how.',
	},
];

const STEPS = [
	{
		title: 'Issue the invoice',
		body: 'Pick a client, add line items, send it or export the PDF.',
	},
	{
		title: 'The client pays you',
		body: 'Through whatever method you put on the invoice — bank transfer, e-wallet, cash. Budget Planner is not in the middle of this and never touches the money.',
	},
	{
		title: 'You log the payment',
		body: 'Record it as income against the account it landed in. This is a step you take; nothing marks itself paid on its own.',
	},
	{
		title: 'It shows up everywhere else',
		body: 'That income now counts toward your cash flow, your savings rate, and your health score, in the same app.',
	},
];

export default function InvoicingPage() {
	return (
		<>
			<script
				type='application/ld+json'
				dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
			/>

			<PageHero
				heading='Bill a client without opening a second app.'
				lead='Budgeting tools do not invoice. Invoicing tools do not budget. Doing both in one place means one login, one client list, and one set of numbers to reconcile at the end of the month.'
			/>

			<section className='st-section' aria-labelledby='capabilities-heading'>
				<div className='st-shell'>
					<div className='st-split'>
						<SectionHead
							id='capabilities-heading'
							heading='What ships today'
						>
							<p>All of this works now. Nothing on this page is a plan.</p>
						</SectionHead>

						<Ledger>
							{CAPABILITIES.map((row) => (
								<LedgerRow key={row.label} label={row.label} note={row.note} />
							))}
						</Ledger>
					</div>
				</div>
			</section>

			<section className='st-section st-sunk' aria-labelledby='workflow-heading'>
				<div className='st-shell'>
					<div className='st-split'>
						<SectionHead id='workflow-heading' heading='How the money actually moves'>
							<p>
								Worth being exact, because it would be easy to imply more than
								is true.
							</p>
						</SectionHead>

						<div>
							<ol className='border-t' style={{ borderColor: 'var(--st-ink)' }}>
								{STEPS.map((step, i) => (
									<li
										key={step.title}
										className='grid gap-x-6 gap-y-2 border-b py-7 sm:grid-cols-[auto_minmax(0,1fr)]'
										style={{ borderColor: 'var(--st-rule)' }}
									>
										<span
											className='st-num text-[0.9375rem] font-semibold leading-none sm:pt-1'
											style={{ color: 'var(--st-signal)' }}
											aria-hidden='true'
										>
											{String(i + 1).padStart(2, '0')}
										</span>
										<div>
											<h3 className='st-h3'>{step.title}</h3>
											<p
												className='mt-2 text-[1rem] leading-relaxed'
												style={{ color: 'var(--st-body)', maxWidth: '58ch' }}
											>
												{step.body}
											</p>
										</div>
									</li>
								))}
							</ol>

							<p
								className='mt-6 text-[0.9375rem] leading-relaxed'
								style={{ color: 'var(--st-muted)', maxWidth: '58ch' }}
							>
								In one sentence: invoices and transactions are co-located, not
								connected. The benefit is that they are in the same app. It is
								not an automatic reconciliation, and calling it one would be a
								lie.
							</p>
						</div>
					</div>
				</div>
			</section>

			<section className='st-section' aria-labelledby='who-heading'>
				<div className='st-shell'>
					<div className='st-split'>
						<SectionHead id='who-heading' heading='Who this is actually for' />
						<div>
							<p className='st-body-text' style={{ color: 'var(--st-body)' }}>
								Anyone who invoices somebody occasionally and also wants to know
								where their money goes — a side project, freelance work, a small
								practice. If you invoice fifty clients a month you want
								dedicated billing software, and you should use it.
							</p>
							<p className='mt-6'>
								<Link href='/features' className='st-link'>
									The rest of the app
								</Link>
							</p>
						</div>
					</div>
				</div>
			</section>

			<StatementCTA heading='Send your first invoice in minutes.' />
		</>
	);
}
