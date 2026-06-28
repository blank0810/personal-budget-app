'use client';

import Link from 'next/link';
import { m, useReducedMotion, type Variants } from 'motion/react';
import { useMounted } from '@/components/modules/landing/ui/use-mounted';
import { LagoonProductMock } from './LagoonProductMock';

/**
 * LagoonHero — above-fold section for the Lagoon concept.
 *
 * Design:
 *  - Contained teal radial glow + subtle teal-tinted grid overlay
 *  - Staged entrance animation (gated behind useMounted)
 *  - h1 is plain SSR, opacity:1, never animated (LCP rule)
 *  - Product mock floats up with a gentle perspective effect
 *
 * Animation inventory:
 *  - Badge pill: y -10 → 0, opacity 0 → 1 (delay 0)
 *  - Subhead: y 12 → 0, opacity 0 → 1 (delay 0.10)
 *  - CTAs: y 12 → 0, opacity 0 → 1 (delay 0.18)
 *  - Trust strip: opacity 0 → 1 (delay 0.26)
 *  - Product mock: y 28 → 0, opacity 0 → 1 (delay 0.38)
 */
export function LagoonHero() {
	const mounted = useMounted();
	const prefersReduced = useReducedMotion();
	const shouldAnimate = mounted && !prefersReduced;

	/** Factory: entrance variant (above-fold, uses animate not whileInView) */
	const enter = (
		fromY: number,
		delay: number,
		withOpacity = true,
	): Variants =>
		!shouldAnimate
			? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
			: {
					hidden: { opacity: withOpacity ? 0 : 1, y: fromY },
					visible: {
						opacity: 1,
						y: 0,
						transition: { duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] },
					},
				};

	return (
		<section
			className='lagoon-grid-overlay relative overflow-hidden pt-[128px] pb-16 md:pb-24 md:pt-[160px]'
			style={{ background: 'var(--lagoon-canvas)' }}
			aria-label='Hero'
		>
			{/* Contained teal glow — not full bleed */}
			<div className='lagoon-hero-glow' aria-hidden='true' />

			{/* Content column */}
			<div className='relative z-10 mx-auto max-w-[1184px] px-6 text-center md:px-10'>
				{/* Badge */}
				<m.div
					variants={enter(-10, 0)}
					initial='hidden'
					animate='visible'
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
					Personal budgeting &middot; Expense tracking &middot; Savings goals
				</m.div>

				{/* LCP h1 — plain SSR, never animated */}
				<h1
					className='lagoon-hero-title mx-auto mt-6 max-w-[860px]'
					style={{
						color: 'var(--lagoon-ink)',
						fontFamily: 'var(--lagoon-font-heading, inherit)',
					}}
				>
					Know exactly where{' '}
					<span style={{ color: 'var(--lagoon-accent)' }}>your money</span> goes.
				</h1>

				{/* Subhead */}
				<m.p
					variants={enter(12, 0.10)}
					initial='hidden'
					animate='visible'
					className='mx-auto mt-6 max-w-[52ch] text-[17px] leading-[1.7] md:mt-7'
					style={{ color: 'var(--lagoon-body)' }}
				>
					Set a budget for every category, log every transaction, and track your
					savings goals — with clear monthly reports that actually make sense.
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
						className='inline-flex h-12 items-center gap-2 rounded-full px-8 text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[var(--lagoon-accent)] focus-visible:outline-offset-2'
						style={{ background: 'var(--lagoon-accent)', color: 'var(--lagoon-on-accent)' }}
						onMouseEnter={(e) =>
							((e.currentTarget as HTMLElement).style.background = 'var(--lagoon-accent-strong)')
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
						href='#how-it-works'
						className='inline-flex h-12 items-center rounded-full border px-8 text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[var(--lagoon-accent)] focus-visible:outline-offset-2'
						style={{
							borderColor: 'var(--lagoon-border)',
							background: 'var(--lagoon-surface)',
							color: 'var(--lagoon-body)',
						}}
						onMouseEnter={(e) => {
							(e.currentTarget as HTMLElement).style.borderColor = 'var(--lagoon-border-soft)';
							(e.currentTarget as HTMLElement).style.color = 'var(--lagoon-ink)';
						}}
						onMouseLeave={(e) => {
							(e.currentTarget as HTMLElement).style.borderColor = 'var(--lagoon-border)';
							(e.currentTarget as HTMLElement).style.color = 'var(--lagoon-body)';
						}}
					>
						See how it works
					</a>
				</m.div>

				{/* Trust strip */}
				<m.p
					variants={enter(0, 0.26)}
					initial='hidden'
					animate='visible'
					className='mt-5 text-[13px]'
					style={{ color: 'var(--lagoon-muted)' }}
				>
					No bank linking&ensp;&middot;&ensp;Free forever&ensp;&middot;&ensp;Your data, your control
				</m.p>

				{/* Product mock — floats up with gentle delay */}
				<m.div
					variants={enter(32, 0.38)}
					initial='hidden'
					animate='visible'
					className='mx-auto mt-14 max-w-[960px] md:mt-16'
				>
					<LagoonProductMock />
				</m.div>
			</div>
		</section>
	);
}
