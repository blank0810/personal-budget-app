import { Shot } from '../Shot';
import { SectionHead } from '../SectionHead';

/**
 * Real screenshots of the running app, taken from a neutral demo
 * account — not invented mockups, per PRODUCT.md. The numbers are
 * unflattering on purpose: the demo account is in deficit this month
 * and the dashboard says so.
 */
export function HomeSurfaces() {
	return (
		<section className='st-section' aria-labelledby='surfaces-heading'>
			<div className='st-shell'>
				<div className='st-split'>
					<SectionHead
						id='surfaces-heading'
						heading='The actual product.'
					>
						<p>
							Screenshots of the running app on a demo account, not
							illustrations of one. The month below is in deficit and the
							dashboard says so on the first line — that is the whole idea.
						</p>
					</SectionHead>

					<div className='flex flex-col gap-4'>
						<Shot
							slug='dashboard'
							alt='Budget Planner dashboard showing a net worth of ₱204,440, a Fair 67 out of 100 health score, and the Health Ledger grading Solvency, Liquidity, Savings, Debt Management and Cash Flow.'
							caption='One verdict, five graded pillars'
							surface='Dashboard'
						/>
						<Shot
							slug='budgets'
							alt='Envelope budgets for August with Rent fully spent, Dining Out ₱560 over, and Transport ₱3,550 over their limits.'
							caption='Envelopes, including the ones you blew'
							surface='Budgets'
						/>
					</div>
				</div>

				<div className='st-split mt-4'>
					<div />
					<div className='grid gap-4 lg:grid-cols-2'>
						<Shot
							slug='transactions'
							alt='The unified transactions table listing expenses with amount, account, category and date, filtered by type.'
							caption='Income, expense, transfer, payment'
							surface='Transactions'
							sizes='(min-width: 62rem) 50vw, 100vw'
						/>
						<Shot
							slug='reports'
							alt='Financial analytics with an income-versus-expense bar chart and a spending-by-category breakdown.'
							caption='Where it actually went'
							surface='Reports'
							sizes='(min-width: 62rem) 50vw, 100vw'
						/>
					</div>
				</div>
			</div>
		</section>
	);
}
