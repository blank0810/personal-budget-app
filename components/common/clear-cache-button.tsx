'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { clearCache } from '@/server/actions/cache';

interface ClearCacheButtonProps {
	className?: string;
	label?: string;
	variant?:
		| 'default'
		| 'destructive'
		| 'outline'
		| 'secondary'
		| 'ghost'
		| 'link';
	path?: string;
}

export function ClearCacheButton({
	className,
	label = 'Clear Cache',
	variant = 'outline',
	path = '/',
}: ClearCacheButtonProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	const handleClearCache = () => {
		startTransition(async () => {
			const result = await clearCache(path);
			if (result.success) {
				router.refresh(); // Refresh the current route on the client
			}
		});
	};

	return (
		<Button
			variant={variant}
			size='sm'
			className={className}
			onClick={handleClearCache}
			disabled={isPending}
			title='Force reload data from server'
		>
			<RefreshCw
				className={`mr-2 h-4 w-4 ${isPending ? 'animate-spin' : ''}`}
			/>
			{isPending ? 'Clearing...' : label}
		</Button>
	);
}
