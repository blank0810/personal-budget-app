'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { m, useReducedMotion, type Variants } from 'motion/react';
import { GradientMeshBg } from './ui/GradientMeshBg';

/**
 * FinalCTA (master IA §12).
 *
 * COMPOSITION (distinct, anti-uniformity): the dark CLOSING BOOKEND. It pairs
 * with the AI spotlight as the page's other deep-dark glowing moment: a
 * full-bleed `.l-section-dark` panel with a soft emerald glow field and a
 * single oversized `.l-h2` statement centered over it. One restated line of
 * the closed loop, a primary "Start free" pill (idle `.l-cta-pulse` ring,
 * disabled under reduced motion in landing.css) and a ghost route link.
 *
 * LINK FIX: the ghost link used to point at the same-page anchor
 * `#ai-advisor`, which no longer resolves on most routes (the AI section now
 * lives at its own route). It is now a real Next <Link> to `/ai-advisor`.
 *
 * HONESTY (PRODUCT.md): "Start free", AI framed as future. No em dashes.
 *
 * Motion: the block scales/rises in once on view; single useReducedMotion()
 * gate collapses to a plain fade. viewport once.
 */
export function FinalCTA() {
	const prefersReduced = useReducedMotion();

	const reveal: Variants = prefersReduced
		? {
				hidden: { opacity: 0 },
				visible: { opacity: 1, transition: { duration: 0.3 } },
		  }
		: {
				hidden: { opacity: 0, scale: 0.96 },
				visible: {
					opacity: 1,
					scale: 1,
					transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
				},
		  };

	return (
		<section className='l-section-dark relative overflow-hidden py-28 sm:py-32'>
			<GradientMeshBg variant='cta' />

			{/* Emerald glow + hairline top edge so the bookend reads deliberate,
			 * matching the AI spotlight's dark treatment. Decorative only. */}
			<div
				aria-hidden='true'
				className='pointer-events-none absolute inset-0'
				style={{
					background:
						'radial-gradient(ellipse 55% 65% at 50% 55%, oklch(0.82 0.13 155 / 16%), transparent 70%)',
				}}
			/>
			<div
				aria-hidden='true'
				className='pointer-events-none absolute inset-x-0 top-0 h-px'
				style={{
					background:
						'linear-gradient(90deg, transparent, oklch(0.82 0.13 155 / 35%), transparent)',
				}}
			/>

			<m.div
				variants={reveal}
				initial='hidden'
				whileInView='visible'
				viewport={{ once: true, amount: 0.4 }}
				className='relative mx-auto max-w-3xl px-6 text-center md:px-10'
			>
				<h2 className='l-h2'>
					Start free today.
					<br className='hidden sm:block' /> Be first to the AI.
				</h2>
				<p className='mx-auto mt-6 max-w-xl text-base leading-relaxed text-l-text-2 sm:text-lg'>
					Invoice your clients, watch that income flow into your
					budget, and reach your goals. All in one place, with an AI
					advisor on the way.
				</p>

				<div className='mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center'>
					<Link
						href='/register'
						className='l-cta-pulse inline-flex items-center justify-center rounded-full bg-l-accent px-8 py-3.5 text-base font-medium text-white shadow-sm transition-colors hover:bg-l-accent/90'
					>
						Start free
					</Link>
					<Link
						href='/ai-advisor'
						className='group inline-flex items-center justify-center gap-2 rounded-full border border-l-border bg-l-surface-1 px-6 py-3.5 text-base font-medium text-l-text-2 transition-colors hover:border-l-border-mid hover:text-l-text-1'
					>
						See what&apos;s coming
						<ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-0.5' />
					</Link>
				</div>

				<p className='mt-6 text-sm text-l-text-4'>
					Free to start. No credit card required.
				</p>
			</m.div>
		</section>
	);
}
