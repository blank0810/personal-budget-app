'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import {
	m,
	useReducedMotion,
	useScroll,
	useTransform,
	type Variants,
} from 'motion/react';
import { GradientMeshBg } from './ui/GradientMeshBg';
import { BrowserMockup } from './ui/BrowserMockup';
import { NumberTicker } from './ui/NumberTicker';

/**
 * LandingHero — design-system §4.1 with master-doc overrides applied.
 *
 * LCP rule (master §4): the <h1> and subhead are plain SSR HTML at
 * opacity:1 — they are NEVER wrapped in motion / animated from
 * opacity:0. Only the badge pill, CTA row, microcopy and browser
 * mockup animate in (they sit beside/below the headline, so they are
 * not the LCP candidate). A single useReducedMotion() gate flattens
 * every variant.
 *
 * Anti-slop (methodology §5): the headline block is nudged ~10% left of
 * dead-center on desktop; the badge pill stays small/understated.
 */
export function LandingHero() {
	const prefersReduced = useReducedMotion();

	// Subtle scroll-linked tilt: the mockup straightens as it scrolls into
	// view (transform-only, flattened to 0 under reduced motion).
	const mockRef = useRef<HTMLDivElement>(null);
	const { scrollYProgress } = useScroll({
		target: mockRef,
		offset: ['start end', 'center center'],
	});
	const mockRotateX = useTransform(
		scrollYProgress,
		[0, 1],
		prefersReduced ? [0, 0] : [7, 0],
	);
	const mockLiftY = useTransform(
		scrollYProgress,
		[0, 1],
		prefersReduced ? [0, 0] : [28, 0],
	);

	const rise = (delay: number): Variants =>
		prefersReduced
			? {
					hidden: { opacity: 0 },
					visible: { opacity: 1, transition: { duration: 0.3, delay } },
			  }
			: {
					hidden: { opacity: 0, y: 12 },
					visible: {
						opacity: 1,
						y: 0,
						transition: { duration: 0.5, delay },
					},
			  };

	const badgeVariants: Variants = prefersReduced
		? {
				hidden: { opacity: 0 },
				visible: { opacity: 1, transition: { duration: 0.3, delay: 0.1 } },
		  }
		: {
				hidden: { opacity: 0, y: -8 },
				visible: {
					opacity: 1,
					y: 0,
					transition: { duration: 0.4, delay: 0.1 },
				},
		  };

	const mockupVariants: Variants = prefersReduced
		? {
				hidden: { opacity: 0 },
				visible: { opacity: 1, transition: { duration: 0.4, delay: 0.3 } },
		  }
		: {
				hidden: { opacity: 0, y: 32, scale: 0.96 },
				visible: {
					opacity: 1,
					y: 0,
					scale: 1,
					transition: {
						duration: 0.7,
						delay: 0.4,
						ease: [0.16, 1, 0.3, 1],
					},
				},
		  };

	return (
		<section className='relative overflow-hidden pb-20 pt-[120px]'>
			<GradientMeshBg variant='hero' />

			<div className='relative mx-auto max-w-[1184px] px-6 md:px-10 xl:px-12'>
				{/*
				 * Headline column: nudged ~10% left of dead-center on desktop
				 * (anti-slop). Mobile stays centered. max-w keeps line length
				 * tight regardless of horizontal position.
				 */}
				<div className='flex flex-col items-center text-center lg:items-start lg:pl-[8%] lg:text-left'>
					{/* Badge pill — small/understated, animates in */}
					<m.div
						variants={badgeVariants}
						initial='hidden'
						animate='visible'
						className='inline-flex items-center gap-1.5 rounded-full border border-l-accent/20 bg-l-accent-dim px-3 py-1 text-[11px] font-medium uppercase tracking-[0.06em] text-l-accent'
					>
						<Sparkles className='h-3 w-3' aria-hidden='true' />
						AI Advisor · Coming soon
					</m.div>

					{/*
					 * H1 + subhead — PLAIN SSR, opacity:1, NEVER animated.
					 * This is the LCP element (master §4 / design-system §4.1).
					 */}
					<h1 className='mt-6 max-w-[15ch] text-[44px] font-bold leading-[1.05] tracking-[-0.03em] text-l-text-1 sm:text-[56px] lg:text-[68px] lg:leading-[1.02] lg:tracking-[-0.04em]'>
						Your money, finally{' '}
						<span className='text-l-accent'>with a brain.</span>
					</h1>

					<p className='mt-6 max-w-xl text-base leading-relaxed text-l-text-2 sm:text-lg'>
						The money app for freelancers and solo operators. See every
						peso in and out, send invoices and get paid faster, and hit
						your savings goals. An AI advisor that actually understands
						your numbers is on the way. Free to start, early access
						opening now.
					</p>

					{/* CTA row — animates in */}
					<m.div
						variants={rise(0.2)}
						initial='hidden'
						animate='visible'
						className='mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center'
					>
						<Link
							href='/register'
							className='inline-flex items-center justify-center rounded-full bg-l-accent px-7 py-3.5 text-base font-medium text-white shadow-sm transition-colors hover:bg-l-accent/90'
						>
							Start free
						</Link>
						<a
							href='#ai-advisor'
							className='group inline-flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-base font-medium text-l-text-2 transition-colors hover:text-l-text-1'
						>
							See what&apos;s coming
							<ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-0.5' />
						</a>
					</m.div>

					{/* Microcopy strip — honest, animates in */}
					<m.p
						variants={rise(0.35)}
						initial='hidden'
						animate='visible'
						className='mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-l-text-4'
					>
						<span>Free to start</span>
						<span aria-hidden='true' className='text-l-border-mid'>
							·
						</span>
						<span>No credit card</span>
						<span aria-hidden='true' className='text-l-border-mid'>
							·
						</span>
						<span>Your data is yours</span>
					</m.p>
				</div>

				{/* Browser mockup — animates in, sits below the headline */}
				<m.div
					ref={mockRef}
					variants={mockupVariants}
					initial='hidden'
					animate='visible'
					className='mt-16 [perspective:1200px]'
				>
					<div
						className='relative'
						style={{
							boxShadow: '0 32px 80px var(--l-glow-emerald)',
						}}
					>
						<m.div
							className='[transform-origin:bottom_center]'
							style={{ rotateX: mockRotateX, y: mockLiftY }}
						>
							<BrowserMockup url='budgetplanner.app/dashboard'>
								<HeroDashboardMock />
							</BrowserMockup>
						</m.div>
					</div>
				</m.div>
			</div>
		</section>
	);
}

