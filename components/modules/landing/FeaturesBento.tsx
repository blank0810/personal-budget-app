'use client';

import { useEffect, useRef, useState } from 'react';
import {
	FileText,
	ArrowLeftRight,
	Wallet,
	Target,
	Repeat,
	FileBarChart,
	Globe,
} from 'lucide-react';
import {
	Bar,
	BarChart,
	ResponsiveContainer,
	XAxis,
	Cell,
} from 'recharts';
import { SectionEyebrow } from './ui/SectionEyebrow';
import { MotionReveal } from './ui/MotionReveal';
import { BentoCell } from './ui/BentoCell';

/**
 * FeaturesBento — design-system §4.4, master IA §5.
 *
 * 12-col asymmetric bento (NOT flattened to equal cards). Invoicing is the
 * hero tile (largest: 7 cols × 2 rows) and telegraphs the closed loop —
 * invoice -> income -> budget — via a small animated recharts bar visual.
 * Only REAL shipped features (PRODUCT.md "shipped today"): unified
 * transactions, envelope budgets, savings goals, recurring + CSV import,
 * reports/PDF + monthly email, multi-currency + health score.
 *
 * Motion:
 *  - Per-cell Framer hover lift lives in BentoCell.
 *  - GSAP ScrollTrigger entrance cascade (stagger) over [data-bento-cell],
 *    dynamic-imported below the fold, scoped to this component, reverted on
 *    unmount, and no-op under prefers-reduced-motion.
 *  - The recharts bars animate on viewport entry via IntersectionObserver
 *    (not GSAP) — kept simple, also gated by reduced motion.
 */
export function FeaturesBento({ lead = false }: { lead?: boolean }) {
	const sectionRef = useRef<HTMLElement>(null);
	const Heading = lead ? 'h1' : 'h2';

	useEffect(() => {
		const prefersReduced = window.matchMedia(
			'(prefers-reduced-motion: reduce)',
		).matches;
		if (prefersReduced) return;

		const el = sectionRef.current;
		if (!el) return;

		let ctx: { revert: () => void } | undefined;
		let cancelled = false;

		// Dynamic import keeps GSAP out of the initial landing bundle.
		import('gsap').then(({ gsap }) =>
			import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
				if (cancelled) return;
				gsap.registerPlugin(ScrollTrigger);
				ctx = gsap.context(() => {
					gsap.from('[data-bento-cell]', {
						scrollTrigger: {
							trigger: el,
							start: 'top 78%',
						},
						y: 32,
						opacity: 0,
						duration: 0.55,
						stagger: 0.08,
						ease: 'power2.out',
					});
				}, el);
			}),
		);

		return () => {
			cancelled = true;
			ctx?.revert();
		};
	}, []);

	return (
		<section
			ref={sectionRef}
			id='features'
			className='scroll-mt-24 py-24'
		>
			<div className='mx-auto max-w-[1184px] px-6 md:px-10 xl:px-12'>
				<MotionReveal className='max-w-2xl'>
					<SectionEyebrow label='Features' />
					<Heading className='mt-3 text-3xl font-semibold tracking-[-0.02em] text-l-text-1 sm:text-4xl lg:text-[42px] lg:leading-[1.1]'>
						One app for the whole loop: earn, track, budget, save.
					</Heading>
					<p className='mt-4 text-base leading-relaxed text-l-text-2 sm:text-lg'>
						Every feature here ships today. Send an invoice and the
						money you earn lands in the same place you plan it, so
						nothing falls through the gap between tools.
					</p>
				</MotionReveal>

				{/*
				 * 12-col grid. Asymmetry is protected (anti-slop §5): the hero
				 * invoicing tile is col-span-7 / row-span-2; the rest fill the
				 * remaining 5 + a 4/4/4 bottom row. Mobile stacks single-column.
				 */}
				<div className='mt-12 grid grid-cols-1 gap-3 lg:grid-cols-12 lg:auto-rows-[minmax(0,1fr)]'>
					<BentoCell
						icon={FileText}
						title='Send invoices, get paid faster'
						body='Send polished invoices to clients by email. When one is paid you log the income in the same app, and it flows straight into your budget. No copy-pasting between a billing tool and a tracker.'
						colSpan='lg:col-span-7'
						rowSpan='lg:row-span-2'
						hero
						visual={<ClosedLoopChart />}
					/>

					<BentoCell
						icon={ArrowLeftRight}
						title='Every peso in and out, in one view'
						body='Income, spending, transfers, and client payments in one clear place, each tied to the right account.'
						colSpan='lg:col-span-5'
					/>

					<BentoCell
						icon={Wallet}
						title='Know what is safe to spend'
						body='Set a limit per category each month and watch it fill, so overspending shows up before month-end, not after.'
						colSpan='lg:col-span-5'
					/>

					<BentoCell
						icon={Target}
						title='Reach your savings goals'
						body='Link a goal to an account and watch progress climb on its own as the balance grows.'
						colSpan='lg:col-span-4'
					/>

					<BentoCell
						icon={Repeat}
						title='Bills on autopilot, history in seconds'
						body='Set your repeat bills once and they take care of themselves, and bring your bank history over in seconds.'
						colSpan='lg:col-span-4'
					/>

					<BentoCell
						icon={FileBarChart}
						title='Clear reports, monthly recap'
						body='Export a clear report any time, and get a recap of your money in your inbox every month.'
						colSpan='lg:col-span-4'
					/>

					<BentoCell
						icon={Globe}
						title='Your currency, health at a glance'
						body='Works in your currency, and shows your financial health at a glance so you always know where you stand.'
						colSpan='lg:col-span-12'
					/>
				</div>
			</div>
		</section>
	);
}

