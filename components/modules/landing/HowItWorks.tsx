'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import {
	FileText,
	CircleDollarSign,
	PiggyBank,
	LayoutDashboard,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { m, useReducedMotion, type Variants } from 'motion/react';
import { useMounted } from './ui/use-mounted';
import { SectionIndex } from './ui/SectionIndex';

/**
 * HowItWorks — the "after" to ProblemStatement's "before" (master IA §7).
 *
 * Deliberately distinct in composition from BOTH the off-grid Problem diagram
 * and the asymmetric Features bento:
 *
 *  - It sits on its own faintly elevated surface band (bg-l-surface-1 with a
 *    hairline top/bottom rule) so the background rhythm changes — Problem is
 *    on the page canvas, this reads as a contained "operating manual" panel.
 *  - The four steps run as a single STEPPED DIAGONAL spine (each step nudged
 *    progressively lower on lg), not a flat 4-up row. A GSAP scroll-scrubbed
 *    connector draws along that spine as you scroll,
 *    assembling as you read down it.
 *  - Giant faint numerals anchor each step; the heading is the maximalist
 *    .l-h2 with generous negative space around it.
 *
 * Honesty (PRODUCT.md): the personal-budgeter path is noted under step 1, so
 * the flow is true for both audiences. No fabricated metrics.
 *
 * Motion:
 *  - Heading reveal via Framer `m.*` under LazyMotion, single useReducedMotion
 *    gate, viewport once.
 *  - GSAP useGSAP() (scoped + auto-revert): the spine connector draws (scaleX
 *    0 -> 1) with scroll scrub, and the steps reveal in sequence. No-ops under
 *    prefers-reduced-motion (connector painted full, steps static). The spine
 *    and steps reserve their space in static markup — no CLS.
 */
const STEPS: {
	icon: LucideIcon;
	num: string;
	title: string;
	body: string;
	aside?: string;
}[] = [
	{
		icon: FileText,
		num: '01',
		title: 'Log your work or send an invoice',
		body: 'Send a client a polished invoice straight from the app, or just record the work you have done.',
		aside: 'Budgeting for yourself? Step one is simply logging what comes in and goes out.',
	},
	{
		icon: CircleDollarSign,
		num: '02',
		title: 'Get paid, income lands',
		body: 'When the client pays, you log it once. The income lands in the right account, and every account balance stays up to date.',
	},
	{
		icon: PiggyBank,
		num: '03',
		title: 'Budgets and goals reflect what you logged',
		body: 'You log the payment; your budget reflects what you logged. Any linked savings goals move closer, with no second tool to keep in sync.',
	},
	{
		icon: LayoutDashboard,
		num: '04',
		title: 'See the full picture on your dashboard',
		body: 'Your balance, spending, and health score update together, so you always know where you stand this month.',
	},
];

