'use client';

import { m, useReducedMotion, type Variants } from 'motion/react';
import { useMounted } from '@/components/modules/landing/ui/use-mounted';

interface LagoonRevealProps {
	children: React.ReactNode;
	delay?: number;
	className?: string;
	as?: 'div' | 'section' | 'li';
}

/**
 * LagoonReveal — scroll-triggered reveal, transform-only.
 *
 * Rules (same philosophy as StillWaterFadeUp):
 * - SSR / !mounted : y: 0, no animation — content always visible
 * - reduced motion : y: 0, no animation
 * - normal         : y: 20 → y: 0 on viewport entry (opacity stays 1)
 *
 * Never hides content via opacity, so sections are never blank on SSR.
 */
export function LagoonReveal({
	children,
	delay = 0,
	className,
	as = 'div',
}: LagoonRevealProps) {
	const mounted = useMounted();
	const prefersReduced = useReducedMotion();

	const variants: Variants =
		!mounted || prefersReduced
			? { hidden: { y: 0 }, visible: { y: 0 } }
			: {
					hidden: { y: 20 },
					visible: {
						y: 0,
						transition: { duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] },
					},
				};

	const Tag = m[as] as typeof m.div;

	return (
		<Tag
			variants={variants}
			initial='hidden'
			whileInView='visible'
			viewport={{ once: true, margin: '-60px' }}
			className={className}
		>
			{children}
		</Tag>
	);
}
