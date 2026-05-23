'use client';

import { m, useReducedMotion, type Variants } from 'motion/react';
import { cn } from '@/lib/utils';

/**
 * MotionReveal — reusable scroll-in reveal (design-system §7).
 * Reveals from { opacity: 0, y: 24 } → { opacity: 1, y: 0 } once.
 *
 * Uses `m.*` (not `motion.*`) — required inside the layout's
 * `<LazyMotion strict>`. A single `useReducedMotion()` gate flattens
 * the variant to an instant opacity-only state when motion is reduced.
 *
 * NEVER wrap the hero <h1>/subhead in this — those are LCP and must be
 * plain SSR at opacity:1 (master §4, design-system §4.1).
 */
export function MotionReveal({
	children,
	delay = 0,
	y = 24,
	className,
	as = 'div',
}: {
	children: React.ReactNode;
	delay?: number;
	y?: number;
	className?: string;
	as?: 'div' | 'span' | 'li' | 'section';
}) {
	const prefersReduced = useReducedMotion();

	const variants: Variants = prefersReduced
		? {
				hidden: { opacity: 0 },
				visible: { opacity: 1, transition: { duration: 0.2, delay } },
		  }
		: {
				hidden: { opacity: 0, y },
				visible: {
					opacity: 1,
					y: 0,
					transition: {
						duration: 0.6,
						delay,
						ease: [0.16, 1, 0.3, 1],
					},
				},
		  };

	const MotionTag = m[as];

	return (
		<MotionTag
			className={cn(className)}
			variants={variants}
			initial='hidden'
			whileInView='visible'
			viewport={{ once: true, amount: 0.3 }}
		>
			{children}
		</MotionTag>
	);
}
