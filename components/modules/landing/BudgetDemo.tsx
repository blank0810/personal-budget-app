'use client';

import { useRef, useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NumberTicker } from './ui/NumberTicker';
import { IncomeTimeline } from './ui/IncomeTimeline';
import { useMounted } from './ui/use-mounted';

// ─────────────────────────────────────────────────────────────────────────────
// 3. BUDGET DEMO
//    Fix #2: State C collapses to one big outcome number (₱25,290 saved),
//    dark accent surface, full card height. No more progress-bar panel in C.
//    Fix #7: `isAnimated` gated by `mounted` so SSR class = first-paint class.
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_A_ENVS = [
	{ cat: 'Groceries', pct: 12, warn: false },
	{ cat: 'Transport', pct: 8,  warn: false },
	{ cat: 'Software',  pct: 5,  warn: false },
	{ cat: 'Utilities', pct: 4,  warn: false },
] as const;

const DEMO_C_ENVS = [
	{ cat: 'Groceries', pct: 64, warn: false },
	{ cat: 'Transport', pct: 42, warn: false },
	{ cat: 'Software',  pct: 81, warn: true  },
	{ cat: 'Utilities', pct: 28, warn: false },
] as const;

const DEMO_GOAL_R = 20;
const DEMO_GOAL_C = 2 * Math.PI * DEMO_GOAL_R;

const DEMO_STEPS = [
	{
		num: '01', label: 'Before',
		title: 'Week 2. No income yet this month.',
		body: 'Envelopes are near empty. Health score 54. The month is open.',
	},
	{
		num: '02', label: 'You log it once',
		title: 'You enter the payment.',
		body: 'You type in the ₱64,200 deposit. One field, one save. That is your action.',
	},
	{
		num: '03', label: 'After',
		title: 'Clarity.',
		body: 'Budgets fill. Savings goal moves. Health score climbs to 71. Nothing happened automatically — you logged it, the app reflects it.',
	},
] as const;

export function BudgetDemo() {
	const mounted        = useMounted();
	const prefersReduced = useReducedMotion(); // always called; only READ after mount
	const sectionRef     = useRef<HTMLElement>(null);
	const pinRef         = useRef<HTMLDivElement>(null);
	const [step, setStep] = useState<0 | 1 | 2>(0);

	// isAnimated is stable during SSR and first paint (both false because mounted=false),
	// then switches to its real value after hydration.
	const isAnimated = mounted && !prefersReduced;

	useEffect(() => {
		if (!mounted) return;
		if (prefersReduced) return;
		const mq = window.matchMedia('(min-width: 1024px)');
		if (!mq.matches) return;
		const section = sectionRef.current;
		const pin     = pinRef.current;
		if (!section || !pin) return;

		let cancelled = false;
		let cleanup: (() => void) | undefined;

		import('gsap').then(({ gsap }) =>
			import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
				if (cancelled) return;
				gsap.registerPlugin(ScrollTrigger);
				const tl = gsap.timeline({
					defaults: { ease: 'none' },
					scrollTrigger: {
						trigger: section,
						start: 'top top', end: 'bottom bottom',
						scrub: 0.7, pin: pin,
						pinSpacing: true, anticipatePin: 1,
						onUpdate: (s) => {
							setStep(Math.min(2, Math.floor(s.progress * 3)) as 0 | 1 | 2);
						},
					},
				});
				tl.fromTo('[data-demo-form]',
					{ autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 0.25);
				tl.fromTo('[data-demo-save]',
					{ autoAlpha: 0, scale: 0.88 }, { autoAlpha: 1, scale: 1, duration: 0.2 }, 0.58);
				tl.to('[data-demo-bar]', {
					scaleX: (_i, el) => Number((el as HTMLElement).dataset.fill ?? 1),
					duration: 0.5, stagger: 0.06, ease: 'power2.out',
				}, 0.72);
				tl.fromTo('[data-demo-goal-ring]',
					{ '--demo-goal': 62 } as gsap.TweenVars,
					{ '--demo-goal': 68, duration: 0.3 } as gsap.TweenVars, 0.85);
				tl.fromTo('[data-demo-health-bar]',
					{ scaleX: 0.54 }, { scaleX: 0.71, duration: 0.35 }, 0.85);
				cleanup = () => { tl.scrollTrigger?.kill(); tl.kill(); };
			}),
		);
		return () => { cancelled = true; cleanup?.(); };
	}, [mounted, prefersReduced]);

	return (
		<section
			ref={sectionRef}
			id='budget-demo'
			aria-label='Budget demo'
			// lg:min-h-[250vh] only added after mount when GSAP will activate.
			// SSR and first paint both omit this class → no hydration mismatch.
			className={cn('relative scroll-mt-24', isAnimated && 'lg:min-h-[250vh]')}
		>
			<div
				ref={pinRef}
				className='flex flex-col justify-center py-20 lg:h-screen lg:py-0'
			>
				<div className='mx-auto w-full max-w-[1184px] px-6 md:px-10 xl:px-12'>
					<div className='mb-10 flex items-end gap-6 border-b border-l-border pb-6 lg:mb-12'>
						<span className='font-mono text-[64px] font-bold leading-none tracking-tighter text-l-surface-3 lg:text-[80px]'>
							03
						</span>
						<div>
							<h2 className='text-2xl font-semibold tracking-[-0.02em] text-l-text-1 sm:text-3xl lg:text-[34px]'>
								Your money, made clear.
							</h2>
							<p className='mt-1.5 text-base text-l-text-3'>
								A month, made clear — inside the app.
							</p>
						</div>
					</div>

					{isAnimated ? (
						<div className='grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px] lg:items-start lg:gap-12'>
							<DemoAnimatedView stepIndex={step} />
							<DemoSteps stepIndex={step} />
						</div>
					) : (
						<div className='flex flex-col gap-6'>
							<StaticDemoPanel state='A' />
							<StaticDemoPanel state='B' />
							<StaticDemoPanel state='C' />
						</div>
					)}
				</div>
			</div>
		</section>
	);
}

