import type { ReactNode } from 'react';

/**
 * SectionHead — the left rail of the page's split grid.
 *
 * Every section states its heading in a narrow rail and its substance in
 * the wide column beside it. That asymmetry is what keeps the page off
 * the endless centred stack, and it gives long-form sections a spine.
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
		<div className='lg:sticky lg:top-28'>
			<h2 id={id} className='st-h2'>
				{heading}
			</h2>
			{children ? (
				<div
					className='mt-5 text-[1rem] leading-relaxed'
					style={{ color: 'var(--st-body)' }}
				>
					{children}
				</div>
			) : null}
		</div>
	);
}
