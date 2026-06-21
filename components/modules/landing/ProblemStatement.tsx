'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { Wallet, FileText, Table2, X } from 'lucide-react';
import { m, useReducedMotion, type Variants } from 'motion/react';
import { useMounted } from './ui/use-mounted';
import { SectionIndex } from './ui/SectionIndex';
import { cn } from '@/lib/utils';

/**
 * ProblemStatement — the honest "before" diagram (master IA §4, line 60:
 * "Before-diagram (3 disconnected tools)").
 *
 * This is deliberately NOT the repeated centered-heading + three identical
 * fade-up cards. It is an off-grid editorial composition:
 *
 *  - Left rail: SectionIndex + a maximalist .l-h2 headline + a short honest
 *    lede. It stays narrow and column-anchored.
 *  - Right (and below on mobile): a wide diagram of THREE disconnected tools
 *    — a budgeting app, a separate invoicing tool, a spreadsheet — scattered
 *    off-grid (each tile nudged to a different baseline). Dashed connectors
 *    run between them but never meet: each one terminates at a small "✕"
 *    break marker, so you read the money falling through the gap.
 *  - Three honest pain captions hang under the diagram, each tied to one tool.
 *
 * Honesty (PRODUCT.md): no fabricated metrics, no competitor names presented
 * as fact — the tiles are archetypes ("Budgeting app", "Invoicing tool",
 * "Spreadsheet"), not branded.
 *
 * Motion:
 *  - Heading/lede reveal via Framer `m.*` under the layout's LazyMotion, gated
 *    by a single useReducedMotion(), viewport once.
 *  - The diagram assembles on scroll via GSAP useGSAP() (scoped + auto-revert):
 *    the three tiles settle in, then the severed connectors draw outward from
 *    the break and the "✕" markers snap in — emphasising the break. No-ops
 *    under prefers-reduced-motion (everything painted at final state). The
 *    tiles/connectors reserve their space in static markup, so no CLS.
 */

type Tool = {
	key: string;
	icon: typeof Wallet;
	name: string;
	rows: { label: string; value: string; accent?: boolean }[];
	caption: string;
};

const TOOLS: Tool[] = [
	{
		key: 'budget',
		icon: Wallet,
		name: 'Budgeting app',
		rows: [
			{ label: 'Groceries', value: '64%' },
			{ label: 'Software', value: '81%' },
		],
		caption:
			'Variable income breaks the math. When every month is a different number, "what can I actually spend?" stops being a simple question.',
	},
	{
		key: 'invoice',
		icon: FileText,
		name: 'Invoicing tool',
		rows: [
			{ label: 'Invoice #0042', value: 'Sent' },
			{ label: 'Acme Co', value: '₱64,200', accent: true },
		],
		caption:
			'Invoicing lives in another tool. You bill clients in one app and budget in another, so what you earned never lines up with what you planned.',
	},
	{
		key: 'sheet',
		icon: Table2,
		name: 'Spreadsheet',
		rows: [
			{ label: 'May total', value: 'manual' },
			{ label: 'Totals', value: 'month-end' },
		],
		caption:
			'You only see the damage at month-end. By the time the numbers add up, the overspend already happened. Looking back cannot help you steer.',
	},
];

