'use client';

import { useEffect, useRef } from 'react';

/**
 * Rule — the system's hairline separator, drawn left-to-right the first
 * time it scrolls into view.
 *
 * Deliberate constraint: only the RULE animates. The content a rule
 * separates always ships visible, so a background tab, a headless
 * renderer, or a failed hydration can never blank a section — the
 * failure mode of class-gated scroll reveals.
 *
 * Observer is disconnected the moment it fires; nothing keeps running.
 */
export function Rule({ className = '' }: { className?: string }) {
	const ref = useRef<HTMLHRElement>(null);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			el.dataset.draw = 'done';
			return;
		}

		const io = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					el.dataset.draw = 'done';
					io.disconnect();
				}
			},
			{ rootMargin: '0px 0px -12% 0px' },
		);

		io.observe(el);
		return () => io.disconnect();
	}, []);

	return (
		<hr
			ref={ref}
			data-draw='pending'
			className={`st-rule-line ${className}`}
			aria-hidden='true'
		/>
	);
}
