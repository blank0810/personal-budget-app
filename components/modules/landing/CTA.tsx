'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { MotionReveal } from './ui/MotionReveal';
import { IncomeTimeline } from './ui/IncomeTimeline';

/**
 * FinalCTA (master IA §12).
 *
 * Raw dark surface. No GradientMeshBg, no blobs, no pill buttons.
 * Heading is huge (clamp 56→108px), left-aligned. Mini income timeline
 * anchors the bottom-left; underline-style CTA action is on the right.
 *
 * HONESTY: no AI mention, no invoicing mention. Headline is plain SSR
 * (inside MotionReveal — not LCP, so wrapping is safe).
 */
export function FinalCTA() {
	return (
		<section
			className='relative overflow-hidden py-24 sm:py-28'
			style={{ backgroundColor: 'oklch(0.13 0.014 264)' }}
		>
			{/* Noise grain, same as hero */}
			<div className='l-noise-overlay' aria-hidden='true' />

			{/* Very faint hairline top rule */}
			<div
				aria-hidden='true'
				className='pointer-events-none absolute inset-x-0 top-0 h-px'
				style={{ background: 'oklch(1 0 0 / 8%)' }}
			/>

			<div className='relative mx-auto max-w-[1184px] px-6 md:px-10 xl:px-12'>

				{/* Oversized heading — left-aligned, near-full-width */}
				<MotionReveal>
					<h2
						className='font-bold leading-[0.95] tracking-[-0.04em] text-l-text-1'
						style={{ fontSize: 'clamp(56px, 8vw, 108px)' }}
					>
						Start free.
						<br />
						<span className='text-l-accent'>
							Know exactly
						</span>
						<br />
						where your money goes.
					</h2>
				</MotionReveal>

				{/* Two-col: timeline left, CTA right */}
				<div className='mt-14 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-end lg:gap-16'>

					{/* Left: mini timeline as brand anchor */}
					<div>
						<p className='mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-l-text-4'>
							The budgeting app is here now. No waitlist, no card.
						</p>
						<IncomeTimeline compact />
					</div>

					{/* Right: action block */}
					<div className='flex flex-col items-start gap-6'>
						<Link
							href='/register'
							className='group inline-flex items-center gap-3 rounded-none border-b-2 border-l-accent pb-1 text-[22px] font-bold text-l-accent transition-all hover:gap-5 sm:text-[28px]'
						>
							Start free
							<ArrowRight className='h-6 w-6 transition-transform group-hover:translate-x-1' aria-hidden='true' />
						</Link>
						<p className='text-sm text-l-text-4'>
							Free to start · No credit card · Your data is yours
						</p>
						<Link
							href='/features'
							className='text-sm text-l-text-4 underline underline-offset-4 transition-colors hover:text-l-text-2'
						>
							See everything that ships today
						</Link>
					</div>
				</div>
			</div>
		</section>
	);
}