export function ProblemStatement({ lead = false }: { lead?: boolean }) {
	const prefersReduced = useReducedMotion();
	const mounted = useMounted();
	const rootRef = useRef<HTMLDivElement>(null);
	const Heading = lead ? 'h1' : 'h2';

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

					const tl = gsap.timeline({
						scrollTrigger: {
							trigger: root,
							start: 'top 72%',
						},
					});

					// 1. The three disconnected tools settle in, each from a
					//    slightly different offset (off-grid feel).
					tl.from('[data-pain-tile]', {
						autoAlpha: 0,
						y: 28,
						duration: 0.55,
						stagger: 0.14,
						ease: 'power2.out',
					});

					// 2. The severed connectors draw OUTWARD from the gap — they
					//    grow toward each tile but stop short, never meeting.
					tl.from(
						'[data-pain-link]',
						{
							scaleX: 0,
							transformOrigin: 'right center',
							duration: 0.5,
							stagger: 0.1,
							ease: 'power2.out',
						},
						'-=0.15',
					);

					// 3. The break markers snap in — the emphasised "money falls
					//    through here" beat (small overshoot, then settle).
					tl.from(
						'[data-pain-break]',
						{
							autoAlpha: 0,
							scale: 0.4,
							duration: 0.4,
							stagger: 0.12,
							ease: 'back.out(2.2)',
						},
						'-=0.2',
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
		<section className='relative overflow-hidden py-24 sm:py-28'>
			<div className='mx-auto max-w-[1184px] px-6 md:px-10 xl:px-12'>
				{/*
				 * Asymmetric two-column shell: a narrow editorial rail on the
				 * left, the wide diagram on the right. Stacks on mobile.
				 */}
				<div className='grid grid-cols-1 gap-x-12 gap-y-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start'>
					<m.div
						variants={heading}
						initial='hidden'
						whileInView='visible'
						viewport={{ once: true, amount: 0.5 }}
						className='lg:pt-6'
					>
						<SectionIndex index='01' label='The problem' tone='dark' />
						<Heading className='l-h2 mt-6 text-balance'>
							Budgeting apps track your past. This one plans your
							future.
						</Heading>
						<p className='mt-6 max-w-md text-base leading-relaxed text-l-text-2 sm:text-lg'>
							If you earn on your own terms, the usual setup is three
							tools that never talk to each other. The money you make
							falls through the gaps between them.
						</p>
					</m.div>

					{/* The "before" diagram — the centerpiece. */}
					<div ref={rootRef} className='relative'>
						<div className='relative grid grid-cols-1 gap-y-7 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-0'>
							{/*
							 * Severed connectors (sm+ only). Each sits in the gap
							 * BETWEEN two tiles: two short dashed segments that
							 * grow toward their tiles but stop short of a central
							 * "✕" break marker. Decorative.
							 */}
							<SeveredLink className='left-[33.333%] sm:flex' />
							<SeveredLink className='left-[66.666%] sm:flex' />

							{TOOLS.map((tool, i) => (
								<ToolTile key={tool.key} tool={tool} index={i} />
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

/* ---------------------------------------------------------------------
 * SeveredLink — a broken connector between two adjacent tiles. Two dashed
 * segments grow toward the tiles from a central gap; a small "✕" sits in the
 * gap as the break marker. Positioned absolutely in the gutter (sm+); hidden
 * on mobile where tiles stack and the break reads as vertical spacing.
 * ------------------------------------------------------------------- */
function SeveredLink({ className }: { className?: string }) {
	return (
		<div
			aria-hidden='true'
			className={cn(
				'pointer-events-none absolute top-[34px] hidden -translate-x-1/2 items-center',
				className,
			)}
		>
			{/* Left segment — grows leftward (toward the previous tile). */}
			<span
				data-pain-link
				className='block h-px w-7 origin-right border-t border-dashed border-l-border-mid'
			/>
			{/* The break: a small ✕ in the gap. */}
			<span
				data-pain-break
				className='mx-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-l-border bg-l-surface-1 text-l-text-3'
			>
				<X className='h-3 w-3' />
			</span>
			{/* Right segment — grows rightward (toward the next tile). */}
			<span
				data-pain-link
				className='block h-px w-7 origin-left border-t border-dashed border-l-border-mid'
			/>
		</div>
	);
}

/* ---------------------------------------------------------------------
 * ToolTile — one disconnected tool, a dark glass tile with a tiny faux-UI
 * preview, plus its honest pain caption hung beneath. The off-grid feel comes
 * from a per-column vertical nudge so the three tiles do not sit on one
 * baseline.
 * ------------------------------------------------------------------- */
function ToolTile({ tool, index }: { tool: Tool; index: number }) {
	const Icon = tool.icon;
	// Staggered baselines for the off-grid composition (sm+ only).
	const offset = ['sm:mt-0', 'sm:mt-10', 'sm:mt-4'][index] ?? 'sm:mt-0';

	return (
		<div data-pain-tile className={cn('relative', offset)}>
			<div className='l-glass rounded-2xl p-5'>
				<div className='flex items-center justify-between'>
					<span className='inline-flex h-9 w-9 items-center justify-center rounded-xl bg-l-surface-2 text-l-text-3'>
						<Icon className='h-4.5 w-4.5' aria-hidden='true' />
					</span>
					<span className='font-mono text-[10px] uppercase tracking-[0.12em] text-l-text-4'>
						isolated
					</span>
				</div>
				<p className='mt-4 text-sm font-medium text-l-text-1'>
					{tool.name}
				</p>
				<div className='mt-3 space-y-2'>
					{tool.rows.map((row) => (
						<div
							key={row.label}
							className='flex items-center justify-between rounded-lg border border-l-border bg-l-bg/60 px-2.5 py-1.5'
						>
							<span className='text-[11px] text-l-text-3'>
								{row.label}
							</span>
							<span
								className={cn(
									'font-mono text-[11px]',
									row.accent
										? 'text-l-accent'
										: 'text-l-text-2',
								)}
							>
								{row.value}
							</span>
						</div>
					))}
				</div>
			</div>

			{/* Honest pain caption, tied to this tool. */}
			<p className='mt-4 text-[13px] leading-relaxed text-l-text-3'>
				{tool.caption}
			</p>
		</div>
	);
}
