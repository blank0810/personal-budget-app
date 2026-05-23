import { cn } from '@/lib/utils';

/**
 * BrowserMockup — glass browser-chrome frame (3 dots + URL bar) wrapping
 * arbitrary inner content (design-system §7). Pure SSR — used in the Hero
 * and (later) the scroll-pinned DashboardPreview.
 *
 * Reused as-is so the hero mockup and preview share one chrome treatment.
 */
export function BrowserMockup({
	url = 'app.budgetplanner.io/dashboard',
	children,
	className,
}: {
	url?: string;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				'l-glass-elevated overflow-hidden rounded-2xl',
				className,
			)}
		>
			{/* Chrome bar */}
			<div className='flex items-center gap-3 border-b border-l-border bg-l-surface-1/80 px-4 py-3'>
				<div className='flex gap-2'>
					<span className='h-3 w-3 rounded-full bg-l-border-mid' />
					<span className='h-3 w-3 rounded-full bg-l-border-mid' />
					<span className='h-3 w-3 rounded-full bg-l-border-mid' />
				</div>
				<div className='ml-2 flex-1'>
					<div className='inline-flex max-w-full items-center rounded-md border border-l-border bg-l-bg/70 px-3 py-1 font-mono text-[11px] text-l-text-3'>
						{url}
					</div>
				</div>
			</div>
			{/* Inner content */}
			<div className='bg-l-bg'>{children}</div>
		</div>
	);
}
