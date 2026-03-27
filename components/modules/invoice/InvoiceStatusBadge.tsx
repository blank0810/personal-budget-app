'use client';

import { Badge } from '@/components/ui/badge';
import { InvoiceStatus } from '@prisma/client';

interface InvoiceStatusBadgeProps {
	status: InvoiceStatus;
}

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
	switch (status) {
		case 'DRAFT':
			return <Badge variant='secondary'>Draft</Badge>;
		case 'SENT':
			return (
				<Badge variant='outline' className='text-blue-600 border-blue-300'>
					Sent
				</Badge>
			);
		case 'PAID':
			return (
				<Badge className='bg-green-600 hover:bg-green-700 text-white'>
					Paid
				</Badge>
			);
		case 'OVERDUE':
			return <Badge variant='destructive'>Overdue</Badge>;
		case 'CANCELLED':
			return (
				<Badge variant='secondary' className='line-through text-muted-foreground'>
					Cancelled
				</Badge>
			);
		default:
			return <Badge variant='secondary'>{status}</Badge>;
	}
}
