import type { ReactNode } from 'react';
import Link from 'next/link';

/**
 * PageHero — the opening of every public route.
 *
 * Left-weighted, hairline-bottomed, no centring and no announcement
 * badge. `aside` takes the right column when a page has a reading worth
 * putting beside the headline rather than beneath it.
 *
 * `as='h1'` on the home page only; sub-pages pass their own heading
 * level implicitly by always being the page's single h1.
 */
export function PageHero({
	heading,
	lead,
	aside,
	spec,
	actions = true,
	children,
}: {
	heading: string;
	lead: ReactNode;
	aside?: ReactNode;
	spec?: readonly { value: string; label: string }[];
	actions?: boolean;
	children?: ReactNode;
}) {
	const body = (
		<div>
			<h1>{heading}</h1>
			<p className='lead'>{lead}</p>

			{actions ? (
				<div className='btn-row'>
					<Link href='/register' className='btn btn--orange btn--lg'>
						Start for free
					</Link>
					<Link href='/how-it-works' className='btn btn--outline btn--lg'>
						See how it works
					</Link>
				</div>
			) : null}

			{spec ? (
				<div className='spec'>
					{spec.map((item) => (
						<div key={item.label}>
							<b>{item.value}</b>
							<span>{item.label}</span>
						</div>
					))}
				</div>
			) : null}

			{children}
		</div>
	);

	return (
		<section className='section section--tight hero'>
			<div className='shell'>
				{aside ? (
					<div className='hero-grid'>
						{body}
						{aside}
					</div>
				) : (
					body
				)}
			</div>
		</section>
	);
}
