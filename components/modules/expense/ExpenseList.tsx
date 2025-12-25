'use client';

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { deleteExpenseAction } from '@/server/modules/expense/expense.controller';
import { Expense, Category, Account, Budget } from '@prisma/client';

interface ExpenseWithRelations extends Expense {
	category: Category;
	account: Account | null;
	budget: Budget | null;
}

interface ExpenseListProps {
	expenses: ExpenseWithRelations[];
}

export function ExpenseList({ expenses }: ExpenseListProps) {
	async function handleDelete(id: string) {
		if (confirm('Are you sure you want to delete this expense?')) {
			await deleteExpenseAction(id);
		}
	}

	return (
		<div className='rounded-md border bg-card'>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Date</TableHead>
						<TableHead>Description</TableHead>
						<TableHead>Category</TableHead>
						<TableHead>Account</TableHead>
						<TableHead className='text-right'>Amount</TableHead>
						<TableHead className='w-[50px]'></TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{expenses.length === 0 ? (
						<TableRow>
							<TableCell
								colSpan={6}
								className='text-center h-24 text-muted-foreground'
							>
								No expense entries found.
							</TableCell>
						</TableRow>
					) : (
						expenses.map((expense) => (
							<TableRow key={expense.id}>
								<TableCell>
									{format(new Date(expense.date), 'PPP')}
								</TableCell>
								<TableCell>{expense.description}</TableCell>
								<TableCell>
									<span className='inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80'>
										{expense.category.name}
									</span>
								</TableCell>
								<TableCell>
									{expense.account?.name || '-'}
								</TableCell>
								<TableCell className='text-right font-medium text-red-600'>
									-${Number(expense.amount).toFixed(2)}
								</TableCell>
								<TableCell>
									<Button
										variant='ghost'
										size='icon'
										className='h-8 w-8 text-destructive'
										onClick={() => handleDelete(expense.id)}
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
	);
}
