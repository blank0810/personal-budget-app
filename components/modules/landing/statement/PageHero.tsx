import type { ReactNode } from 'react';

/**
 * PageHero — the opening of every route other than home.
 *
 * Left-weighted, hairline-bottomed, no centring and no eyebrow label.
 * The optional `aside` takes the right column when a page has a fact
 * worth stating next to the headline rather than beneath it.
 */
export function PageHero({
	heading,
	lead,
	aside,
	children,
}: {
	heading: string;
	lead: string;
	aside?: ReactNode;
	children?: ReactNode;
}) {
	return (
		<section
			className='border-b pb-[clamp(2.75rem,5vw,4rem)] pt-[clamp(3rem,6vw,5rem)]'
			style={{ borderColor: 'var(--st-rule)' }}
		>
			<div className='st-shell'>
				<div
					className={
						aside
							? 'grid items-start gap-[clamp(2rem,4vw,4rem)] lg:grid-cols-[minmax(0,1fr)_minmax(17rem,22rem)]'
							: undefined
					}
				>
					<div>
						<h1 className='st-h2 max-w-[18ch]'>{heading}</h1>
						<p className='st-lead mt-6' style={{ color: 'var(--st-body)' }}>
							{lead}
						</p>
						{children}
					</div>

					{aside ? (
						<div
							className='border-t pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-1'
							style={{ borderColor: 'var(--st-rule)' }}
						>
							{aside}
						</div>
					) : null}
				</div>
			</div>
		</section>
	);
}