// ── Animated demo view (#2: State C = single big outcome, not more bars) ─────

function DemoAnimatedView({ stepIndex }: { stepIndex: 0 | 1 | 2 }) {
	const isC = stepIndex >= 2;
	const isB = stepIndex >= 1;

	return (
		<div className='rounded-xl border border-l-border overflow-hidden'>
			{/* Frame header */}
			<div className='border-b border-l-border bg-l-surface-1 px-5 py-3 flex items-center justify-between'>
				<div>
					<p className='text-[12px] font-semibold text-l-text-2'>May budgets</p>
					<p className='text-[10px] text-l-text-4'>Envelope view</p>
				</div>
				<span className='font-mono text-[10px] text-l-text-4'>May 2026</span>
			</div>

			{/* State C: full-card payoff number — collapses to one outcome */}
			{isC ? (
				<div
					className='flex flex-col items-center justify-center gap-3 px-8 py-14'
					style={{ background: 'oklch(0.215 0.04 155)' }}
				>
					<p className='text-[11px] font-semibold uppercase tracking-[0.1em] text-l-accent/80'>
						Net saved this month
					</p>
					{/* The product promise made visible — one oversized mono number */}
					<p
						className='font-mono font-bold leading-none tracking-tighter'
						style={{
							fontSize: 'clamp(56px, 8vw, 80px)',
							color: 'var(--l-accent)',
						}}
					>
						<NumberTicker value={25290} prefix='₱' durationMs={900} />
					</p>
					<p className='text-[13px] text-l-accent/70'>
						Health score: <strong className='text-l-accent'>71</strong>
						&ensp;·&ensp;Goal: <strong className='text-l-accent'>68%</strong>
					</p>
					<div className='mt-4 w-full max-w-[320px]'>
						<p className='mb-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-l-accent/60'>
							What you logged
						</p>
						<IncomeTimeline compact />
					</div>
				</div>
			) : (
				<div className='p-5 space-y-4'>
					{/* Income log form — GSAP reveals in step B */}
					<div
						data-demo-form
						className='opacity-0 rounded-lg border border-l-border bg-l-surface-1 p-4'
						aria-label='Income entry form'
					>
						<p className='mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-l-text-4'>
							Log income
						</p>
						<div className='flex flex-wrap items-center gap-2'>
							<div className='flex-1 min-w-[100px] rounded-md border border-l-border bg-l-bg px-3 py-2'>
								<p className='text-[9px] text-l-text-4'>Description</p>
								<p className='text-[12px] font-medium text-l-text-1'>Deposit · Acme Co</p>
							</div>
							<div className='rounded-md border border-l-border bg-l-bg px-3 py-2'>
								<p className='text-[9px] text-l-text-4'>Amount</p>
								<p
									className='font-mono text-[14px] font-bold'
									style={{ color: 'var(--l-accent-amber)' }}
								>
									₱64,200
								</p>
							</div>
							<div
								data-demo-save
								className='opacity-0 inline-flex items-center gap-1.5 rounded-md bg-l-accent px-3 py-2 text-[11px] font-semibold text-white'
							>
								<CheckCircle2 className='h-3 w-3' aria-hidden='true' />
								Saved
							</div>
						</div>
					</div>

					{/* Envelope bars — only shown in A/B */}
					<div className='space-y-3'>
						{DEMO_C_ENVS.map((e, i) => {
							const startPct = DEMO_A_ENVS[i]?.pct ?? 5;
							return (
								<div key={e.cat}>
									<div className='flex items-baseline justify-between mb-1'>
										<span
											className='text-[11px] font-medium'
											style={{ color: e.warn ? 'var(--l-accent-amber)' : 'var(--l-text-2)' }}
										>
											{e.cat}
										</span>
										<span
											className='font-mono text-[10px] tabular-nums'
											style={{ color: e.warn ? 'var(--l-accent-amber)' : 'var(--l-text-4)' }}
										>
											{e.pct}%
										</span>
									</div>
									<div className='h-2 w-full overflow-hidden rounded-sm bg-l-surface-3'>
										<div
											data-demo-bar
											data-fill={e.pct / 100}
											style={{
												transform: `scaleX(${startPct / 100})`,
												backgroundColor: e.warn ? 'var(--l-accent-amber)' : 'var(--l-accent)',
											}}
											className='h-2 w-full origin-left rounded-sm'
										/>
									</div>
								</div>
							);
						})}
					</div>

					{/* Health + goal — only in A/B */}
					<div className='grid grid-cols-2 gap-3 pt-1'>
						<div className='space-y-2'>
							<p className='text-[10px] uppercase tracking-[0.08em] text-l-text-4'>Health</p>
							<p className='font-mono text-[38px] font-bold leading-none tracking-tighter text-l-text-1'>
								54
							</p>
							<div className='h-1.5 w-full overflow-hidden rounded-sm bg-l-surface-3'>
								<div
									data-demo-health-bar
									className='h-1.5 w-full origin-left rounded-sm'
									style={{
										transform: 'scaleX(0.54)',
										backgroundColor: 'var(--l-accent-amber)',
									}}
								/>
							</div>
						</div>
						<div className='flex flex-col justify-between'>
							<p className='text-[10px] uppercase tracking-[0.08em] text-l-text-4'>Goal</p>
							<div className='flex items-center gap-3'>
								<span
									data-demo-goal-ring
									className='relative inline-flex shrink-0 items-center justify-center'
									style={{ ['--demo-goal' as string]: 62 } as React.CSSProperties}
								>
									<svg width={52} height={52} viewBox='0 0 52 52' className='-rotate-90' role='img' aria-label='Goal progress ring'>
										<circle cx={26} cy={26} r={DEMO_GOAL_R} fill='none' stroke='var(--l-surface-3)' strokeWidth={4} />
										<circle
											cx={26} cy={26} r={DEMO_GOAL_R}
											fill='none' stroke='var(--l-accent)' strokeWidth={4} strokeLinecap='round'
											strokeDasharray={DEMO_GOAL_C}
											style={{ strokeDashoffset: `calc(${DEMO_GOAL_C} - (${DEMO_GOAL_C} * var(--demo-goal) / 100))` }}
										/>
									</svg>
									<span className='absolute font-mono text-[11px] font-bold text-l-text-1'>
										62%
									</span>
								</span>
								<div>
									<p className='text-[11px] text-l-text-2'>Emergency fund</p>
									<p className='text-[11px] text-l-text-4'>₱0 logged yet</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

function DemoSteps({ stepIndex }: { stepIndex: 0 | 1 | 2 }) {
	return (
		<ol className='space-y-7' aria-label='Demo steps'>
			{DEMO_STEPS.map((s, i) => {
				const active = i === stepIndex;
				return (
					<li key={s.num} className={cn('transition-opacity duration-300', active ? 'opacity-100' : 'opacity-40')}>
						<div className='flex items-baseline gap-3'>
							<span className='font-mono text-[11px] text-l-text-4'>{s.num}</span>
							<span className={cn(
								'text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors duration-300',
								active ? 'text-l-accent' : 'text-l-text-4',
							)}>
								{s.label}
							</span>
						</div>
						<div className='mt-1.5 pl-[28px]'>
							<p className='text-sm font-semibold text-l-text-1'>{s.title}</p>
							<p className='mt-1 text-[13px] leading-relaxed text-l-text-3'>{s.body}</p>
						</div>
					</li>
				);
			})}
		</ol>
	);
}

// ── Static three-panel — mobile / reduced-motion ──────────────────────────────

function StaticDemoPanel({ state }: { state: 'A' | 'B' | 'C' }) {
	const isB = state === 'B';
	const isC = state === 'C';
	const step = DEMO_STEPS[state === 'A' ? 0 : state === 'B' ? 1 : 2];
	const envs = isC ? DEMO_C_ENVS : DEMO_A_ENVS;
	const goalPct = isC ? 68 : 62;
	const health  = isC ? 71 : 54;

	return (
		<div className={cn('overflow-hidden rounded-xl border', isC ? 'border-l-accent/25' : 'border-l-border')}>
			<div className={cn(
				'flex items-center gap-3 border-b px-5 py-3',
				isC ? 'border-l-accent/20 bg-l-accent-dim' : 'border-l-border bg-l-surface-1',
			)}>
				<span className='font-mono text-[11px] text-l-text-4'>{step.num}</span>
				<p className={cn('text-[11px] font-semibold uppercase tracking-[0.08em]', isC ? 'text-l-accent' : 'text-l-text-3')}>
					{step.label}
				</p>
				<p className='ml-1 text-sm font-medium text-l-text-1'>{step.title}</p>
			</div>

			{/* State C: single big outcome */}
			{isC ? (
				<div
					className='flex flex-col items-center justify-center gap-2 px-6 py-10 text-center'
					style={{ background: 'oklch(0.215 0.04 155)' }}
				>
					<p className='text-[11px] font-semibold uppercase tracking-[0.1em] text-l-accent/80'>
						Net saved this month
					</p>
					<p
						className='font-mono font-bold leading-none tracking-tighter'
						style={{ fontSize: 'clamp(48px, 10vw, 72px)', color: 'var(--l-accent)' }}
					>
						<NumberTicker value={25290} prefix='₱' durationMs={900} />
					</p>
					<p className='text-[13px] text-l-accent/70 mt-1'>
						Health 71&ensp;·&ensp;Goal 68%
					</p>
				</div>
			) : (
				<div className='space-y-4 p-5'>
					{isB && (
						<div className='rounded-lg border border-l-border bg-l-surface-1 p-4'>
							<p className='mb-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-l-text-4'>Log income</p>
							<div className='flex flex-wrap gap-2'>
								<div className='flex-1 min-w-[100px] rounded-md border border-l-border bg-l-bg px-3 py-2'>
									<p className='text-[9px] text-l-text-4'>Description</p>
									<p className='text-[12px] font-medium text-l-text-1 truncate'>Deposit · Acme Co</p>
								</div>
								<div className='rounded-md border border-l-border bg-l-bg px-3 py-2'>
									<p className='text-[9px] text-l-text-4'>Amount</p>
									<p className='font-mono text-[12px] font-bold' style={{ color: 'var(--l-accent-amber)' }}>₱64,200</p>
								</div>
								<div className='inline-flex items-center gap-1.5 rounded-md bg-l-accent px-3 py-2 text-[11px] font-semibold text-white'>
									<CheckCircle2 className='h-3 w-3' aria-hidden='true' />
									Saved
								</div>
							</div>
						</div>
					)}
					{!isB && (
						<div className='space-y-2.5'>
							{envs.map((e) => (
								<div key={e.cat}>
									<div className='flex items-baseline justify-between mb-1 text-[10px]'>
										<span style={{ color: 'warn' in e && e.warn ? 'var(--l-accent-amber)' : 'var(--l-text-2)' }}>{e.cat}</span>
										<span className='font-mono tabular-nums text-l-text-4'>{e.pct}%</span>
									</div>
									<div className='h-1.5 w-full overflow-hidden rounded-sm bg-l-surface-3'>
										<div style={{
											width: `${e.pct}%`, height: '100%', borderRadius: '2px',
											backgroundColor: 'warn' in e && e.warn ? 'var(--l-accent-amber)' : 'var(--l-accent)',
										}} />
									</div>
								</div>
							))}
						</div>
					)}
					{!isB && (
						<div className='flex items-center gap-6 border-t border-l-border pt-4'>
							<div>
								<p className='text-[9px] uppercase tracking-[0.08em] text-l-text-4'>Health</p>
								<p className='font-mono text-[32px] font-bold leading-none text-l-text-1'>{health}</p>
							</div>
							<div className='flex items-center gap-2.5'>
								<svg width={44} height={44} viewBox='0 0 52 52' className='-rotate-90' role='img' aria-label={`Goal ${goalPct}%`}>
									<circle cx={26} cy={26} r={DEMO_GOAL_R} fill='none' stroke='var(--l-surface-3)' strokeWidth={4} />
									<circle cx={26} cy={26} r={DEMO_GOAL_R} fill='none' stroke='var(--l-accent)' strokeWidth={4}
										strokeLinecap='round' strokeDasharray={DEMO_GOAL_C}
										strokeDashoffset={DEMO_GOAL_C - (DEMO_GOAL_C * goalPct) / 100} />
								</svg>
								<div>
									<p className='text-[10px] text-l-text-3'>Emergency fund</p>
									<p className='font-mono text-[13px] font-semibold text-l-accent'>{goalPct}%</p>
								</div>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
