'use client';

import { useState } from 'react';
import { DataTable, Column } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import {
	PaymentDetailDialog,
	PaymentWithRelations,
} from './PaymentDetailDialog';

interface PaymentListProps {
	payments: PaymentWithRelations[];
}

export { type PaymentWithRelations } from './PaymentDetailDialog';

export function PaymentList({ payments }: PaymentListProps) {
	const [selectedPayment, setSelectedPayment] =
		useState<PaymentWithRelations | null>(null);

	const columns: Column<PaymentWithRelations>[] = [
		{
			key: 'date',
			header: 'Date',
			render: (p) => (
				<span className='text-muted-foreground text-sm'>
					{format(new Date(p.date), 'MMM d, yyyy')}
				</span>
			),
		},
		{
			key: 'fromAccount',
			header: 'From',
			searchable: true,
			render: (p) => (
				<div className='flex items-center gap-2'>
					<span className='font-medium text-sm'>
						{p.fromAccount.name}
					</span>
					<Badge variant='outline' className='text-xs'>
						{p.fromAccount.type}
					</Badge>
				</div>
			),
		},
		{
			key: 'arrow',
			header: '',
			sortable: false,
			searchable: false,
			className: 'w-[40px]',
			render: () => (
				<ArrowRight className='h-4 w-4 text-muted-foreground' />
			),
		},
		{
			key: 'toAccount',
			header: 'Paid Off',
			searchable: true,
			render: (p) => (
				<div className='flex items-center gap-2'>
					<span className='font-medium text-sm'>
						{p.toAccount.name}
					</span>
					<Badge variant='destructive' className='text-xs'>
						{p.toAccount.type}
					</Badge>
				</div>
			),
		},
		{
			key: 'description',
			header: 'Description',
			searchable: true,
			render: (p) => (
				<span className='text-sm text-muted-foreground'>
					{p.description || '-'}
				</span>
			),
		},
		{
			key: 'amount',
			header: 'Amount',
			className: 'text-right',
			render: (p) => (
				<span className='font-bold text-green-600'>
					{formatCurrency(Number(p.amount))}
				</span>
			),
		},
		{
			key: 'fee',
			header: 'Fee',
			className: 'text-right',
			render: (p) => {
				const fee = Number(p.fee || 0);
				return (
					<span className='text-sm text-muted-foreground'>
						{fee > 0 ? formatCurrency(fee) : '-'}
					</span>
				);
			},
		},
	];

	return (
		<>
			<DataTable
				data={payments}
				columns={columns}
				searchPlaceholder='Search payments...'
				emptyMessage='No payments yet. Make a payment to reduce your debt.'
				onRowClick={setSelectedPayment}
				getRowId={(p) => p.id}
			/>

			<PaymentDetailDialog
				payment={selectedPayment}
				open={!!selectedPayment}
				onOpenChange={(open) => !open && setSelectedPayment(null)}
			/>
		</>
	);
}
