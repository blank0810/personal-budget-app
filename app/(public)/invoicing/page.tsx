import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/modules/landing/instrument/PageHero';
import { Split } from '@/components/modules/landing/instrument/SectionHead';
import { Ledger, LedgerRow, Steps } from '@/components/modules/landing/instrument/Ledger';
import { InstrumentCTA } from '@/components/modules/landing/instrument/InstrumentCTA';
import { APP_URL } from '@/lib/url';

export const metadata: Metadata = {
	title: 'Client Invoicing — Send & Track Invoices',
	description:
		'Send polished invoices by email, export to PDF, and share payment links. Log payments in the same app where you track your budget. Free to start.',
	alternates: { canonical: '/invoicing' },
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
 * /invoicing — everything described here is SHIPPED.
 *
 * Honesty: no "auto-sync" or "closed-loop" language. The workflow
 * section states outright that logging the payment is a manual step,
 * because an earlier version of this page implied otherwise.
 *
 * JSON-LD: WebPage only — the layout emits WebApplication + Organization.
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
	['Business identity', 'Your business name, address, tax ID and payment instructions are stored once and applied to every invoice you issue.'],
	['Saved clients', 'A client list, so billing the same person next month does not mean retyping their details.'],
	['PDF invoices', 'Line items, totals and your identity block rendered to a PDF you can download or archive.'],
	['Email delivery', 'Send the invoice to the client from inside the app instead of exporting and attaching it yourself.'],
	['Payment details and QR', 'Attach your payout methods and a QR code so the client can pay without a follow-up message asking how.'],
] as const;

const STEPS = [
	{ title: 'Issue the invoice', body: 'Pick a client, add line items, send it or export the PDF.' },
	{ title: 'The client pays you', body: 'Through whatever method you put on the invoice — bank transfer, e-wallet, cash. Budget Planner is not in the middle of this and never touches the money.' },
	{ title: 'You log the payment', body: 'Record it as income against the account it landed in. This is a step you take; nothing marks itself paid on its own.' },
	{ title: 'It shows up everywhere else', body: 'That income now counts toward your cash flow, your savings rate, and your health score, in the same app.' },
] as const;

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

			<Split
				heading='What ships today'
				headingId='capabilities'
				intro='All of this works now. Nothing on this page is a plan.'
			>
				<Ledger>
					{CAPABILITIES.map(([label, note]) => (
						<LedgerRow key={label} label={label} note={note} />
					))}
				</Ledger>
			</Split>

			<Split
				heading='How the money actually moves'
				headingId='workflow'
				intro='Worth being exact, because it would be easy to imply more than is true.'
				band
			>
				<Steps items={STEPS} />
				<p className='fine' style={{ marginTop: '1.5rem' }}>
					In one sentence: invoices and transactions are co-located, not
					connected. The benefit is that they are in the same app. It is not an
					automatic reconciliation, and calling it one would be a lie.
				</p>
			</Split>

			<Split heading='Who this is actually for' headingId='who'>
				<div className='prose'>
					<p>
						Anyone who invoices somebody occasionally and also wants to know where
						their money goes — a side project, freelance work, a small practice.
						If you invoice fifty clients a month you want dedicated billing
						software, and you should use it.
					</p>
				</div>
				<p style={{ marginTop: '1.5rem' }}>
					<Link href='/features' className='link'>
						The rest of the app
					</Link>
				</p>
			</Split>

			<InstrumentCTA heading='Send your first invoice in minutes.' />
		</>
	);
}
