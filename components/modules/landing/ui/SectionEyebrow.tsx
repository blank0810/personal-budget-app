import { cn } from '@/lib/utils';

/**
 * Section eyebrow — the small uppercase label above section headings
 * (design-system §7, type scale "Label"). Pure SSR, no motion.
 *
 * Mixed-case headings, UPPERCASE only on this eyebrow (anti-slop §5).
 */
export function SectionEyebrow({
	label,
	className,
}: {
	label: string;
	className?: string;
}) {
	return (
		<p
			className={cn(
				'text-[11px] font-medium uppercase tracking-[0.08em] text-l-text-3',
				className,
			)}
		>
			{label}
		</p>
	);
}
