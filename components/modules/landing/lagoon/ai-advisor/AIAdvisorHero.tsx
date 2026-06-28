'use client';

import Link from 'next/link';
import { m, useReducedMotion, type Variants } from 'motion/react';
import { useMounted } from '@/components/modules/landing/ui/use-mounted';

/**
 * AIAdvisorHero — above-fold section for /ai-advisor.
 *
 * HONESTY (hard gate): the AI Advisor is NOT live. Every line is future-tense.
 * The "In development" badge + the trust-strip note reinforce this before
 * the user reads any body copy.
 *
 * LCP h1 is plain SSR (never inside a motion wrapper, never opacity:0).
 * Badge, subhead, CTAs, and trust strip entrance-animate after mount — gated
 * behind useMounted() so SSR renders them at opacity:1.
 *
 * Client component for motion only.
 */
export function AIAdvisorHero() {
	const mounted = useMounted();
	const prefersReduced = useReducedMotion();
	const shouldAnimate = mounted && !prefersReduced;

	const enter = (fromY: number, delay: number): Variants =>
		!shouldAnimate
			? { hidden: { y: 0, opacity: 1 }, visible: { y: 0, opacity: 1 } }
			: {
					hidden: { y: fromY, opacity: 0 },
					visible: {
						y: 0,
						opacity: 1,
						transition: { duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] },
					},
				};

	return (
		<section
			className='lagoon-grid-overlay relative overflow-hidden pb-16 pt-[128px] md:pb-24 md:pt-[160px]'
			style={{ background: 'var(--lagoon-canvas)' }}
			aria-label='AI Budget Advisor hero'
		>
			<div className='lagoon-hero-glow' aria-hidden='true' />

			<div className='relative z-10 mx-auto max-w-[1184px] px-6 text-center md:px-10'>
				{/* "In development" badge — immediately communicates status */}
				<m.div
					variants={enter(-10, 0)}
					initial='hidden'
					animate='visible'
					className='inline-flex flex-wrap items-center justify-center gap-2'
				>
					<span
						className='inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.08em]'
						style={{
							borderColor: 'var(--lagoon-accent-border)',
							background: 'var(--lagoon-accent-bg)',
							color: 'var(--lagoon-accent-strong)',
						}}
					>
						<span
							aria-hidden='true'
							className='h-1.5 w-1.5 rounded-full'
							style={{ background: 'var(--lagoon-accent)' }}
						/>
						AI Budget Advisor
					</span>
					{/* Status pill — visually distinct from the feature badge */}
					<span
						className='rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em]'
						style={{
							borderColor: 'var(--lagoon-border)',
							background: 'var(--lagoon-surface)',
							color: 'var(--lagoon-ink-3)',
						}}
					>
						In development — not yet available
					</span>
				</m.div>

				{/* LCP h1 — plain SSR, always visible, never animated */}
				<h1
					className='lagoon-hero-title mx-auto mt-6 max-w-[860px]'
					style={{
						color: 'var(--lagoon-ink)',
						fontFamily: 'var(--lagoon-font-heading, inherit)',
					}}
				>
					An advisor that actually{' '}
					<span style={{ color: 'var(--lagoon-accent)' }}>reads your numbers.</span>
				</h1>

				{/* Subhead — future-tense throughout */}
				<m.p
					variants={enter(12, 0.1)}
					initial='hidden'
					animate='visible'
					className='mx-auto mt-6 max-w-[52ch] text-[17px] leading-[1.7] md:mt-7'
					style={{ color: 'var(--lagoon-body)' }}
				>
					We are building an AI assistant that will read your transaction data,
					your budget history, and your savings goals — then answer the money
					questions you actually ask. Not generic advice. Your numbers.
				</m.p>

				{/* CTAs */}
				<m.div
					variants={enter(12, 0.18)}
					initial='hidden'
					animate='visible'
					className='mt-8 flex flex-wrap items-center justify-center gap-3 md:mt-10'
				>
					<Link
						href='/register'
						className='inline-flex h-12 items-center gap-2 rounded-full px-8 text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2'
						style={{ background: 'var(--lagoon-accent)', color: 'var(--lagoon-on-accent)' }}
						onMouseEnter={(e) =>
							((e.currentTarget as HTMLElement).style.background =
								'var(--lagoon-accent-strong)')
						}
						onMouseLeave={(e) =>
							((e.currentTarget as HTMLElement).style.background = 'var(--lagoon-accent)')
						}
					>
						Start for free
						<svg aria-hidden='true' width='14' height='14' viewBox='0 0 14 14' fill='none'>
							<path
								d='M2.5 7h9M8.5 4l3 3-3 3'
								stroke='currentColor'
								strokeWidth='1.5'
								strokeLinecap='round'
								strokeLinejoin='round'
							/>
						</svg>
					</Link>
					<a
						href='#vision'
						className='inline-flex h-12 items-center rounded-full border px-8 text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2'
						style={{
							borderColor: 'var(--lagoon-border)',
							background: 'var(--lagoon-surface)',
							color: 'var(--lagoon-body)',
						}}
						onMouseEnter={(e) => {
							(e.currentTarget as HTMLElement).style.borderColor =
								'var(--lagoon-border-soft)';
							(e.currentTarget as HTMLElement).style.color = 'var(--lagoon-ink)';
						}}
						onMouseLeave={(e) => {
							(e.currentTarget as HTMLElement).style.borderColor = 'var(--lagoon-border)';
							(e.currentTarget as HTMLElement).style.color = 'var(--lagoon-body)';
						}}
					>
						See the vision
					</a>
				</m.div>

				{/* Trust strip — reinforces "not live yet" */}
				<m.p
					variants={enter(0, 0.26)}
					initial='hidden'
					animate='visible'
					className='mt-5 text-[13px]'
					style={{ color: 'var(--lagoon-muted)' }}
				>
					Not available yet&ensp;&middot;&ensp;We will announce in the changelog when it ships&ensp;&middot;&ensp;No waitlist
				</m.p>
			</div>
		</section>
	);
}
