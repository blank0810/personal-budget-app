'use client';

import { Badge } from '@/components/ui/badge';

interface WorkEntryStatusBadgeProps {
	status: string;
}

export function WorkEntryStatusBadge({ status }: WorkEntryStatusBadgeProps) {
	if (status === 'BILLED') {
		return (
			<Badge
				variant='outline'
				className='text-green-700 border-green-300 bg-green-50 dark:text-green-400 dark:border-green-700 dark:bg-green-950/30'
			>
				Invoiced
			</Badge>
		);
	}

	return (
		<Badge
			variant='outline'
			className='text-amber-700 border-amber-300 bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:bg-amber-950/30'
		>
			Unbilled
		</Badge>
	);
}
