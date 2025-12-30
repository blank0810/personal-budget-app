'use client';

import { useState } from 'react';
import { DataTable, Column } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import {
	TransferDetailDialog,
	TransferWithRelations,
} from './TransferDetailDialog';

interface TransferListProps {
	transfers: TransferWithRelations[];
}

export { type TransferWithRelations } from './TransferDetailDialog';

export function TransferList({ transfers }: TransferListProps) {
	const [selectedTransfer, setSelectedTransfer] =
		useState<TransferWithRelations | null>(null);

	const columns: Column<TransferWithRelations>[] = [
		{
			key: 'date',
			header: 'Date',
			render: (t) => (
				<span className='text-muted-foreground text-sm'>
					{format(new Date(t.date), 'MMM d, yyyy')}
				</span>
			),
		},
		{
			key: 'fromAccount',
			header: 'From',
			searchable: true,
			render: (t) => (
				<div className='flex items-center gap-2'>
					<span className='font-medium text-sm'>
						{t.fromAccount.name}
					</span>
					<Badge variant='outline' className='text-xs'>
						{t.fromAccount.type}
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
			header: 'To',
			searchable: true,
			render: (t) => (
				<div className='flex items-center gap-2'>
					<span className='font-medium text-sm'>
						{t.toAccount.name}
					</span>
					<Badge variant='outline' className='text-xs'>
						{t.toAccount.type}
					</Badge>
				</div>
			),
		},
		{
			key: 'amount',
			header: 'Amount',
			className: 'text-right',
			render: (t) => (
				<span className='font-bold'>
					{formatCurrency(Number(t.amount))}
				</span>
			),
		},
		{
			key: 'fee',
			header: 'Fee',
			className: 'text-right',
			render: (t) => {
				const fee = Number(t.fee || 0);
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
				data={transfers}
				columns={columns}
				searchPlaceholder='Search transfers...'
				emptyMessage='No transfers yet. Create a transfer to move money between accounts.'
				onRowClick={setSelectedTransfer}
				getRowId={(t) => t.id}
			/>

			<TransferDetailDialog
				transfer={selectedTransfer}
				open={!!selectedTransfer}
				onOpenChange={(open) => !open && setSelectedTransfer(null)}
			/>
		</>
	);
}
