import Link from 'next/link';
import { PageHero } from '@/components/modules/landing/instrument/PageHero';
import { Split } from '@/components/modules/landing/instrument/SectionHead';
import { Ledger, LedgerRow } from '@/components/modules/landing/instrument/Ledger';
import { Gauge } from '@/components/modules/landing/instrument/Gauge';
import { Shot } from '@/components/modules/landing/instrument/Shot';
import { InstrumentCTA } from '@/components/modules/landing/instrument/InstrumentCTA';

/**
 * Home (/) — "Instrument" design, STATIC server component.
 *
 * The shared nav and footer live in app/(public)/layout.tsx; this page
 * renders only the body. PageHero carries the page's single <h1>
 * (server-rendered, never animated, it is the LCP element); every
 * section below uses <h2>, so heading order stays valid.
 *
 * Narrative: the reading → how it is produced → the running product →
 * the differentiator → what it costs → what is not built → the ask.
 * Nothing unbuilt is claimed in the present tense.
 *
 * No page-level metadata export — inherits the layout default (home
 * title + canonical '/'). No auth() — kept static for SEO.
 */
export default function HomePage() {
	return (
		<>
			<PageHero
				heading='An instrument for your own money.'
				lead='You log what moves. It reads five pillars of your finances and returns one calibrated score out of 100 — measured from your own entries, never estimated from a bank feed.'
				aside={<Gauge />}
				spec={[
					{ value: '0', label: 'Bank connections' },
					{ value: '5', label: 'Weighted pillars' },
					{ value: '₱0', label: 'To start' },
				]}
			/>

			<Split
				heading='Calibrated on what you enter'
				headingId='calibrated'
				intro='No bank credentials, no aggregator holding a token to your account. You do the logging — that is the cost, and the reading is exact because of it.'
			>
				<Ledger>
					<LedgerRow
						label='Envelope budgets'
						note='A limit per category per month. Logged expenses move the envelope, so “what is left” is read from your ledger rather than estimated.'
					/>
					<LedgerRow
						label='Unified transactions'
						note='Income, expenses, transfers between your own accounts, and payments toward a liability — one table, one filter set.'
					/>
					<LedgerRow
						label='Savings goals'
						note='Link a goal to the account that holds the money. Progress comes from the balance, so it cannot drift.'
					/>
					<LedgerRow
						label='CSV import with undo'
						note='Map your bank’s columns once. Duplicates flagged before they land, whole batch reversible in one action.'
					/>
				</Ledger>
			</Split>

			<Split
				heading='The instrument itself'
				headingId='product'
				intro='A real screenshot on a demo account. The month is in deficit and the first line of the dashboard says so.'
				band
			>
				<Shot
					slug='dashboard'
					alt='Budget Planner dashboard showing a net worth of ₱204,440, a Fair 67 out of 100 health score, and the Health Ledger grading Solvency, Liquidity, Savings, Debt Management and Cash Flow.'
					caption='One verdict, five graded pillars'
					surface='Dashboard'
				/>
				<div className='shot-grid' style={{ marginTop: '1rem' }}>
					<Shot
						slug='budgets'
						alt='Envelope budgets for August with Rent fully spent, Dining Out ₱560 over, and Transport ₱3,550 over their limits.'
						caption='Including the ones you blew'
						surface='Budgets'
						sizes='(min-width: 56rem) 50vw, 100vw'
					/>
					<Shot
						slug='transactions'
						alt='The unified transactions table listing expenses with amount, account, category and date.'
						caption='Every type in one table'
						surface='Transactions'
						sizes='(min-width: 56rem) 50vw, 100vw'
					/>
				</div>
			</Split>

			<Split
				heading='Bill a client in the same app'
				headingId='invoicing'
				intro={
					<>
						Budgeting tools do not invoice. Invoicing tools do not budget.{' '}
						<Link href='/invoicing' className='link'>
							More on invoicing
						</Link>
						.
					</>
				}
			>
				<Ledger>
					<LedgerRow
						label='Business identity'
						note='Your business name, address, tax ID and payment instructions, set once and applied to every invoice.'
					/>
					<LedgerRow
						label='PDF and email'
						note='Send an invoice from the app, or export the PDF and send it yourself.'
					/>
					<LedgerRow
						label='Logging the payment'
						note='When the money lands you record it as income. A deliberate step, not a background sync.'
					/>
				</Ledger>
				<p className='fine' style={{ marginTop: '1.5rem' }}>
					To be exact: invoices and transactions are co-located, not connected.
					Nothing marks itself paid behind your back.
				</p>
			</Split>

			<Split heading='Free to start' headingId='price' band>
				<p className='lead' style={{ marginTop: 0 }}>
					Everything on this page is free right now, with no credit card and no
					trial clock.
				</p>
				<div className='prose' style={{ marginTop: '1rem' }}>
					<p>
						We won&rsquo;t say &ldquo;free forever&rdquo;, because the AI advisor
						may cost money to run and we would rather not make a promise we might
						have to walk back. Any change gets announced on the changelog first.
					</p>
				</div>
				<p style={{ marginTop: '1.5rem' }}>
					<Link href='/pricing' className='link'>
						Full pricing
					</Link>
				</p>
			</Split>

			<Split heading='One thing that isn&rsquo;t built yet' headingId='advisor'>
				<span className='marker'>In development</span>
				<p className='lead'>
					An AI advisor that will read your own transactions and answer questions
					about them in plain language.
				</p>
				<div className='prose' style={{ marginTop: '1rem' }}>
					<p>
						It is not live. There is a non-interactive preview on the dashboard so
						you can see the shape of it, and that is all it is today.
					</p>
				</div>
				<p style={{ marginTop: '1.5rem' }}>
					<Link href='/ai-advisor' className='link'>
						What it will do
					</Link>
				</p>
			</Split>

			<InstrumentCTA heading='Take a reading.' />
		</>
	);
}
