'use client';

import { m, useReducedMotion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * BentoCell — one tile in the FeaturesBento grid (design-system §4.4).
 *
 * Glass-ish surface, hairline border, an icon slot, title + body, and an
 * optional `visual` slot rendered below the copy (charts, mini-mockups).
 * `colSpan` / `rowSpan` drive the asymmetric 12-col layout — the grid
 * placement classes are owned by the parent so cells stay reusable.
 *
 * Motion: a Framer hover lift (`whileHover={{ y: -3 }}`), flattened under
 * a single useReducedMotion() gate. Entrance cascade is GSAP-driven by the
 * parent (each cell carries a `data-bento-cell` hook), so this primitive
 * stays unaware of scroll.
 *
 * `hero` variant gives the largest cell a faint surface→accent wash so it
 * visually anchors the grid (no gradient TEXT, no side-stripe border).
 */
export function BentoCell({
	icon: Icon,
	title,
	body,
	visual,
	colSpan,
	rowSpan,
	hero = false,
	className,
}: {
	icon: LucideIcon;
	title: string;
	body: string;
	visual?: React.ReactNode;
	/** Tailwind grid-column class, e.g. 'lg:col-span-7'. */
	colSpan: string;
	/** Tailwind grid-row class, e.g. 'lg:row-span-2'. */
	rowSpan?: string;
	hero?: boolean;
	className?: string;
}) {
	const prefersReduced = useReducedMotion();

	return (
		<m.div
			data-bento-cell
			whileHover={prefersReduced ? undefined : { y: -3 }}
			transition={{ duration: 0.2 }}
			className={cn(
				'group relative flex flex-col overflow-hidden rounded-2xl border border-l-border bg-l-bg p-6 transition-colors',
				'hover:border-l-border-mid hover:bg-l-surface-1',
				hero &&
					'bg-gradient-to-br from-l-surface-1 to-l-accent-dim/40',
				colSpan,
				rowSpan,
				className,
			)}
		>
			<span className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-l-accent-dim text-l-accent'>
				<Icon className='h-5 w-5' aria-hidden='true' />
			</span>
			<h3 className='mt-4 text-lg font-semibold tracking-[-0.01em] text-l-text-1'>
				{title}
			</h3>
			<p className='mt-2 text-sm leading-relaxed text-l-text-2'>{body}</p>
			{visual && <div className='mt-5 flex-1'>{visual}</div>}
		</m.div>
	);
}
