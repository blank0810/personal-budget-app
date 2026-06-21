'use client';

import { useRef, useEffect } from 'react';
import { m, useReducedMotion } from 'motion/react';
import { SectionEyebrow } from './ui/SectionEyebrow';
import { MotionReveal } from './ui/MotionReveal';
import { cn } from '@/lib/utils';
import { useMounted } from './ui/use-mounted';

/**
 * FeaturesBento — design-system §4.4, master IA §5.
 *
 * 12-col asymmetric bento. Invoicing tile removed; grid re-balanced to a
 * clean 3-row × 12-col layout without row-span on the budget hero tile.
 * Row 1: Transactions (4) · Budgets+SpendingRing hero (5) · Goals (3)
 * Row 2: Recurring+Import (4) · Reports+PDF (4) · Health score (4)
 * Row 3: Multi-currency budgeting (5) · Budget anchor visual (7)
 *
 * Motion:
 *  - Per-tile Framer hover lift (FeatureTile).
 *  - GSAP ScrollTrigger entrance cascade via useBentoStagger, dynamic-
 *    imported, scoped, reverted on unmount, no-op under reduced-motion.
 *    matchMedia is read inside useEffect (post-mount) — safe from hydration.
 */

// ─── useBentoStagger ──────────────────────────────────────────────────────────

function useBentoStagger(ref: React.RefObject<HTMLElement | null>) {
	useEffect(() => {
		const pref = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (pref) return;
		const el = ref.current;
		if (!el) return;
		let ctx: { revert: () => void } | undefined;
		let cancelled = false;
		import('gsap').then(({ gsap }) =>
			import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
				if (cancelled) return;
				gsap.registerPlugin(ScrollTrigger);
				ctx = gsap.context(() => {
					gsap.from('[data-bento-cell]', {
						scrollTrigger: { trigger: el, start: 'top 78%' },
						y: 24, opacity: 0, duration: 0.5, stagger: 0.06, ease: 'power2.out',
					});
				}, el);
			}),
		);
		return () => { cancelled = true; ctx?.revert(); };
	}, [ref]);
}

// ─── FeatureTile ──────────────────────────────────────────────────────────────

function FeatureTile({
	n, title, body, visual, colSpan, rowSpan, hero = false, wide = false,
}: {
	n: string; title: string; body: string; visual?: React.ReactNode;
	colSpan: string; rowSpan?: string; hero?: boolean; wide?: boolean;
}) {
	const prefersReduced = useReducedMotion();
	const mounted = useMounted();
	return (
		<m.div
			data-bento-cell
			whileHover={!mounted || prefersReduced ? undefined : { y: -2 }}
			transition={{ duration: 0.18 }}
			className={cn(
				'group relative flex flex-col overflow-hidden border-t border-l-border bg-l-bg transition-colors hover:bg-l-surface-1',
				hero ? 'p-8' : wide ? 'p-7' : 'p-6',
				colSpan,
				rowSpan,
			)}
		>
			<span className='mb-4 block font-mono text-[11px] text-l-text-4'>{n}</span>
			<h3 className={cn('font-semibold text-l-text-1 tracking-tight', hero ? 'text-xl leading-snug' : 'text-[17px] leading-snug')}>
				{title}
			</h3>
			<p className='mt-2.5 text-[13px] leading-relaxed text-l-text-3'>{body}</p>
			{visual && <div className='mt-5 flex-1'>{visual}</div>}
		</m.div>
	);
}

// ─── SpendingRing ─────────────────────────────────────────────────────────────

function SpendingRing() {
	const r = 60, cx = 80, cy = 80;
	const circ = 2 * Math.PI * r;
	const segs = [
		{ label: 'Groceries', pct: 22, color: 'var(--l-accent)' },
		{ label: 'Transport', pct: 14, color: 'oklch(0.72 0.17 200)' },
		{ label: 'Software',  pct: 18, color: 'oklch(0.75 0.1 290)' },
		{ label: 'Utilities', pct: 9,  color: 'oklch(0.76 0.09 220)' },
		{ label: 'Remaining', pct: 37, color: 'var(--l-surface-3)' },
	];
	let off = 0;
	const arcs = segs.map((s) => { const d = (s.pct / 100) * circ; const a = { ...s, d, off }; off += d; return a; });
	return (
		<div className='flex flex-col gap-4'>
			<svg
				viewBox='0 0 160 160' className='w-full max-w-[160px]'
				role='img' aria-label='Spending breakdown by category'
			>
				{arcs.map((s) => (
					<circle key={s.label} cx={cx} cy={cy} r={r} fill='none'
						stroke={s.color} strokeWidth={14}
						strokeDasharray={`${s.d} ${circ - s.d}`}
						strokeDashoffset={-s.off}
						transform='rotate(-90 80 80)'
					/>
				))}
			</svg>
			<div className='space-y-1.5'>
				{arcs.filter(s => s.label !== 'Remaining').map((s) => (
					<div key={s.label} className='flex items-center gap-2'>
						<span className='h-2 w-2 shrink-0 rounded-full' style={{ background: s.color }} />
						<span className='text-[13px] text-l-text-3'>{s.label}</span>
						<span className='ml-auto font-mono tabular-nums text-[13px] text-l-text-2'>{s.pct}%</span>
					</div>
				))}
			</div>
		</div>
	);
}

// ─── HealthGauge ──────────────────────────────────────────────────────────────
// Micro visual for the Health score tile: oversized mono numeral + a thin arc.

