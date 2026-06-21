'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { m, useReducedMotion, type Variants } from 'motion/react';
import { IncomeTimeline } from './ui/IncomeTimeline';
import { useMounted } from './ui/use-mounted';

/**
 * LandingHero — ported from PreviewHero (landing-preview/client.tsx).
 *
 * LCP rule: the <h1> and subhead are plain SSR HTML at opacity:1 —
 * they are NEVER wrapped in motion / animated from opacity:0.
 *
 * Hydration rule: any branch on useReducedMotion() is gated behind
 * useMounted() so SSR === first client render (byte-identical markup).
 */
export function LandingHero() {
	const mounted        = useMounted();
	const prefersReduced = useReducedMotion(); // always called; only READ after mount

	// Variants defined unconditionally — hook count never changes.
	// Before mount (SSR + first paint): both states are opacity:1, no transform.
	// After mount: real animation values kick in.
	const slideUp = (delay: number): Variants =>
		!mounted
			? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
			: prefersReduced
			? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.2, delay } } }
			: {
					hidden: { opacity: 0, y: 16 },
					visible: { opacity: 1, y: 0, transition: { duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] } },
			  };

	const slideLeft: Variants =
		!mounted
			? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
			: prefersReduced
			? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.2, delay: 0.1 } } }
			: {
					hidden: { opacity: 0, x: -24 },
					visible: { opacity: 1, x: 0, transition: { duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] } },
			  };

	return (
		<section className='relative overflow-hidden pb-16 pt-[112px]'>
			{/* Quiet directional gradient */}
			<div
				aria-hidden='true'
				className='pointer-events-none absolute inset-0'
				style={{
					background:
						'radial-gradient(ellipse 70% 50% at 85% -5%, oklch(0.82 0.14 75 / 9%), transparent 60%),' +
						'radial-gradient(ellipse 55% 65% at 5% 110%, oklch(0.7 0.16 155 / 10%), transparent 60%)',
				}}
			/>
			{/* Noise grain */}
			<div className='l-noise-overlay' aria-hidden='true' />

			<div className='relative mx-auto max-w-[1184px] px-6 md:px-10 xl:px-12'>
				<div className='grid grid-cols-1 items-start gap-10 lg:grid-cols-[52fr_48fr] lg:gap-16'>

					{/* Left: Copy */}
					<div className='flex flex-col items-start pt-2'>
						<m.p
							variants={slideUp(0)}
							initial='hidden'
							animate='visible'
							className='text-[11px] font-semibold uppercase tracking-[0.12em] text-l-text-3'
						>
							Personal budgeting &amp; tracking
						</m.p>

						{/* H1 — plain SSR, opacity:1, LCP, NEVER animated */}
						<h1 className='mt-4 text-[46px] font-bold leading-[1.0] tracking-[-0.035em] text-l-text-1 sm:text-[56px] lg:text-[66px] lg:tracking-[-0.04em]'>
							Know exactly where your money goes.
						</h1>

						{/* Subhead — plain SSR, opacity:1, NEVER animated */}
						<p className='mt-5 max-w-[48ch] text-[17px] leading-[1.65] text-l-text-2'>
							Set a budget for every category, track every transaction, and
							reach your savings goals. No bank linking — you log it, you own
							it. Free to start.
						</p>

						<m.div
							variants={slideUp(0.14)}
							initial='hidden'
							animate='visible'
							className='mt-8 flex flex-wrap items-center gap-3'
						>
							<Link
								href='/register'
								className='inline-flex items-center justify-center rounded-full bg-l-accent px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-l-accent/90'
							>
								Start free
							</Link>
							<Link
								href='/features'
								className='group inline-flex items-center gap-1.5 text-base font-medium text-l-text-3 transition-colors hover:text-l-text-1'
							>
								See all features
								<ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-0.5' aria-hidden='true' />
							</Link>
						</m.div>

						<m.div
							variants={slideUp(0.25)}
							initial='hidden'
							animate='visible'
							className='mt-7 border-t border-l-border pt-5'
						>
							<p className='text-sm text-l-text-4'>
								No bank linking required&ensp;&middot;&ensp;You log it, you own it&ensp;&middot;&ensp;Free to start
							</p>
						</m.div>
					</div>

					{/* Right: IncomeTimeline — frameless on desktop */}
					<m.div
						variants={slideLeft}
						initial='hidden'
						animate='visible'
						className='flex flex-col gap-5 lg:pt-8'
					>
						<IncomeTimeline />
					</m.div>
				</div>
			</div>
		</section>
	);
}