/* ---------------------------------------------------------------------
 * Faithful mock of the CURRENT shipped dashboard — KPI row +
 * income-vs-expenses chart + budget-progress bars. Realistic PHP (₱)
 * numbers. Pure SSR, light glass aesthetic.
 *
 * TODO: refresh to mirror the dashboard redesign (Operator Console)
 * when it ships.
 * ------------------------------------------------------------------- */
const KPIS = [
	{ label: 'Total balance', value: 128450 },
	{ label: 'Income (May)', value: 64200 },
	{ label: 'Expenses (May)', value: 38910 },
	{ label: 'Net saved', value: 25290 },
];

// [income, expense] heights in px, Jan→Jun — income variable (freelance).
const CHART: [number, number][] = [
	[58, 40],
	[72, 46],
	[49, 38],
	[80, 44],
	[88, 52],
	[64, 39],
];
const CHART_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

const BUDGETS = [
	{ cat: 'Groceries', pct: 64 },
	{ cat: 'Transport', pct: 42 },
	{ cat: 'Software & tools', pct: 81 },
	{ cat: 'Utilities', pct: 28 },
];

function HeroDashboardMock() {
	const prefersReduced = useReducedMotion();
	return (
		<div className='p-5 sm:p-7'>
			{/* Greeting row */}
			<div className='mb-5 flex items-center justify-between'>
				<div>
					<p className='text-[13px] font-medium text-l-text-1'>
						Welcome back
					</p>
					<p className='text-[11px] text-l-text-3'>
						Here&apos;s your money this month
					</p>
				</div>
				<span className='hidden rounded-md border border-l-border bg-l-surface-1 px-2.5 py-1 font-mono text-[11px] text-l-text-3 sm:inline'>
					May 2026
				</span>
			</div>

			{/* KPI row */}
			<div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
				{KPIS.map((kpi) => (
					<div
						key={kpi.label}
						className='rounded-xl border border-l-border bg-l-surface-1 p-3'
					>
						<p className='text-[10px] text-l-text-3'>{kpi.label}</p>
						<p className='mt-1 font-mono text-[15px] font-semibold tracking-tight text-l-text-1'>
							<NumberTicker value={kpi.value} prefix='₱' />
						</p>
					</div>
				))}
			</div>

			{/* Charts row */}
			<div className='mt-3 grid gap-3 md:grid-cols-2'>
				{/* Income vs expenses */}
				<div className='rounded-xl border border-l-border bg-l-surface-1 p-4'>
					<div className='flex items-center justify-between'>
						<p className='text-xs font-medium text-l-text-1'>
							Income vs expenses
						</p>
						<div className='flex items-center gap-3 text-[10px] text-l-text-3'>
							<span className='flex items-center gap-1'>
								<span className='h-2 w-2 rounded-sm bg-l-accent' />
								Income
							</span>
							<span className='flex items-center gap-1'>
								<span className='h-2 w-2 rounded-sm bg-l-border-mid' />
								Expenses
							</span>
						</div>
					</div>
					<div className='mt-4 flex h-[104px] items-end gap-2'>
						{CHART.map(([inc, exp], i) => (
							<div
								key={CHART_MONTHS[i]}
								className='flex flex-1 flex-col items-center gap-1'
							>
								<div className='flex w-full items-end justify-center gap-1'>
									<m.div
										className='w-1/2 origin-bottom rounded-t bg-l-accent/70'
										style={{ height: `${inc}px` }}
										initial={prefersReduced ? false : { scaleY: 0 }}
										whileInView={{ scaleY: 1 }}
										viewport={{ once: true, amount: 0.6 }}
										transition={{
											duration: 0.6,
											delay: i * 0.05,
											ease: [0.16, 1, 0.3, 1],
										}}
									/>
									<m.div
										className='w-1/2 origin-bottom rounded-t bg-l-border-mid'
										style={{ height: `${exp}px` }}
										initial={prefersReduced ? false : { scaleY: 0 }}
										whileInView={{ scaleY: 1 }}
										viewport={{ once: true, amount: 0.6 }}
										transition={{
											duration: 0.6,
											delay: i * 0.05 + 0.04,
											ease: [0.16, 1, 0.3, 1],
										}}
									/>
								</div>
								<span className='text-[9px] text-l-text-4'>
									{CHART_MONTHS[i]}
								</span>
							</div>
						))}
					</div>
				</div>

				{/* Budget progress */}
				<div className='rounded-xl border border-l-border bg-l-surface-1 p-4'>
					<p className='text-xs font-medium text-l-text-1'>
						Budget progress
					</p>
					<div className='mt-3 space-y-3'>
						{BUDGETS.map((b, i) => (
							<div key={b.cat}>
								<div className='flex justify-between text-[10px]'>
									<span className='text-l-text-2'>{b.cat}</span>
									<span className='font-mono text-l-text-3'>
										{b.pct}%
									</span>
								</div>
								<div className='mt-1 h-1.5 w-full overflow-hidden rounded-full bg-l-surface-3'>
									<m.div
										className={
											b.pct >= 80
												? 'h-1.5 origin-left rounded-full bg-amber-500/80'
												: 'h-1.5 origin-left rounded-full bg-l-accent'
										}
										style={{ width: `${b.pct}%` }}
										initial={prefersReduced ? false : { scaleX: 0 }}
										whileInView={{ scaleX: 1 }}
										viewport={{ once: true, amount: 0.8 }}
										transition={{
											duration: 0.7,
											delay: i * 0.08,
											ease: [0.16, 1, 0.3, 1],
										}}
									/>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
