'use client';

import { Expense, Category, Account } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import {
	Trash2,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
} from 'lucide-react';
import { deleteExpenseAction } from '@/server/modules/expense/expense.controller';
import { useCurrency } from '@/lib/contexts/currency-context';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';

interface ExpenseWithRelations extends Expense {
	category: Category;
	account: Account | null;
}

interface ExpenseListProps {
	expenses: ExpenseWithRelations[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
	sortBy: string;
	sortOrder: 'asc' | 'desc';
	onPageChange: (page: number) => void;
	onSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
	isPending: boolean;
}

interface ColumnDef {
	key: string;
	header: string;
	sortable: boolean;
	className?: string;
}

const columns: ColumnDef[] = [
	{ key: 'date', header: 'Date', sortable: true },
	{ key: 'description', header: 'Description', sortable: true },
	{ key: 'categoryName', header: 'Category', sortable: true },
	{ key: 'accountName', header: 'Account', sortable: true },
	{ key: 'amount', header: 'Amount', sortable: true, className: 'text-right' },
	{ key: 'actions', header: '', sortable: false, className: 'w-[50px]' },
];

export function ExpenseList({
	expenses,
	total,
	page,
	totalPages,
	sortBy,
	sortOrder,
	onPageChange,
	onSort,
	isPending,
}: ExpenseListProps) {
	const { formatCurrency } = useCurrency();

	async function handleDelete(id: string, e: React.MouseEvent) {
		e.stopPropagation();
		if (confirm('Are you sure you want to delete this expense?')) {
			await deleteExpenseAction(id);
		}
	}

	function handleSortClick(key: string) {
		if (sortBy === key) {
			if (sortOrder === 'desc') {
				onSort(key, 'asc');
			} else {
				// Reset to default
				onSort('date', 'desc');
			}
		} else {
			onSort(key, 'desc');
		}
	}

	function SortIcon({ columnKey }: { columnKey: string }) {
		if (sortBy !== columnKey) {
			return <ArrowUpDown className='h-4 w-4 ml-1 opacity-50' />;
		}
		return sortOrder === 'asc' ? (
			<ArrowUp className='h-4 w-4 ml-1' />
		) : (
			<ArrowDown className='h-4 w-4 ml-1' />
		);
	}

	return (
		<div className='space-y-4'>
			{/* Item count */}
			<div className='text-sm text-muted-foreground'>
				{total} {total === 1 ? 'item' : 'items'}
			</div>

			{/* Table */}
			<div className='rounded-md border bg-card'>
				<Table>
					<TableHeader>
						<TableRow>
							{columns.map((col) => (
								<TableHead key={col.key} className={col.className}>
									{col.sortable ? (
										<button
											className={`flex items-center hover:text-foreground transition-colors ${
												col.className?.includes('text-right')
													? 'ml-auto'
													: ''
											}`}
											onClick={() => handleSortClick(col.key)}
											disabled={isPending}
										>
											{col.header}
											<SortIcon columnKey={col.key} />
										</button>
									) : (
										col.header
									)}
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{expenses.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className='text-center h-24 text-muted-foreground'
								>
									No expense entries found.
								</TableCell>
							</TableRow>
						) : (
							expenses.map((expense) => (
								<TableRow key={expense.id}>
									<TableCell>
										<span className='text-muted-foreground text-sm'>
											{format(new Date(expense.date), 'MMM d, yyyy')}
										</span>
									</TableCell>
									<TableCell>
										{expense.description || '-'}
									</TableCell>
									<TableCell>
										<Badge variant='secondary'>
											{expense.category.name}
										</Badge>
									</TableCell>
									<TableCell>
										{expense.account?.name || '-'}
									</TableCell>
									<TableCell className='text-right'>
										<span className='font-bold text-red-600'>
											-{formatCurrency(Number(expense.amount))}
										</span>
									</TableCell>
									<TableCell className='w-[50px]'>
										<Button
											variant='ghost'
											size='icon'
											className='h-8 w-8 text-destructive'
											onClick={(e) => handleDelete(expense.id, e)}
										>
											<Trash2 className='h-4 w-4' />
										</Button>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pagination */}
			{totalPages > 1 && (
				<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
					<div className='text-sm text-muted-foreground'>
						Page {page} of {totalPages}
					</div>

					<div className='flex items-center justify-end gap-1'>
						<Button
							variant='outline'
							size='icon'
							className='h-8 w-8'
							onClick={() => onPageChange(1)}
							disabled={page === 1 || isPending}
						>
							<ChevronsLeft className='h-4 w-4' />
						</Button>
						<Button
							variant='outline'
							size='icon'
							className='h-8 w-8'
							onClick={() => onPageChange(page - 1)}
							disabled={page === 1 || isPending}
						>
							<ChevronLeft className='h-4 w-4' />
						</Button>
						<Button
							variant='outline'
							size='icon'
							className='h-8 w-8'
							onClick={() => onPageChange(page + 1)}
							disabled={page === totalPages || isPending}
						>
							<ChevronRight className='h-4 w-4' />
						</Button>
						<Button
							variant='outline'
							size='icon'
							className='h-8 w-8'
							onClick={() => onPageChange(totalPages)}
							disabled={page === totalPages || isPending}
						>
							<ChevronsRight className='h-4 w-4' />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
