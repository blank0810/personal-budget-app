import Link from 'next/link';
import { Ledger, LedgerRow } from '../Ledger';
import { SectionHead } from '../SectionHead';

/**
 * Invoicing — the honest differentiator: billing and budgeting in one
 * app. The copy is careful about what that does and does not mean. The
 * two are co-located, NOT auto-synced; you log the payment yourself.
 * Overstating this was an explicit past mistake (PRODUCT.md).
 */
export function HomeInvoicing() {
	return (
		<section className='st-section st-sunk' aria-labelledby='invoicing-heading'>
			<div className='st-shell'>
				<div className='st-split'>
					<SectionHead
						id='invoicing-heading'
						heading='Bill a client in the same app you budget in.'
					>
						<p>
							Budgeting apps don&rsquo;t invoice. Invoicing tools don&rsquo;t
							budget. Doing both means one login instead of two.
						</p>
						<p className='mt-4'>
							<Link href='/invoicing' className='st-link'>
								More on invoicing
							</Link>
						</p>
					</SectionHead>

					<div>
						<Ledger>
							<LedgerRow
								label='Business identity'
								note='Your business name, address, tax ID and payment instructions, set once and applied to every invoice.'
							/>
							<LedgerRow
								label='PDF and email'
								note='Send an invoice straight from the app or export the PDF and send it yourself.'
							/>
							<LedgerRow
								label='Payment details'
								note='Attach your payout methods and a QR code so a client can pay without asking you how.'
							/>
							<LedgerRow
								label='Logging the payment'
								note='When the money lands, you record it as income against an account. It is a deliberate step, not a background sync.'
							/>
						</Ledger>

						<p
							className='mt-6 text-[0.9375rem] leading-relaxed'
							style={{ color: 'var(--st-muted)', maxWidth: '58ch' }}
						>
							To be exact about it: invoices and transactions live side by side,
							they are not wired together. Nothing marks itself paid behind your
							back.
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}
