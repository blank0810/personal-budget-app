'use client';

import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BulkAction {
	label: string;
	onClick: () => void;
	variant?: 'default' | 'destructive' | 'outline' | 'secondary';
	disabled?: boolean;
}

interface BulkActionBarProps {
	count: number;
	actions: BulkAction[];
	onClear: () => void;
	/** Extra status line rendered under the count (e.g. "3 items skipped"). */
	statusText?: string | null;
}

/**
 * Floating bottom action bar. Portaled to document.body so it isn't clipped
 * by ancestor `overflow` containers. Slides up when `count > 0`.
 */
export function BulkActionBar({
	count,
	actions,
	onClear,
	statusText,
}: BulkActionBarProps) {
	// Portal needs the DOM; skip on SSR / pre-hydration render.
	if (typeof document === 'undefined') return null;

	const visible = count > 0;

	return createPortal(
		<div
			aria-live='polite'
			className={cn(
				'pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4',
				'transition-all duration-200 ease-out',
				visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-8 opacity-0'
			)}
		>
			<div
				className={cn(
					'pointer-events-auto flex min-w-[320px] max-w-[min(640px,calc(100vw-2rem))] items-center gap-3 rounded-lg border bg-background px-3 py-2 shadow-lg'
				)}
			>
				<Button
					variant='ghost'
					size='icon'
					className='h-8 w-8 shrink-0'
					onClick={onClear}
					aria-label='Clear selection'
				>
					<X className='h-4 w-4' />
				</Button>
				<div className='flex min-w-0 flex-1 flex-col'>
					<span className='text-sm font-medium'>
						{count} selected
					</span>
					{statusText && (
						<span className='truncate text-[11px] text-muted-foreground'>
							{statusText}
						</span>
					)}
				</div>
				<div className='flex shrink-0 items-center gap-2'>
					{actions.map((action) => (
						<Button
							key={action.label}
							size='sm'
							variant={action.variant ?? 'default'}
							onClick={action.onClick}
							disabled={action.disabled}
						>
							{action.label}
						</Button>
					))}
				</div>
			</div>
		</div>,
		document.body
	);
}
