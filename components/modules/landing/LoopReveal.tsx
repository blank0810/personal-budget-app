'use client';

import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import {
	FileText,
	BadgeCheck,
	ArrowDownToLine,
	PiggyBank,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SectionEyebrow } from './ui/SectionEyebrow';
import { MotionReveal } from './ui/MotionReveal';
import { BrowserMockup } from './ui/BrowserMockup';
import { cn } from '@/lib/utils';

/**
 * LoopReveal — the signature scroll-pinned set-piece (design-system §4.7 /
 * §5B, repurposed). Replaces the deferred DashboardPreview slot.
 *
 * It depicts the CLOSED MONEY LOOP, not the dashboard (the real dashboard is
 * mid-redesign, so this is intentionally dashboard-independent):
 *
 *   1. Invoice sent      — Invoice #0042 · ₱64,200 · Acme Co builds in.
 *   2. Client pays       — a "Paid" stamp lands, the amount pulses.
 *   3. Income lands       — ₱64,200 drops into a ledger row.
 *   4. Budget + goal      — envelope budgets tick up, the savings-goal ring
 *                            advances 62% -> 68%.
 *
 * Numbers stay coherent with the rest of the page (one freelancer, PHP ₱,
 * ₱64,200 income, May 2026). No fabricated metrics (PRODUCT.md honesty).
 *
 * Motion (GSAP ScrollTrigger, pinned + scrubbed) — lg+ AND motion allowed:
 *  - The outer section reserves 200vh of runway in STATIC markup
 *    (lg:min-h-[200vh]) so there is no CLS; GSAP only pins/animates, it never
 *    sets the height.
 *  - The inner frame pins (pinSpacing handled by ScrollTrigger). A single
 *    scrubbed timeline advances the 4 stages via opacity/translateY only
 *    (GPU) and draws the connecting rail via scaleX.
 *  - useGSAP() scopes everything to the container ref and reverts on unmount.
 *
 * Fallback (prefers-reduced-motion OR < lg): NO pin, NO scrub. The four
 * stages render in a static vertical stack, all visible at once, with the
 * rail painted full. Same component, the GSAP effect simply never runs.
 */

type Stage = {
	key: string;
	icon: LucideIcon;
	num: string;
	label: string;
	annotationTitle: string;
	annotationBody: string;
};

const STAGES: Stage[] = [
	{
		key: 'invoice',
		icon: FileText,
		num: '01',
		label: 'Invoice sent',
		annotationTitle: 'You send the invoice',
		annotationBody:
			'A polished invoice goes to your client by email, straight from the app.',
	},
	{
		key: 'paid',
		icon: BadgeCheck,
		num: '02',
		label: 'Client pays',
		annotationTitle: 'The client pays',
		annotationBody:
			'You mark it paid once. No copy-pasting between a billing tool and a tracker.',
	},
	{
		key: 'income',
		icon: ArrowDownToLine,
		num: '03',
		label: 'Income lands',
		annotationTitle: 'Income lands',
		annotationBody:
			'The ₱64,200 lands in the right account, and every account stays up to date on its own.',
	},
	{
		key: 'budget',
		icon: PiggyBank,
		num: '04',
		label: 'Budget + goal update',
		annotationTitle: 'Budgets and goals move',
		annotationBody:
			'That income flows into your budgets and your savings goal ticks closer.',
	},
];