/* ---------------------------------------------------------------------
 * ClosedLoopChart — small animated recharts visual in the hero tile.
 *
 * Three labelled bars (Invoiced -> Paid / income -> Budgeted) tell the
 * closed-loop story with REAL-feeling PHP figures that stay coherent with
 * the Hero mock (Income (May) ₱64,200 → the "Paid" bar). Bars animate on
 * viewport entry via IntersectionObserver; reduced motion shows them
 * static at final height.
 * ------------------------------------------------------------------- */
const LOOP_DATA = [
	{ stage: 'Invoiced', amount: 72, color: 'var(--l-border-mid)' },
	{ stage: 'Paid', amount: 64, color: 'var(--l-accent)' },
	{ stage: 'Budgeted', amount: 64, color: 'var(--l-accent)' },
];

function ClosedLoopChart() {
	const wrapRef = useRef<HTMLDivElement>(null);
	const [animate, setAnimate] = useState(false);
	const [mounted, setMounted] = useState(false);

	// Mount-gate the chart so ResponsiveContainer measures a laid-out
	// container (avoids the recharts width(-1)/height(-1) first-paint warning).
	// Independent of `animate`, so reduced-motion users still see the chart.
	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		const prefersReduced = window.matchMedia(
			'(prefers-reduced-motion: reduce)',
		).matches;
		if (prefersReduced) {
			setAnimate(false);
			return;
		}

		const el = wrapRef.current;
		if (!el) return;

		const io = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					setAnimate(true);
					io.disconnect();
				}
			},
			{ threshold: 0.4 },
		);
		io.observe(el);
		return () => io.disconnect();
	}, []);

	return (
		<div
			ref={wrapRef}
			className='rounded-xl border border-l-border bg-l-bg/70 p-5'
		>
			<div className='flex items-center justify-between'>
				<p className='text-xs font-medium text-l-text-1'>
					Invoice to budget, May
				</p>
				<span className='font-mono text-[11px] text-l-text-3'>
					PHP
				</span>
			</div>

			{/* Fixed height reserves space → no CLS when bars animate. */}
			<div className='mt-4 h-[120px] w-full'>
				{mounted && (
				<ResponsiveContainer width='100%' height='100%'>
					<BarChart
						data={LOOP_DATA}
						margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
						barCategoryGap='28%'
					>
						<XAxis
							dataKey='stage'
							tickLine={false}
							axisLine={false}
							tick={{
								fill: 'var(--l-text-3)',
								fontSize: 11,
							}}
							dy={4}
						/>
						<Bar
							dataKey='amount'
							radius={[5, 5, 0, 0]}
							isAnimationActive={animate}
							animationDuration={900}
							animationEasing='ease-out'
						>
							{LOOP_DATA.map((d) => (
								<Cell key={d.stage} fill={d.color} />
							))}
						</Bar>
					</BarChart>
				</ResponsiveContainer>
				)}
			</div>

			<p className='mt-3 text-[11px] leading-relaxed text-l-text-3'>
				The income you collect is the income you plan against. One
				number, one place.
			</p>
		</div>
	);
}
