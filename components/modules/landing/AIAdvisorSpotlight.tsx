'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { m, useReducedMotion, type Variants } from 'motion/react';
import { useMounted } from './ui/use-mounted';
import { ChatWindow } from './ui/ChatWindow';

/**
 * AIAdvisorSpotlight — design-system §4.5 + the §5A chat set-piece,
 * master IA §6.
 *
 * ART DIRECTION (intentional, per-section): this is the emotional / AI peak
 * of the page. Unlike the light page around it, this section is a DELIBERATE
 * DARK, glowing panel (deep slate surface, soft emerald + violet glow, light
 * text) so it feels intelligent / next-gen, like Linear's dark product
 * moments. Because the landing tokens are light-scoped only, the dark palette
 * is expressed with explicit colors here (slate + emerald), all tuned for
 * WCAG-AA contrast on the dark surface. This is NOT a mistake.
 *
 * HONESTY (PRODUCT.md — hard gate): the AI Advisor is the flagship VISION,
 * not a live feature. Every line here is future-tense / gated. The right
 * column is an INTERACTIVE labelled preview chat (see ChatWindow) carrying a
 * persistent "Preview · in development" label, a "Coming soon" pill, and an
 * inert input. No present-tense live-AI claims. There is NO email capture and
 * NO waitlist — the CTA is just "Start free" → /register with "be first to
 * know" microcopy.
 *
 * Motion: left copy reveals from x:-24, right chat from x:24; a single
 * useReducedMotion() gate collapses both to a plain opacity fade.
 */
export function AIAdvisorSpotlight({ lead = false }: { lead?: boolean }) {
	const prefersReduced = useReducedMotion();
	const mounted = useMounted();
	const Heading = lead ? 'h1' : 'h2';

	const fromLeft: Variants = (mounted && prefersReduced)
		? {
				hidden: { opacity: 0 },
				visible: { opacity: 1, transition: { duration: 0.3 } },
		  }
		: {
				hidden: { opacity: 0, x: -24 },
				visible: {
					opacity: 1,
					x: 0,
					transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
				},
		  };

	const fromRight: Variants = (mounted && prefersReduced)
		? {
				hidden: { opacity: 0 },
				visible: { opacity: 1, transition: { duration: 0.3 } },
		  }
		: {
				hidden: { opacity: 0, x: 24 },
				visible: {
					opacity: 1,
					x: 0,
					transition: {
						duration: 0.6,
						delay: 0.1,
						ease: [0.16, 1, 0.3, 1],
					},
				},
		  };

	return (
		<section
			id='ai-advisor'
			className='relative scroll-mt-24 overflow-hidden py-24'
			style={{
				// Deep slate base — the page's only dark moment.
				backgroundColor: 'oklch(0.17 0.018 264)',
			}}
		>
			{/* Glow field — soft emerald (right) + violet (left) on the dark
			 * surface. Decorative only. */}
			<div
				aria-hidden='true'
				className='pointer-events-none absolute inset-0'
				style={{
					background:
						'radial-gradient(ellipse 55% 75% at 80% 45%, oklch(0.82 0.13 155 / 22%), transparent 70%), radial-gradient(ellipse 50% 70% at 12% 30%, oklch(0.72 0.13 290 / 16%), transparent 72%)',
				}}
			/>
			{/* Hairline top/bottom edges so the dark band reads as deliberate. */}
			<div
				aria-hidden='true'
				className='pointer-events-none absolute inset-x-0 top-0 h-px'
				style={{
					background:
						'linear-gradient(90deg, transparent, oklch(0.82 0.13 155 / 35%), transparent)',
				}}
			/>

			<div className='relative mx-auto grid max-w-[1184px] grid-cols-1 items-center gap-12 px-6 md:px-10 lg:grid-cols-2 lg:gap-16 xl:px-12'>
				{/* Left — copy (light text on dark) */}
				<m.div
					variants={fromLeft}
					initial='hidden'
					whileInView='visible'
					viewport={{ once: true, amount: 0.4 }}
				>
					<div className='inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1'>
						<Sparkles
							className='h-3.5 w-3.5 text-emerald-300'
							aria-hidden='true'
						/>
						<span className='text-[11px] font-medium uppercase tracking-[0.08em] text-emerald-200'>
							AI Advisor · Coming soon
						</span>
					</div>

					<Heading className='mt-4 text-3xl font-semibold tracking-[-0.02em] text-white sm:text-4xl lg:text-[42px] lg:leading-[1.1]'>
						An advisor that actually reads your numbers.
					</Heading>
					<p className='mt-5 text-base leading-relaxed text-slate-300 sm:text-lg'>
						Most money apps stop at charts. The AI Advisor is being
						built to go further: it will read your money in
						and out, your budgets, and your invoices, then answer the
						questions you actually ask. Whether a slow month still leaves
						room for your goals, which budget is about to tip over, what
						is safe to spend this week.
					</p>
					<p className='mt-4 text-base leading-relaxed text-slate-400'>
						It is in active development, not live yet. The chat
						beside this is a scripted preview of where it is headed,
						built from one month of a freelancer&apos;s real numbers. Try
						a question to see how it will feel.
					</p>

					<div className='mt-8'>
						<Link
							href='/register'
							className='inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-7 py-3.5 text-base font-medium text-white shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-400'
						>
							<Sparkles className='h-4 w-4' aria-hidden='true' />
							Start free
						</Link>
						<p className='mt-3 text-sm text-slate-400'>
							Create a free account and you&apos;ll be the first to
							know when the AI advisor opens.
						</p>
					</div>
				</m.div>

				{/* Right — interactive labelled preview chat */}
				<m.div
					variants={fromRight}
					initial='hidden'
					whileInView='visible'
					viewport={{ once: true, amount: 0.3 }}
				>
					<ChatWindow />
				</m.div>
			</div>
		</section>
	);
}
