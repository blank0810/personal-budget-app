'use client';

import { DataTable, Column } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { Copy, FileText, PlusCircle, Trash2, Wallet } from 'lucide-react';
import { ReplicateBudgetDialog } from './ReplicateBudgetDialog';
import { deleteBudgetAction } from '@/server/modules/budget/budget.controller';
import { useCurrency } from '@/lib/contexts/currency-context';
import { Budget, Category } from '@prisma/client';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface BudgetWithStats extends Budget {
	category: Category;
	spent: number;
	remaining: number;
	percentage: number;
}

interface BudgetListProps {
	budgets: BudgetWithStats[];
	availableMonths?: Date[];
}

export function BudgetList({ budgets, availableMonths = [] }: BudgetListProps) {
	const { formatCurrency } = useCurrency();
	const router = useRouter();

	async function handleDelete(id: string, e: React.MouseEvent) {
		e.stopPropagation();
		if (confirm('Are you sure you want to delete this budget?')) {
			await deleteBudgetAction(id);
			router.refresh();
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
							{formatCurrency(budget.spent, { decimals: 0 })} spent
						</span>
						<span
							className={cn(
								budget.remaining < 0
									? 'text-red-600 font-bold'
									: budget.remaining > 0
									? 'text-green-600'
									: ''
							)}
						>
							{formatCurrency(budget.remaining, { decimals: 0 })} left
						</span>
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
			className: 'w-[100px]',
			render: (budget) => (
				<div className='flex justify-end gap-2'>
					<Button
						variant='ghost'
						size='icon'
						className='h-8 w-8 text-muted-foreground hover:text-primary'
						asChild
					>
						<Link href={`/budgets/${budget.id}`}>
							<FileText className='h-4 w-4' />
						</Link>
					</Button>
					<Button
						variant='ghost'
						size='icon'
						className='h-8 w-8 text-destructive'
						onClick={(e) => handleDelete(budget.id, e)}
					>
						<Trash2 className='h-4 w-4' />
					</Button>
				</div>
			),
		},
	];

	// Enhanced empty state when no budgets for current view
	if (budgets.length === 0) {
		return (
			<div className='flex flex-col items-center justify-center py-16 px-4 border rounded-lg bg-muted/20'>
				<Wallet className='h-12 w-12 text-muted-foreground/40 mb-4' />
				<h3 className='text-lg font-semibold mb-2'>No budgets for this month</h3>
				<p className='text-sm text-muted-foreground text-center mb-6 max-w-md'>
					Set up your spending envelopes to track expenses against your planned budget.
				</p>
				<div className='flex flex-wrap items-center justify-center gap-3'>
					{availableMonths.length > 0 && (
						<>
							<ReplicateBudgetDialog
								trigger={
									<Button variant='outline'>
										<Copy className='mr-2 h-4 w-4' />
										Replicate from Previous Month
									</Button>
								}
								availableMonths={availableMonths}
							/>
							<span className='text-muted-foreground text-sm'>or</span>
						</>
					)}
					<Button asChild>
						<a href='#budget-form'>
							<PlusCircle className='mr-2 h-4 w-4' />
							Create New Budget
						</a>
					</Button>
				</div>
			</div>
		);
	}

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