function HealthGauge() {
	const score = 82;
	// SVG arc: full circle r=28 on 64×64 viewBox, accent portion = score/100 of circumference
	const r = 28, cx = 32, cy = 32;
	const circ = 2 * Math.PI * r;
	const filled = (score / 100) * circ;
	return (
		<div className='flex items-center gap-5'>
			<div className='relative flex items-center justify-center'>
				<svg viewBox='0 0 64 64' className='h-16 w-16' role='img' aria-label={`Health score ${score}`}>
					<circle cx={cx} cy={cy} r={r} fill='none' stroke='var(--l-surface-3)' strokeWidth={6} />
					<circle
						cx={cx} cy={cy} r={r} fill='none'
						stroke='var(--l-accent)' strokeWidth={6}
						strokeDasharray={`${filled} ${circ - filled}`}
						strokeDashoffset={circ * 0.25}
						transform='rotate(-90 32 32)'
					/>
				</svg>
				<span className='absolute font-mono text-[15px] font-bold text-l-text-1'>{score}</span>
			</div>
			<div>
				<p className='text-[13px] font-semibold text-l-text-1'>Good</p>
				<p className='text-[11px] text-l-text-4'>This month</p>
			</div>
		</div>
	);
}

// ─── BudgetAnchorVisual ───────────────────────────────────────────────────────
// Filler tile for Row 3 col-7: simple progress bars to anchor the budget theme.

function BudgetAnchorVisual() {
	const items = [
		{ label: 'Rent',      used: 100, limit: 100, pct: 100 },
		{ label: 'Food',      used: 8200, limit: 12000, pct: 68 },
		{ label: 'Transport', used: 2100, limit: 4000, pct: 53 },
		{ label: 'Software',  used: 1450, limit: 2500, pct: 58 },
	];
	return (
		<div className='space-y-3'>
			{items.map((item) => (
				<div key={item.label}>
					<div className='mb-1 flex items-center justify-between'>
						<span className='text-[12px] text-l-text-3'>{item.label}</span>
						<span className='font-mono text-[11px] text-l-text-4'>{item.pct}%</span>
					</div>
					<div className='h-[3px] w-full rounded-full bg-l-surface-3'>
						<div
							className='h-full rounded-full'
							style={{
								width: `${item.pct}%`,
								background: item.pct >= 100 ? 'var(--l-accent-amber)' : 'var(--l-accent)',
							}}
						/>
					</div>
				</div>
			))}
		</div>
	);
}

// ─── FeaturesBento ────────────────────────────────────────────────────────────

export function FeaturesBento({ lead = false }: { lead?: boolean }) {
	const ref = useRef<HTMLElement>(null);
	useBentoStagger(ref);
	const Heading = lead ? 'h1' : 'h2';

	return (
		<section ref={ref} id='features' className='scroll-mt-24 py-24'>
			<div className='mx-auto max-w-[1184px] px-6 md:px-10 xl:px-12'>
				<MotionReveal>
					<div className='border-b border-l-border pb-8 lg:max-w-[65%]'>
						<SectionEyebrow label='Features' />
						<Heading className='mt-3 leading-[1.1] tracking-tight'>
							<span className='block text-[28px] font-bold text-l-text-1 sm:text-[34px] lg:text-[40px]'>
								Everything you need to budget and track
							</span>
						</Heading>
						<p className='mt-4 text-base text-l-text-3'>
							Every feature here ships today.
						</p>
					</div>
				</MotionReveal>

				{/*
				 * 3-row × 12-col grid. No row-span on any tile.
				 * Row 1: Transactions (4) · Budgets hero (5) · Goals (3)
				 * Row 2: Recurring+Import (4) · Reports+PDF (4) · Health score (4)
				 * Row 3: Multi-currency budgeting (5) · Budget anchor visual (7)
				 */}
				<div className='mt-0 grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-[auto_auto_auto]'>

					{/* ── Row 1 ── */}
					<FeatureTile n='01'
						title='One ledger, not four apps'
						body='When income arrives, you log it here. When a bill clears, it is here too. Income, expenses, transfers — one place, not a patchwork of apps and exports.'
						colSpan='lg:col-span-4' />
					<FeatureTile n='02'
						title='Know what is safe to spend'
						body='Set a limit per category each month and watch it fill, so overspending shows up before month-end, not after.'
						colSpan='lg:col-span-5'
						hero visual={<SpendingRing />} />
					<FeatureTile n='03'
						title='Save toward something real'
						body='Name a goal, link it to an account. Every amount you log toward it shows up as progress. Your intent, made visible.'
						colSpan='lg:col-span-3' />

					{/* ── Row 2 ── */}
					<FeatureTile n='04'
						title='Set recurring bills once. Import the rest.'
						body='Recurring expenses run themselves. Bring your bank history in via CSV — the wizard handles the matching.'
						colSpan='lg:col-span-4' />
					<FeatureTile n='05'
						title='Monthly recap, PDF when you need it'
						body='A summary hits your inbox each month. Export a PDF any time for your records or a client meeting.'
						colSpan='lg:col-span-4' />
					<FeatureTile n='06'
						title='Financial health score'
						body='One score tells you how the month is tracking — not a dashboard to interpret.'
						colSpan='lg:col-span-4'
						visual={<HealthGauge />} />

					{/* ── Row 3 ── */}
					<FeatureTile n='07'
						title='Multi-currency budgeting'
						body='Track and budget in any currency. Lock your base currency at setup.'
						colSpan='lg:col-span-5' wide />
					<FeatureTile n='08'
						title='Budget at a glance'
						body='Every envelope, every month. Colour tells you where you stand before you run the numbers.'
						colSpan='lg:col-span-7' wide
						visual={<BudgetAnchorVisual />} />

				</div>
			</div>
		</section>
	);
}
