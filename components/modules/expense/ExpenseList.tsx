'use client';

import { DataTable, Column } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { deleteExpenseAction } from '@/server/modules/expense/expense.controller';
import { Expense, Category, Account } from '@prisma/client';
import { formatCurrency } from '@/lib/formatters';

interface ExpenseWithRelations extends Expense {
	category: Category;
	account: Account | null;
}

interface ExpenseListProps {
	expenses: ExpenseWithRelations[];
}

export function ExpenseList({ expenses }: ExpenseListProps) {
	async function handleDelete(id: string, e: React.MouseEvent) {
		e.stopPropagation();
		if (confirm('Are you sure you want to delete this expense?')) {
			await deleteExpenseAction(id);
		}
	}

	const columns: Column<ExpenseWithRelations>[] = [
		{
			key: 'date',
			header: 'Date',
			render: (expense) => (
				<span className='text-muted-foreground text-sm'>
					{format(new Date(expense.date), 'MMM d, yyyy')}
				</span>
			),
		},
		{
			key: 'description',
			header: 'Description',
			searchable: true,
			render: (expense) => expense.description || '-',
		},
		{
			key: 'category',
			header: 'Category',
			searchable: true,
			render: (expense) => (
				<Badge variant='secondary'>{expense.category.name}</Badge>
			),
		},
		{
			key: 'account',
			header: 'Account',
			searchable: true,
			render: (expense) => expense.account?.name || '-',
		},
		{
			key: 'amount',
			header: 'Amount',
			className: 'text-right',
			render: (expense) => (
				<span className='font-bold text-red-600'>
					-{formatCurrency(Number(expense.amount))}
				</span>
			),
		},
		{
			key: 'actions',
			header: '',
			sortable: false,
			searchable: false,
			className: 'w-[50px]',
			render: (expense) => (
				<Button
					variant='ghost'
					size='icon'
					className='h-8 w-8 text-destructive'
					onClick={(e) => handleDelete(expense.id, e)}
				>
					<Trash2 className='h-4 w-4' />
				</Button>
			),
		},
	];

	return (
		<DataTable
			data={expenses}
			columns={columns}
			searchPlaceholder='Search expenses...'
			emptyMessage='No expense entries found.'
			getRowId={(e) => e.id}
		/>
	);
}
