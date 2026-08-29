import type { ReactNode } from 'react';

/**
 * Ledger — the recurring object of the public system, used everywhere a
 * card grid would otherwise appear. Hairline-separated rows of label,
 * note and an optional right-aligned reading. It mirrors the
 * authenticated app's Health Ledger so the marketing surface and the
 * product describe money with the same shape.
 */
export function Ledger({
	children,
	className = '',
}: {
	children: ReactNode;
	className?: string;
}) {
	return <div className={`ledger ${className}`}>{children}</div>;
}

export function LedgerRow({
	label,
	note,
	reading,
}: {
	label: string;
	note?: ReactNode;
	reading?: ReactNode;
}) {
	return (
		<div className={reading ? 'row row--3' : 'row'}>
			<h3>{label}</h3>
			{note ? <p>{note}</p> : <span />}
			{reading ? <span className='fig'>{reading}</span> : null}
		</div>
	);
}

/**
 * Steps — a genuine ordered sequence, which is why it is numbered.
 * Numbers appear on this site only where the order carries information
 * the reader needs, never as decorative section markers.
 */
export function Steps({
	items,
}: {
	items: readonly { title: string; body: ReactNode; meta?: string }[];
}) {
	return (
		<ol className='steps'>
			{items.map((step, i) => (
				<li key={step.title}>
					<span className='n' aria-hidden='true'>
						{String(i + 1).padStart(2, '0')}
					</span>
					<div>
						<h3>{step.title}</h3>
						<p>{step.body}</p>
						{step.meta ? (
							<p className='micro' style={{ marginTop: '.75rem' }}>
								{step.meta}
							</p>
						) : null}
					</div>
				</li>
			))}
		</ol>
	);
}
