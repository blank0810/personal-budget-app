'use client';

import { DataTable, Column } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { deleteIncomeAction } from '@/server/modules/income/income.controller';
import { Income, Category, Account } from '@prisma/client';
import { formatCurrency } from '@/lib/formatters';

interface IncomeWithRelations extends Income {
	category: Category;
	account: Account | null;
}

interface IncomeListProps {
	incomes: IncomeWithRelations[];
}

export function IncomeList({ incomes }: IncomeListProps) {
	async function handleDelete(id: string, e: React.MouseEvent) {
		e.stopPropagation();
		if (confirm('Are you sure you want to delete this income?')) {
			await deleteIncomeAction(id);
		}
	}

	const columns: Column<IncomeWithRelations>[] = [
		{
			key: 'date',
			header: 'Date',
			render: (income) => (
				<span className='text-muted-foreground text-sm'>
					{format(new Date(income.date), 'MMM d, yyyy')}
				</span>
			),
		},
		{
			key: 'description',
			header: 'Description',
			searchable: true,
			render: (income) => income.description || '-',
		},
		{
			key: 'category',
			header: 'Category',
			searchable: true,
			render: (income) => (
				<Badge variant='secondary'>{income.category.name}</Badge>
			),
		},
		{
			key: 'account',
			header: 'Account',
			searchable: true,
			render: (income) => income.account?.name || '-',
		},
		{
			key: 'amount',
			header: 'Amount',
			className: 'text-right',
			render: (income) => (
				<span className='font-bold text-green-600'>
					+{formatCurrency(Number(income.amount))}
				</span>
			),
		},
		{
			key: 'actions',
			header: '',
			sortable: false,
			searchable: false,
			className: 'w-[50px]',
			render: (income) => (
				<Button
					variant='ghost'
					size='icon'
					className='h-8 w-8 text-destructive'
					onClick={(e) => handleDelete(income.id, e)}
				>
					<Trash2 className='h-4 w-4' />
				</Button>
			),
		},
	];

	return (
		<DataTable
			data={incomes}
			columns={columns}
			searchPlaceholder='Search income...'
			emptyMessage='No income entries found.'
			getRowId={(i) => i.id}
		/>
	);
}
