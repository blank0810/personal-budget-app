'use client';

import type { ComponentProps } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DashboardAction } from '@/server/modules/dashboard/dashboard.types';
import { useQuickAction } from './QuickActionSheet';

interface DashboardActionButtonProps {
	action: DashboardAction;
	variant?: ComponentProps<typeof Button>['variant'];
	size?: ComponentProps<typeof Button>['size'];
	className?: string;
}

export function DashboardActionButton({
	action,
	variant = 'outline',
	size = 'sm',
	className,
}: DashboardActionButtonProps) {
	const { openSheet } = useQuickAction();

	if (action.kind === 'link') {
		return (
			<Button asChild variant={variant} size={size} className={className}>
				<Link href={action.href}>
					{action.label}
					<ArrowUpRight aria-hidden='true' />
				</Link>
			</Button>
		);
	}

	return (
		<Button
			type='button'
			variant={variant}
			size={size}
			className={cn('justify-center', className)}
			onClick={() => openSheet(action.action)}
		>
			{action.label}
		</Button>
	);
}
