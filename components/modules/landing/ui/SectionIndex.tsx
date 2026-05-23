import { cn } from '@/lib/utils';

/**
 * SectionIndex — a deliberate numbered editorial index ("01 — THE PROBLEM").
 * Replaces the plain eyebrow as a consistent brand system (archive/dossier
 * voice) so section labels read as intentional structure, not generic
 * scaffolding. Pure SSR. `tone='dark'` for use on dark section surfaces.
 */
export function SectionIndex({
	index,
	label,
	tone = 'light',
	className,
}: {
	index: string;
	label: string;
	tone?: 'light' | 'dark';
	className?: string;
}) {
	const num = tone === 'dark' ? 'text-white/50' : 'text-l-text-3';
	const rule = tone === 'dark' ? 'bg-white/20' : 'bg-l-border-mid';
	const text = tone === 'dark' ? 'text-white/60' : 'text-l-text-3';
	return (
		<div className={cn('flex items-center gap-3', className)}>
			<span className={cn('font-mono text-xs tabular-nums', num)}>
				{index}
			</span>
			<span className={cn('h-px w-8', rule)} />
			<span
				className={cn(
					'text-[11px] font-medium uppercase tracking-[0.16em]',
					text,
				)}
			>
				{label}
			</span>
		</div>
	);
}
