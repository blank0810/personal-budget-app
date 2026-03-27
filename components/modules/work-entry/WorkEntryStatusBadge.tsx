'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

interface WorkEntryStatusBadgeProps {
	status: string;
	invoiceNumber?: string;
	invoiceId?: string;
}

export function WorkEntryStatusBadge({
	status,
	invoiceNumber,
	invoiceId,
}: WorkEntryStatusBadgeProps) {
	if (status === 'BILLED') {
		if (invoiceId && invoiceNumber) {
			return (
				<Link href={`/invoices/${invoiceId}`}>
					<Badge
						variant='outline'
						className='text-green-700 border-green-300 bg-green-50 hover:bg-green-100 cursor-pointer dark:text-green-400 dark:border-green-700 dark:bg-green-950/30'
					>
						Billed · {invoiceNumber}
					</Badge>
				</Link>
			);
		}
		return (
			<Badge
				variant='outline'
				className='text-green-700 border-green-300 bg-green-50 dark:text-green-400 dark:border-green-700 dark:bg-green-950/30'
			>
				Billed
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
