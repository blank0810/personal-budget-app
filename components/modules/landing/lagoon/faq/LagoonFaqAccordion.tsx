'use client';

import { useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { FAQ_GROUPS, type FaqEntry } from './faq-data';

// ─── Chevron icon ─────────────────────────────────────────────────────────────

function Chevron({ isOpen, prefersReduced }: { isOpen: boolean; prefersReduced: boolean }) {
	return (
		<svg
			aria-hidden='true'
			width='18'
			height='18'
			viewBox='0 0 18 18'
			fill='none'
			style={{
				flexShrink: 0,
				color: isOpen ? 'var(--lagoon-accent)' : 'var(--lagoon-muted)',
				transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
				transition: prefersReduced
					? 'none'
					: 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1), color 220ms ease',
			}}
		>
			<path
				d='m4.5 7.2 3.793 3.793a1 1 0 0 0 1.414 0L13.5 7.2'
				stroke='currentColor'
				strokeWidth='1.5'
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
		</svg>
	);
}

// ─── Single FAQ item ──────────────────────────────────────────────────────────

/**
 * Always renders the answer <p> in the DOM — CSS grid-template-rows collapse
 * (0fr ↔ 1fr) controls visibility instead of conditional mounting.
 *
 * This ensures every answer's text is present in the SSR HTML so AI crawlers
 * and GEO parsers can read all 11 answers from the raw response body, not just
 * the one item that happens to be expanded on initial render.
 */
function FaqItem({
	q,
	a,
	isOpen,
	onToggle,
	id,
	prefersReduced,
}: {
	q: string;
	a: string;
	isOpen: boolean;
	onToggle: () => void;
	id: string;
	prefersReduced: boolean;
}) {
	const panelTransition = prefersReduced
		? 'none'
		: 'grid-template-rows 300ms cubic-bezier(0.16, 1, 0.3, 1), opacity 220ms ease';

	return (
		<div className='border-b border-[var(--lagoon-border)] last:border-b-0'>
			<button
				type='button'
				onClick={onToggle}
				aria-expanded={isOpen}
				aria-controls={`faq-panel-${id}`}
				id={`faq-btn-${id}`}
				className='flex w-full cursor-pointer items-start justify-between gap-4 py-5 text-left focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lagoon-accent)]'
			>
				<span
					className='text-[16px] font-semibold leading-[1.4] tracking-[-0.01em]'
					style={{
						color: isOpen ? 'var(--lagoon-accent)' : 'var(--lagoon-ink)',
						transition: prefersReduced ? 'none' : 'color 220ms ease',
					}}
				>
					{q}
				</span>
				<Chevron isOpen={isOpen} prefersReduced={prefersReduced} />
			</button>

			{/*
			 * Panel — always in DOM so SSR HTML contains all answer text.
			 * CSS grid-template-rows: 0fr → 1fr collapses/expands without
			 * unmounting — the text node is present regardless of open state.
			 * Inner div requires min-height: 0 for the grid collapse to work.
			 */}
			<div
				id={`faq-panel-${id}`}
				role='region'
				aria-labelledby={`faq-btn-${id}`}
				aria-hidden={!isOpen}
				className='grid overflow-hidden'
				style={{
					gridTemplateRows: isOpen ? '1fr' : '0fr',
					opacity: isOpen ? 1 : 0,
					transition: panelTransition,
				}}
			>
				<div style={{ minHeight: 0 }}>
					<p className='pb-5 pr-8 text-[15px] leading-[1.7] text-[var(--lagoon-body)]'>{a}</p>
				</div>
			</div>
		</div>
	);
}

// ─── FAQ group ────────────────────────────────────────────────────────────────

function FaqGroup({
	label,
	items,
	defaultOpen,
	prefersReduced,
	groupIndex,
}: {
	label: string;
	items: FaqEntry[];
	defaultOpen: number;
	prefersReduced: boolean;
	groupIndex: number;
}) {
	const [openIdx, setOpenIdx] = useState<number>(defaultOpen);
	const slug = `g${groupIndex}`;

	const toggle = (i: number) => setOpenIdx((prev) => (prev === i ? -1 : i));

	return (
		<div>
			{/* Category label — styled as teal eyebrow, semantic h2 for heading nav */}
			<h2
				id={`faq-group-${slug}`}
				className='mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--lagoon-accent)]'
			>
				{label}
			</h2>

			{/* Accordion items */}
			<div aria-labelledby={`faq-group-${slug}`}>
				{items.map((item, i) => (
					<FaqItem
						key={i}
						q={item.q}
						a={item.a}
						isOpen={openIdx === i}
						onToggle={() => toggle(i)}
						id={`${slug}-${i}`}
						prefersReduced={prefersReduced}
					/>
				))}
			</div>
		</div>
	);
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * LagoonFaqAccordion — animated, grouped FAQ accordion.
 *
 * - All 11 answers are server-rendered into the initial HTML (CSS collapse,
 *   not conditional mounting) — every answer is readable by AI/GEO crawlers.
 * - Smooth height animation via CSS grid-template-rows transition (0fr ↔ 1fr)
 * - Rotating chevron on open/close
 * - Teal active colour on question text
 * - One item open at a time per group; first item of first group defaults open
 * - Respects prefers-reduced-motion (duration: 0, no transforms)
 * - Client component — LazyMotion comes from the parent layout
 * - Q&A data imported from faq-data.ts (shared with page JSON-LD, zero drift)
 */
export function LagoonFaqAccordion() {
	const prefersReduced = useReducedMotion() ?? false;

	return (
		<div className='flex flex-col gap-14'>
			{FAQ_GROUPS.map((group, i) => (
				<FaqGroup
					key={group.label}
					label={group.label}
					items={group.items}
					defaultOpen={i === 0 ? 0 : -1}
					prefersReduced={prefersReduced}
					groupIndex={i}
				/>
			))}
		</div>
	);
}
