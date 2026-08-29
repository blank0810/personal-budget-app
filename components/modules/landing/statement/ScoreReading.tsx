'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Meter } from './Ledger';
import { SAMPLE_LABEL, SAMPLE_PILLARS, SAMPLE_SCORE } from './sample-reading';

/** SSR-safe layout effect — avoids React's server warning. */
const useIsoLayoutEffect =
	typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** ease-out-expo, matching --st-ease. */
const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

const DURATION = 850;

/**
 * ScoreReading — the page's one signature motion: an instrument taking
 * a reading. The score settles from 0 to its value while the pillar
 * meters fill in a short stagger behind it.
 *
 * The server renders the FINAL number, so crawlers, no-JS visitors, and
 * the first paint all see a complete reading. The animation only starts
 * once mounted, and a layout effect sets the start value before the
 * browser paints, so nothing flashes.
 *
 * Honesty: this is one illustrative output of the scorer, labelled as a
 * sample on the face of the component. It is not a claim about users.
 */
export function ScoreReading() {
	const [shown, setShown] = useState(SAMPLE_SCORE);
	const [animating, setAnimating] = useState(false);
	const frame = useRef<number | null>(null);

	useIsoLayoutEffect(() => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		setShown(0);
		setAnimating(true);
	}, []);

	useEffect(() => {
		if (!animating) return;

		const started = performance.now();

		const tick = (now: number) => {
			const t = Math.min(1, (now - started) / DURATION);
			setShown(Math.round(easeOutExpo(t) * SAMPLE_SCORE));
			if (t < 1) frame.current = requestAnimationFrame(tick);
		};

		frame.current = requestAnimationFrame(tick);

		return () => {
			if (frame.current !== null) cancelAnimationFrame(frame.current);
		};
	}, [animating]);

	const progress = shown / 100;

	return (
		<div className={animating ? 'st-animate' : undefined}>
			<div className='flex items-baseline justify-between gap-4'>
				<span className='st-micro'>Sample reading</span>
				<span className='st-micro'>Weighted · 5 pillars</span>
			</div>

			<div className='mt-4 flex items-end gap-3'>
				<span className='st-score' aria-hidden='true'>
					{shown}
				</span>
				<span
					className='st-num pb-1 text-[1.05rem]'
					style={{ color: 'var(--st-muted)' }}
					aria-hidden='true'
				>
					/100
				</span>
				<span className='sr-only'>
					Sample financial health score: {SAMPLE_SCORE} out of 100, rated{' '}
					{SAMPLE_LABEL}.
				</span>

				<span
					className='ml-auto pb-1 text-[0.9375rem] font-semibold'
					style={{ color: 'var(--st-signal)' }}
				>
					{SAMPLE_LABEL}
				</span>
			</div>

			<div className='st-score-track mt-4' aria-hidden='true'>
				<span
					className='st-score-fill'
					style={{
						width: '100%',
						transform: `scaleX(${progress})`,
					}}
				/>
			</div>

			<dl className='mt-1'>
				{SAMPLE_PILLARS.map((pillar, i) => (
					<div
						key={pillar.name}
						className='flex items-center gap-4 border-b py-[0.6875rem]'
						style={{ borderColor: 'var(--st-rule)' }}
					>
						<dt className='min-w-0 flex-1'>
							<span
								className='block text-[0.9375rem] font-semibold leading-tight'
								style={{ color: 'var(--st-ink)' }}
							>
								{pillar.name}
							</span>
							<span
								className='block text-[0.8125rem] leading-snug'
								style={{ color: 'var(--st-muted)' }}
							>
								{pillar.question}
							</span>
						</dt>
						<dd
							className='st-num flex flex-none items-center gap-3 text-[0.875rem] font-semibold'
							style={{ color: 'var(--st-ink-2)' }}
						>
							<span style={{ '--row': i } as React.CSSProperties}>
								<Meter filled={pillar.segments} label={pillar.name} />
							</span>
							<span className='w-[1.25rem] text-right'>{pillar.grade}</span>
						</dd>
					</div>
				))}
			</dl>

			<p
				className='mt-4 text-[0.8125rem] leading-snug'
				style={{ color: 'var(--st-muted)' }}
			>
				Sample figures, shown to explain the output. Your score is computed from
				the transactions and balances you log — nothing is estimated from a bank
				feed.
			</p>
		</div>
	);
}
