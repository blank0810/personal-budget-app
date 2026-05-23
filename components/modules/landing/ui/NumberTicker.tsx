'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';

/**
 * NumberTicker — counts from 0 to `value` once, when it scrolls into view
 * (IntersectionObserver). ease-out cubic, ~1.1s. Formats with thousands
 * separators and an optional prefix (e.g. "₱"). No deps beyond rAF.
 *
 * Reduced motion: renders the final value immediately, no animation.
 */
export function NumberTicker({
	value,
	prefix = '',
	durationMs = 1100,
	className,
}: {
	value: number;
	prefix?: string;
	durationMs?: number;
	className?: string;
}) {
	const prefersReduced = useReducedMotion();
	const ref = useRef<HTMLSpanElement>(null);
	const started = useRef(false);
	const [display, setDisplay] = useState(0);

	useEffect(() => {
		if (prefersReduced) {
			setDisplay(value);
			return;
		}
		const el = ref.current;
		if (!el) return;

		const io = new IntersectionObserver(
			(entries) => {
				if (!entries[0]?.isIntersecting || started.current) return;
				started.current = true;
				io.disconnect();

				const start = performance.now();
				const step = (now: number) => {
					const t = Math.min((now - start) / durationMs, 1);
					const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
					setDisplay(Math.round(value * eased));
					if (t < 1) requestAnimationFrame(step);
				};
				requestAnimationFrame(step);
			},
			{ threshold: 0.5 },
		);
		io.observe(el);
		return () => io.disconnect();
	}, [value, durationMs, prefersReduced]);

	return (
		<span ref={ref} className={className}>
			{prefix}
			{display.toLocaleString('en-US')}
		</span>
	);
}
