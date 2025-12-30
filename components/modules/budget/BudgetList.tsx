'use client';

import { DataTable, Column } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { Trash2, Wallet } from 'lucide-react';
import { deleteBudgetAction } from '@/server/modules/budget/budget.controller';
import { formatCurrency } from '@/lib/formatters';
import { Budget, Category } from '@prisma/client';
import { cn } from '@/lib/utils';

interface BudgetWithStats extends Budget {
	category: Category;
	spent: number;
	remaining: number;
	percentage: number;
}

interface BudgetListProps {
	budgets: BudgetWithStats[];
}

export function BudgetList({ budgets }: BudgetListProps) {
	async function handleDelete(id: string, e: React.MouseEvent) {
		e.stopPropagation();
		if (confirm('Are you sure you want to delete this budget?')) {
			await deleteBudgetAction(id);
		}
	}

	const columns: Column<BudgetWithStats>[] = [
		{
			key: 'name',
			header: 'Budget Name',
			searchable: true,
			render: (budget) => (
				<div className='flex items-center gap-2'>
					<Wallet className='h-4 w-4 text-muted-foreground' />
					<span className='font-semibold'>
						{(budget as BudgetWithStats & { name?: string }).name ||
							budget.category.name}
					</span>
				</div>
			),
		},
		{
			key: 'category',
			header: 'Category',
			searchable: true,
			render: (budget) => (
				<Badge variant='outline' className='text-xs'>
					{budget.category.name}
				</Badge>
			),
		},
		{
			key: 'month',
			header: 'Month',
			render: (budget) => (
				<span className='text-muted-foreground text-sm'>
					{format(new Date(budget.month), 'MMM yyyy')}
				</span>
			),
		},
		{
			key: 'progress',
			header: 'Progress',
			sortable: false,
			className: 'w-[200px]',
			render: (budget) => (
				<div className='space-y-1'>
					<Progress
						value={Math.min(budget.percentage, 100)}
						className={cn(
							'h-2',
							budget.percentage > 100
								? '[&>div]:bg-red-600 bg-red-100'
								: budget.percentage > 80
								? '[&>div]:bg-yellow-500 bg-yellow-100'
								: '[&>div]:bg-green-600 bg-green-100'
						)}
					/>
					<div className='flex justify-between text-xs text-muted-foreground'>
						<span
							className={cn(
								budget.percentage > 100
									? 'text-red-600 font-bold'
									: ''
							)}
						>
							{formatCurrency(budget.spent, { decimals: 0 })}{' '}
							spent
						</span>
						<span>{budget.percentage.toFixed(0)}%</span>
					</div>
				</div>
			),
		},
		{
			key: 'amount',
			header: 'Limit',
			className: 'text-right',
			render: (budget) => (
				<span className='font-bold'>
					{formatCurrency(Number(budget.amount))}
				</span>
			),
		},
		{
			key: 'actions',
			header: '',
			sortable: false,
			searchable: false,
			className: 'w-[50px]',
			render: (budget) => (
				<Button
					variant='ghost'
					size='icon'
					className='h-8 w-8 text-destructive'
					onClick={(e) => handleDelete(budget.id, e)}
				>
					<Trash2 className='h-4 w-4' />
				</Button>
			),
		},
	];

	return (
		<DataTable
			data={budgets}
			columns={columns}
			searchPlaceholder='Search budgets...'
			emptyMessage='No budgets set. Create a budget to start tracking your spending.'
			getRowId={(b) => b.id}
		/>
	);
}
