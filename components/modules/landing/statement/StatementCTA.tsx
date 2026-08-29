import Link from 'next/link';

/**
 * StatementCTA — the closing band, shared by every public route.
 *
 * The rest of the site spends the signal colour at roughly a tenth of
 * the surface. Here it takes the whole thing: one drenched band, square
 * edges, no gradient, no rounded card. It is the page's only raised
 * voice, and it lands on the ask.
 */
export function StatementCTA({
	heading,
	note = 'Free to start. No credit card, no bank connection, no ads.',
}: {
	heading: string;
	note?: string;
}) {
	return (
		<section className='st-cta st-section' aria-label='Get started'>
			<div className='st-shell'>
				<div className='st-split st-split--wide'>
					<h2 className='st-h2 max-w-[16ch]'>{heading}</h2>

					<div className='lg:pt-2'>
						<p className='st-lead st-cta-note'>{note}</p>

						<div className='mt-8 flex flex-wrap gap-3'>
							<Link href='/register' className='st-btn st-btn--inverse st-btn--lg'>
								Create your free account
							</Link>
							<Link
								href='/how-it-works'
								className='st-btn st-btn--inverse-ghost st-btn--lg'
							>
								See how it works
							</Link>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
