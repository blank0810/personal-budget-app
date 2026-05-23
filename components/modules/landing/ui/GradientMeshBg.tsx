import { cn } from '@/lib/utils';

/**
 * GradientMeshBg — the layered 3-blob radial mesh + grid overlay
 * (design-system §1). Pure SSR, `aria-hidden`. Drift is CSS-only
 * (`@keyframes l-blob-drift` in landing.css), disabled under
 * prefers-reduced-motion.
 *
 * - `variant='hero'` — violet + sky + emerald blobs + grid overlay.
 * - `variant='cta'`  — violet + sky only, tighter, no grid.
 */
export function GradientMeshBg({
	variant = 'hero',
	className,
}: {
	variant?: 'hero' | 'cta';
	className?: string;
}) {
	return (
		<div
			aria-hidden='true'
			className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
		>
			{variant === 'hero' && <div className='l-aurora' />}
			{variant === 'hero' && <div className='l-grid-bg absolute inset-0' />}
			<div className='l-blob l-blob--violet' />
			<div className='l-blob l-blob--sky' />
			{variant === 'hero' && <div className='l-blob l-blob--emerald' />}
		</div>
	);
}