export function HowItWorks() {
	const prefersReduced = useReducedMotion();
	const mounted = useMounted();
	const rootRef = useRef<HTMLElement>(null);

	const heading: Variants = (mounted && prefersReduced)
		? {
				hidden: { opacity: 0 },
				visible: { opacity: 1, transition: { duration: 0.3 } },
		  }
		: {
				hidden: { opacity: 0, y: 18 },
				visible: {
					opacity: 1,
					y: 0,
					transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
				},
		  };

	useGSAP(
		() => {
			const root = rootRef.current;
			if (!root) return;

			const prefers = window.matchMedia(
				'(prefers-reduced-motion: reduce)',
			).matches;
			if (prefers) return;

			let cancelled = false;
			let cleanup: (() => void) | undefined;

			import('gsap').then(({ gsap }) =>
				import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
					if (cancelled) return;
					gsap.registerPlugin(ScrollTrigger);

					const draw = gsap.fromTo(
						'[data-how-spine]',
						{ scaleY: 0 },
						{
							scaleY: 1,
							transformOrigin: 'top center',
							ease: 'none',
							scrollTrigger: {
								trigger: root,
								start: 'top 62%',
								end: 'bottom 70%',
								scrub: 1,
							},
						},
					);

					const reveal = gsap.from('[data-how-step]', {
						scrollTrigger: {
							trigger: root,
							start: 'top 66%',
						},
						y: 36,
						opacity: 0,
						duration: 0.6,
						stagger: 0.18,
						ease: 'power2.out',
					});

					cleanup = () => {
						draw.scrollTrigger?.kill();
						draw.kill();
						reveal.scrollTrigger?.kill();
						reveal.kill();
					};
				}),
			);

			return () => {
				cancelled = true;
				cleanup?.();
			};
		},
		{ scope: rootRef },
	);

	return (
		<section
			ref={rootRef}
			id='how-it-works'
			className='scroll-mt-24 border-y border-l-border bg-l-surface-1 py-28 sm:py-32'
		>
			<div className='mx-auto max-w-[1184px] px-6 md:px-10 xl:px-12'>
				<m.div
					variants={heading}
					initial='hidden'
					whileInView='visible'
					viewport={{ once: true, amount: 0.5 }}
					className='max-w-2xl'
				>
					<SectionIndex index='02' label='How it works' tone='dark' />
					<h2 className='l-h2 mt-6 text-balance'>
						Invoice, log, budget — all in one app.
					</h2>
					<p className='mt-6 max-w-xl text-base leading-relaxed text-l-text-2 sm:text-lg'>
						The money you earn and the money you plan, managed in the
						same app. No switching between tools.{' '}
						<a
							href='/invoicing'
							className='underline underline-offset-2 hover:text-l-text-1'
						>
							See how invoicing works →
						</a>
					</p>
				</m.div>

				{/*
				 * Stepped diagonal spine. A single vertical rail runs down the
				 * left of the steps; each step is nudged progressively to the
				 * right on lg so the column reads as a stair, not a stack. The
				 * GSAP scrub draws the rail downward as you scroll; painted full
				 * for no-JS / reduced-motion (scaleY defaults to 1).
				 */}
				<div className='relative mt-20'>
					{/* The drawn spine — sits behind the numerals on the left. */}
					<div
						aria-hidden='true'
						className='pointer-events-none absolute bottom-12 left-[27px] top-12 w-px bg-l-border'
					>
						<div
							data-how-spine
							className='h-full w-px origin-top bg-l-accent/45'
						/>
					</div>

					<ol className='space-y-14 sm:space-y-16'>
						{STEPS.map(({ icon: Icon, num, title, body, aside }, i) => (
							<li
								key={num}
								data-how-step
								className='relative pl-20'
								style={{
									// Progressive rightward inset on lg for the
									// stepped/diagonal read (purely presentational).
									['--how-shift' as string]: `${i * 2.25}rem`,
								}}
							>
								<div className='lg:[margin-left:var(--how-shift)]'>
									{/* Giant faint numeral, set into the negative space. */}
									<span
										aria-hidden='true'
										className='pointer-events-none absolute -top-10 left-16 select-none font-mono text-[120px] font-bold leading-none text-l-surface-2 sm:text-[150px]'
									>
										{num}
									</span>

									{/* Node on the spine. */}
									<span className='absolute left-0 top-0 z-10 inline-flex h-[54px] w-[54px] items-center justify-center rounded-2xl border border-l-border bg-l-bg text-l-accent shadow-sm'>
										<Icon
											className='h-6 w-6'
											aria-hidden='true'
										/>
									</span>

									<div className='relative max-w-xl'>
										<h3 className='text-xl font-semibold tracking-[-0.015em] text-l-text-1 sm:text-2xl'>
											{title}
										</h3>
										<p className='mt-3 text-[15px] leading-relaxed text-l-text-2 sm:text-base'>
											{body}
										</p>
										{aside && (
											<p className='mt-3 text-[13px] leading-relaxed text-l-text-3'>
												{aside}
											</p>
										)}
									</div>
								</div>
							</li>
						))}
					</ol>
				</div>
			</div>
		</section>
	);
}
