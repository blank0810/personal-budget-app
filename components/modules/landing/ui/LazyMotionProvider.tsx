'use client';

import { LazyMotion, domAnimation } from 'motion/react';

/**
 * Thin client wrapper so the (public) layout (a server component that
 * exports `metadata`) can opt into Framer Motion's `LazyMotion`.
 *
 * `domAnimation` (not `domMax`) keeps the bundle lean (~18kB gzip).
 * `strict` forbids `motion.*` inside — landing components must use `m.*`.
 */
export function LazyMotionProvider({ children }: { children: React.ReactNode }) {
	return (
		<LazyMotion features={domAnimation} strict>
			{children}
		</LazyMotion>
	);
}
