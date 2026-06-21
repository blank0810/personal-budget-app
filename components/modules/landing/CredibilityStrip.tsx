'use client';

import { GitBranch, ShieldOff, MessagesSquare, Gift } from 'lucide-react';
import { m, useReducedMotion, type Variants } from 'motion/react';
import { useMounted } from './ui/use-mounted';

/**
 * CredibilityStrip — master IA §3.
 *
 * Honest signal chips ONLY. No metrics, no user counts, no fabricated
 * stats (PRODUCT.md honesty gate). A calm full-width band; the chips
 * fade/rise in once on view. Mercury-calm tone.
 *
 * Chips animate in (they sit below the fold and are not LCP). A single
 * useReducedMotion() gate flattens the stagger to instant opacity.
 */
const SIGNALS = [
	{ icon: GitBranch, label: 'Built in the open by a solo founder' },
	{ icon: ShieldOff, label: 'No ads. No data selling.' },
	{ icon: MessagesSquare, label: 'Public changelog and feature board' },
	{ icon: Gift, label: 'Free to start' },
];

export function CredibilityStrip() {
	const prefersReduced = useReducedMotion();
	const mounted = useMounted();

	const container: Variants = {
		hidden: {},
		visible: {
			transition: { staggerChildren: (mounted && prefersReduced) ? 0 : 0.08 },
		},
	};

	const chip: Variants = (mounted && prefersReduced)
		? {
				hidden: { opacity: 0 },
				visible: { opacity: 1, transition: { duration: 0.25 } },
		  }
		: {
				hidden: { opacity: 0, y: 10 },
				visible: {
					opacity: 1,
					y: 0,
					transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
				},
		  };

	return (
		<section
			aria-label='What you can count on'
			className='border-y border-l-border bg-l-surface-1'
		>
			<m.ul
				variants={container}
				initial='hidden'
				whileInView='visible'
				viewport={{ once: true, amount: 0.4 }}
				className='mx-auto flex max-w-[1184px] flex-wrap items-center justify-center gap-x-3 gap-y-3 px-6 py-7 md:gap-x-5 md:px-10 xl:px-12'
			>
				{SIGNALS.map(({ icon: Icon, label }) => (
					<m.li
						key={label}
						variants={chip}
						className='inline-flex items-center gap-2 rounded-full border border-l-border bg-l-bg px-4 py-2 text-sm font-medium text-l-text-2'
					>
						<Icon
							className='h-4 w-4 text-l-accent'
							aria-hidden='true'
						/>
						{label}
					</m.li>
				))}
			</m.ul>
		</section>
	);
}