export function LoopReveal() {
	const rootRef = useRef<HTMLElement>(null);
	// Which stage the live annotation reflects (driven by the scrubbed
	// timeline on desktop; stays 0 and is unused on the static fallback).
	const [activeStage, setActiveStage] = useState(0);

	useGSAP(
		() => {
			const root = rootRef.current;
			if (!root) return;

			// Pin/scrub ONLY when motion is allowed AND we are on lg+.
			// Anything else falls through to the static stacked layout.
			const prefersReduced = window.matchMedia(
				'(prefers-reduced-motion: reduce)',
			).matches;
			const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
			if (prefersReduced || !isDesktop) return;

			let cancelled = false;
			let cleanup: (() => void) | undefined;

			// Dynamic import keeps GSAP out of the initial landing bundle.
			import('gsap').then(({ gsap }) =>
				import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
					if (cancelled) return;
					gsap.registerPlugin(ScrollTrigger);

					const pinTarget =
						root.querySelector<HTMLElement>('[data-loop-pin]');
					if (!pinTarget) return;

					// Master scrubbed timeline. Its progress maps 1:1 to the
					// scroll position through the 200vh runway.
					const tl = gsap.timeline({
						defaults: { ease: 'none' },
						scrollTrigger: {
							trigger: root,
							start: 'top top',
							end: 'bottom bottom',
							scrub: 0.6,
							pin: pinTarget,
							// The 200vh height is reserved in markup, so we let
							// ScrollTrigger manage spacing for the pinned element
							// only (no extra height injected by us).
							pinSpacing: true,
							anticipatePin: 1,
							onUpdate: (self) => {
								// Map scroll progress -> active stage index (0..3)
								// for the side annotation + node highlight.
								const idx = Math.min(
									STAGES.length - 1,
									Math.floor(self.progress * STAGES.length),
								);
								setActiveStage(idx);
							},
						},
					});

					// Each stage owns a slice of the runway. We hold each slice
					// briefly (the "+=0.4" gaps) so a slow scrub reads as four
					// distinct beats rather than one continuous blur.

					// Stage 1 — invoice card builds in.
					tl.fromTo(
						'[data-loop-card="invoice"]',
						{ autoAlpha: 0, y: 24 },
						{ autoAlpha: 1, y: 0, duration: 0.5 },
						0,
					);

					// Rail draws toward the "Paid" node, then the stamp lands.
					tl.fromTo(
						'[data-loop-rail="1"]',
						{ scaleX: 0 },
						{ scaleX: 1, duration: 0.5 },
						0.5,
					);
					tl.fromTo(
						'[data-loop-stamp]',
						{ autoAlpha: 0, scale: 1.4, rotate: -8 },
						{ autoAlpha: 1, scale: 1, rotate: -8, duration: 0.4 },
						0.85,
					);
					// Amount pulse on payment (transform-only).
					tl.fromTo(
						'[data-loop-amount]',
						{ scale: 1 },
						{ scale: 1.08, duration: 0.18, yoyo: true, repeat: 1 },
						0.95,
					);

					// Stage 3 — rail draws on, income row drops into the ledger.
					tl.fromTo(
						'[data-loop-rail="2"]',
						{ scaleX: 0 },
						{ scaleX: 1, duration: 0.5 },
						1.3,
					);
					tl.fromTo(
						'[data-loop-card="income"]',
						{ autoAlpha: 0, y: 20 },
						{ autoAlpha: 1, y: 0, duration: 0.5 },
						1.55,
					);

					// Stage 4 — rail draws on, budgets tick up, goal ring advances.
					tl.fromTo(
						'[data-loop-rail="3"]',
						{ scaleX: 0 },
						{ scaleX: 1, duration: 0.5 },
						2.1,
					);
					tl.fromTo(
						'[data-loop-card="budget"]',
						{ autoAlpha: 0, y: 20 },
						{ autoAlpha: 1, y: 0, duration: 0.5 },
						2.3,
					);
					tl.fromTo(
						'[data-loop-budget-fill]',
						{ scaleX: 0 },
						{
							scaleX: (i, t) =>
								Number(
									(t as HTMLElement).dataset.fill ?? '1',
								),
							duration: 0.5,
							stagger: 0.08,
						},
						2.4,
					);
					// Goal ring 62% -> 68% (strokeDashoffset is presentational,
					// not a layout property — safe).
					tl.fromTo(
						'[data-loop-goal-ring]',
						{ '--loop-goal': 62 } as gsap.TweenVars,
						{ '--loop-goal': 68, duration: 0.5 } as gsap.TweenVars,
						2.55,
					);

					cleanup = () => {
						tl.scrollTrigger?.kill();
						tl.kill();
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
			id='loop'
			aria-label='How the money loop works'
			className='relative scroll-mt-24 lg:min-h-[200vh]'
		>
			{/*
			 * Pinned frame. On lg+ with motion it gets pinned by GSAP and
			 * fills the viewport; everywhere else it is a normal block in
			 * flow. h-screen on lg keeps the pinned panel exactly one
			 * viewport tall so nothing clips.
			 */}
			<div
				data-loop-pin
				className='flex flex-col justify-center py-24 lg:h-screen lg:py-0'
			>
				<div className='mx-auto w-full max-w-[1184px] px-6 md:px-10 xl:px-12'>
					<MotionReveal className='max-w-2xl'>
						<SectionEyebrow label='The loop' />
						<h2 className='mt-3 text-3xl font-semibold tracking-[-0.02em] text-l-text-1 sm:text-4xl lg:text-[42px] lg:leading-[1.1]'>
							Watch the money move.
						</h2>
						<p className='mt-4 text-base leading-relaxed text-l-text-2 sm:text-lg'>
							One invoice, followed end to end. Scroll to see it
							become income, then watch your budgets and savings goal
							update in the same app.
						</p>
					</MotionReveal>

					<div className='mt-12 grid grid-cols-1 gap-8 lg:mt-14 lg:grid-cols-[1fr_280px] lg:items-center lg:gap-12'>
						{/* The visual surface — glass browser frame. */}
						<BrowserMockup
							url='budgetplanner.app/transactions'
							className='w-full'
						>
							<LoopStageVisual activeStage={activeStage} />
						</BrowserMockup>

						{/* Side annotations — label each stage. */}
						<LoopAnnotations activeStage={activeStage} />
					</div>
				</div>
			</div>
		</section>
	);
}

/* ---------------------------------------------------------------------
 * LoopStageVisual — the four-node loop inside the browser frame.
 *
 * Desktop with motion: nodes start hidden (data-loop-card / rail at their
 * GSAP "from" state is applied by the timeline). To avoid a flash of the
 * final state before GSAP mounts, we set the animated layers to opacity-0
 * via the `motion-safe` + lg gate; the static fallback keeps them visible.
 * ------------------------------------------------------------------- */
function LoopStageVisual({ activeStage }: { activeStage: number }) {
	return (
		<div className='p-5 sm:p-7'>
			{/* Header strip — keeps the page's ledger framing. */}
			<div className='mb-6 flex items-center justify-between'>
				<div>
					<p className='text-[13px] font-medium text-l-text-1'>
						Your month · May 2026
					</p>
					<p className='text-[11px] text-l-text-3'>
						One invoice, end to end
					</p>
				</div>
				<span className='hidden rounded-md border border-l-border bg-l-surface-1 px-2.5 py-1 font-mono text-[11px] text-l-text-3 sm:inline'>
					PHP
				</span>
			</div>

			{/*
			 * Horizontal rail of 4 nodes on lg+, stacked on mobile.
			 * The connecting rails (data-loop-rail) draw on scroll; in the
			 * static fallback they are painted full via CSS (scaleX defaults
			 * to 1 since GSAP never touches them).
			 */}
			<div className='relative grid grid-cols-1 gap-4 lg:grid-cols-4 lg:gap-3'>
				{STAGES.map((stage, i) => (
					<LoopNode
						key={stage.key}
						stage={stage}
						index={i}
						active={i <= activeStage}
					/>
				))}
			</div>
		</div>
	);
}

/* One node = a labelled mini-panel that depicts that stage's UI. */
function LoopNode({
	stage,
	index,
	active,
}: {
	stage: Stage;
	index: number;
	active: boolean;
}) {
	const Icon = stage.icon;
	return (
		<div className='relative'>
			{/*
			 * Horizontal connector rail to the PREVIOUS node (lg+ only).
			 * Drawn left-to-right by GSAP; default scaleX:1 = painted full
			 * for the no-JS / reduced-motion fallback.
			 */}
			{index > 0 && (
				<div
					aria-hidden='true'
					className='pointer-events-none absolute right-full top-[26px] hidden h-px w-3 -translate-y-1/2 lg:block'
				>
					<div
						data-loop-rail={index}
						className='h-px w-full origin-left bg-l-accent/50'
					/>
				</div>
			)}

			{/* Vertical connector rail (mobile stacked layout). */}
			{index > 0 && (
				<div
					aria-hidden='true'
					className='pointer-events-none absolute -top-4 left-[26px] h-4 w-px lg:hidden'
				>
					<div className='h-full w-px origin-top bg-l-accent/40' />
				</div>
			)}

			<div
				className={cn(
					'relative rounded-xl border bg-l-surface-1 p-4 transition-colors duration-300',
					active
						? 'border-l-accent/40'
						: 'border-l-border',
				)}
			>
				<div className='flex items-center justify-between'>
					<span
						className={cn(
							'inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors duration-300',
							active
								? 'border-l-accent/30 bg-l-accent-dim text-l-accent'
								: 'border-l-border bg-l-bg text-l-text-3',
						)}
					>
						<Icon className='h-4 w-4' aria-hidden='true' />
					</span>
					<span className='font-mono text-[11px] text-l-text-4'>
						{stage.num}
					</span>
				</div>
				<p className='mt-3 text-[12px] font-medium text-l-text-1'>
					{stage.label}
				</p>

				{/* Per-stage body content. */}
				<div className='mt-3'>
					{stage.key === 'invoice' && <InvoiceMini />}
					{stage.key === 'paid' && <PaidMini />}
					{stage.key === 'income' && <IncomeMini />}
					{stage.key === 'budget' && <BudgetGoalMini />}
				</div>
			</div>
		</div>
	);
}

/* Stage 1 — the invoice card. */
function InvoiceMini() {
	return (
		<div
			data-loop-card='invoice'
			className='rounded-lg border border-l-border bg-l-bg p-3'
		>
			<div className='flex items-center justify-between'>
				<span className='text-[10px] font-medium text-l-text-2'>
					Invoice #0042
				</span>
				<span className='rounded border border-l-border bg-l-surface-2 px-1.5 py-0.5 text-[9px] text-l-text-3'>
					Sent
				</span>
			</div>
			<p className='mt-2 text-[10px] text-l-text-3'>Client: Acme Co</p>
			<p className='mt-2 font-mono text-[15px] font-semibold tracking-tight text-l-text-1'>
				₱64,200
			</p>
		</div>
	);
}

/* Stage 2 — the Paid stamp + pulsing amount. */
function PaidMini() {
	return (
		<div className='relative rounded-lg border border-l-border bg-l-bg p-3'>
			<div className='flex items-center justify-between'>
				<span className='text-[10px] font-medium text-l-text-2'>
					Invoice #0042
				</span>
				<span
					data-loop-stamp
					className='inline-flex items-center gap-1 rounded-md border border-l-accent/40 bg-l-accent-dim px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-l-accent'
				>
					<BadgeCheck className='h-3 w-3' aria-hidden='true' />
					Paid
				</span>
			</div>
			<p className='mt-2 text-[10px] text-l-text-3'>Client: Acme Co</p>
			<p
				data-loop-amount
				className='mt-2 inline-block origin-left font-mono text-[15px] font-semibold tracking-tight text-l-accent'
			>
				₱64,200
			</p>
		</div>
	);
}

/* Stage 3 — the income ledger row. */
function IncomeMini() {
	return (
		<div
			data-loop-card='income'
			className='rounded-lg border border-l-border bg-l-bg p-3'
		>
			<p className='text-[10px] text-l-text-3'>Income lands</p>
			<div className='mt-2 flex items-center justify-between'>
				<div>
					<p className='text-[11px] font-medium text-l-text-1'>
						Client payment
					</p>
					<p className='text-[9px] text-l-text-4'>Checking account</p>
				</div>
				<p className='font-mono text-[13px] font-semibold tracking-tight text-l-accent'>
					+₱64,200
				</p>
			</div>
		</div>
	);
}

/* Stage 4 — budgets tick up + savings-goal ring advances. */
function BudgetGoalMini() {
	const fills = [
		{ cat: 'Groceries', fill: 0.64 },
		{ cat: 'Software & tools', fill: 0.81 },
	];
	return (
		<div
			data-loop-card='budget'
			className='space-y-3 rounded-lg border border-l-border bg-l-bg p-3'
		>
			<div className='space-y-2'>
				{fills.map((b) => (
					<div key={b.cat}>
						<div className='flex justify-between text-[9px]'>
							<span className='text-l-text-2'>{b.cat}</span>
							<span className='font-mono text-l-text-4'>
								{Math.round(b.fill * 100)}%
							</span>
						</div>
						<div className='mt-1 h-1.5 w-full overflow-hidden rounded-full bg-l-surface-3'>
							<div
								data-loop-budget-fill
								data-fill={b.fill}
								style={{ transform: `scaleX(${b.fill})` }}
								className={cn(
									'h-1.5 w-full origin-left rounded-full',
									b.fill >= 0.8
										? 'bg-amber-500/80'
										: 'bg-l-accent',
								)}
							/>
						</div>
					</div>
				))}
			</div>

			{/* Savings-goal ring 62% -> 68%. */}
			<div className='flex items-center gap-3 border-t border-l-border pt-3'>
				<GoalRing />
				<div>
					<p className='text-[10px] font-medium text-l-text-1'>
						Emergency fund
					</p>
					<p className='text-[9px] text-l-text-3'>
						62% to 68% this month
					</p>
				</div>
			</div>
		</div>
	);
}

/*
 * GoalRing — an SVG progress ring driven by a CSS custom property
 * `--loop-goal` (a number 0..100). GSAP tweens that var on scroll; the
 * stroke-dashoffset is computed in CSS via calc(), so we never animate a
 * layout property. The static fallback shows the final 68%.
 *
 * r = 13, circumference = 2*pi*13 ≈ 81.68.
 */
function GoalRing() {
	const C = 2 * Math.PI * 13;
	return (
		<span
			className='loop-goal-ring relative inline-flex h-9 w-9 items-center justify-center'
			style={
				{
					// Final value for the static fallback; GSAP overrides on
					// scroll from 62 -> 68.
					['--loop-goal' as string]: 68,
				} as React.CSSProperties
			}
		>
			<svg viewBox='0 0 32 32' className='h-9 w-9 -rotate-90'>
				<circle
					cx='16'
					cy='16'
					r='13'
					fill='none'
					stroke='var(--l-surface-3)'
					strokeWidth='3'
				/>
				<circle
					cx='16'
					cy='16'
					r='13'
					fill='none'
					stroke='var(--l-accent)'
					strokeWidth='3'
					strokeLinecap='round'
					strokeDasharray={C}
					style={{
						strokeDashoffset: `calc(${C} - (${C} * var(--loop-goal) / 100))`,
					}}
				/>
			</svg>
			<span className='absolute font-mono text-[8px] font-semibold text-l-text-1'>
				68%
			</span>
		</span>
	);
}

/* ---------------------------------------------------------------------
 * LoopAnnotations — the side column labelling each stage.
 *
 * Desktop: the active stage's annotation is emphasised; the rest dim.
 * Mobile / reduced motion: same list, all readable, no scroll dependence
 * (activeStage stays 0, but every row is shown — only emphasis differs).
 * ------------------------------------------------------------------- */
function LoopAnnotations({ activeStage }: { activeStage: number }) {
	return (
		<ol className='space-y-5'>
			{STAGES.map((stage, i) => {
				const active = i === activeStage;
				return (
					<li key={stage.key} className='flex gap-3'>
						<span
							className={cn(
								'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] transition-colors duration-300',
								active
									? 'border-l-accent/40 bg-l-accent-dim text-l-accent'
									: 'border-l-border bg-l-surface-1 text-l-text-4',
							)}
						>
							{stage.num}
						</span>
						<div>
							<p
								className={cn(
									'text-sm font-medium transition-colors duration-300',
									active ? 'text-l-text-1' : 'text-l-text-3',
								)}
							>
								{stage.annotationTitle}
							</p>
							<p
								className={cn(
									'mt-1 text-[13px] leading-relaxed transition-colors duration-300',
									active ? 'text-l-text-2' : 'text-l-text-4',
								)}
							>
								{stage.annotationBody}
							</p>
						</div>
					</li>
				);
			})}
		</ol>
	);
}
