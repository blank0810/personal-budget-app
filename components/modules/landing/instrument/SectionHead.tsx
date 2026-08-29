import type { ReactNode } from 'react';

/**
 * SectionHead — the left rail of the page's split grid. Every section
 * states its heading in a narrow rail and its substance in the wide
 * column beside it, which is what keeps the page off an endless centred
 * stack.
 */
export function SectionHead({
	heading,
	children,
	id,
}: {
	heading: string;
	children?: ReactNode;
	id?: string;
}) {
	return (
		<div className='rail'>
			<h2 id={id}>{heading}</h2>
			{children}
		</div>
	);
}

/** A section built on the rail + body split. */
export function Split({
	heading,
	headingId,
	intro,
	children,
	band = false,
}: {
	heading: string;
	headingId?: string;
	intro?: ReactNode;
	children: ReactNode;
	band?: boolean;
}) {
	return (
		<section
			className={band ? 'section band' : 'section'}
			aria-labelledby={headingId}
		>
			<div className='shell split'>
				<SectionHead heading={heading} id={headingId}>
					{intro ? <p>{intro}</p> : null}
				</SectionHead>
				<div>{children}</div>
			</div>
		</section>
	);
}
