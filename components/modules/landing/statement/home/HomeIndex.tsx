import { SectionHead } from '../SectionHead';

/**
 * The shipped feature set, set as a ruled index rather than a grid of
 * identical icon-topped cards. Everything listed here is live today;
 * anything unbuilt lives in its own future-tense section.
 */
const ENTRIES = [
	{
		title: 'Envelope budgets',
		body: 'Assign the month before it starts, by category. Every transaction you log moves the envelope, so "what is left" is a fact rather than an estimate.',
	},
	{
		title: 'Unified transactions',
		body: 'Income, expenses, transfers between your own accounts, and payments toward a liability — one table, one filter set, one place to look.',
	},
	{
		title: 'Accounts and ledgers',
		body: 'Cash, bank, savings, credit and loan accounts tracked together, each with its own running ledger and balance.',
	},
	{
		title: 'Savings goals',
		body: 'Link a goal to the account that actually holds the money. Progress is read from the balance, not typed in by hand.',
	},
	{
		title: 'CSV import with undo',
		body: 'Map your bank’s columns once. Likely duplicates are flagged before they land, and the whole batch can be rolled back in a single action.',
	},
	{
		title: 'Reports and monthly digest',
		body: 'Category and account breakdowns, PDF export, and a monthly summary emailed to you if you want it. Unsubscribe in one click.',
	},
];

export function HomeIndex() {
	return (
		<section className='st-section st-sunk' aria-labelledby='index-heading'>
			<div className='st-shell'>
				<div className='st-split'>
					<SectionHead id='index-heading' heading='What you get, in full.'>
						<p>
							No tiered feature table, no asterisks. This is everything that
							ships today.
						</p>
					</SectionHead>

					<div className='st-index'>
						{ENTRIES.map((entry) => (
							<article key={entry.title} className='st-index-item'>
								<h3 className='st-h3'>{entry.title}</h3>
								<p
									className='text-[1rem] leading-relaxed'
									style={{ color: 'var(--st-body)', maxWidth: '58ch' }}
								>
									{entry.body}
								</p>
							</article>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
