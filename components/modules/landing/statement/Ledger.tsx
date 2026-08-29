import type { ReactNode } from 'react';

/**
 * Ledger — the recurring object of the public design system, used
 * everywhere a card grid would otherwise appear.
 *
 * A ledger is a stack of hairline-separated rows: label, note, and an
 * optional right-aligned reading. It mirrors the authenticated app's
 * Health Ledger so the marketing surface and the product describe
 * money with the same shape.
 *
 * Server component — no interactivity, no JS shipped.
 */
export function Ledger({
	children,
	className = '',
}: {
	children: ReactNode;
	className?: string;
}) {
	return <div className={`st-ledger ${className}`}>{children}</div>;
}

export function LedgerRow({
	label,
	note,
	reading,
	index,
}: {
	label: string;
	note?: ReactNode;
	reading?: ReactNode;
	/** Row ordinal — drives the meter's entrance cascade via --row. */
	index?: number;
}) {
	return (
		<div
			className='st-ledger-row'
			style={index === undefined ? undefined : ({ '--row': index } as React.CSSProperties)}
		>
			<div className='st-ledger-label'>{label}</div>
			{note ? <p className='st-ledger-note'>{note}</p> : <span />}
			{reading ? <div className='st-ledger-value'>{reading}</div> : null}
		</div>
	);
}

/**
 * Meter — a five-segment grade bar.
 *
 * Colour is never the only signal: the caller always renders the grade
 * letter or a text value alongside, and the meter itself carries an
 * accessible name so a screen reader hears the reading rather than
 * five anonymous boxes.
 */
export function Meter({ filled, label }: { filled: number; label: string }) {
	const on = Math.max(0, Math.min(5, Math.round(filled)));

	return (
		<span className='st-meter' role='img' aria-label={`${label}: ${on} of 5`}>
			{[0, 1, 2, 3, 4].map((i) => (
				<span
					key={i}
					className='st-meter-seg'
					data-on={i < on}
					style={{ '--i': i } as React.CSSProperties}
				/>
			))}
		</span>
	);
}
