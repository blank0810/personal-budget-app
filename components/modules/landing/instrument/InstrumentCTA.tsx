import Link from 'next/link';

/**
 * InstrumentCTA — the closing band, shared by every public route.
 *
 * The rest of the page spends the accent sparingly. Here it takes the
 * whole surface: one band, square edges, no gradient and no rounded
 * card. It is the page's only raised voice and it lands on the ask.
 */
export function InstrumentCTA({
	heading,
	note = 'Free to start. No credit card, no bank connection, no ads.',
}: {
	heading: string;
	note?: string;
}) {
	return (
		<section className='close section' aria-label='Get started'>
			<div className='shell split'>
				<h2>{heading}</h2>
				<div>
					<p>{note}</p>
					<div className='btn-row'>
						<Link href='/register' className='btn btn--dark btn--lg'>
							Create your free account
						</Link>
					</div>
				</div>
			</div>
		</section>
	);
}
