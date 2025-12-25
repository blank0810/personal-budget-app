'use client';

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { deleteBudgetAction } from '@/server/modules/budget/budget.controller';
import { Budget, Category } from '@prisma/client';

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
	async function handleDelete(id: string) {
		if (confirm('Are you sure you want to delete this budget?')) {
			await deleteBudgetAction(id);
		}
	}

	return (
		<div className='rounded-md border bg-card'>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Category</TableHead>
						<TableHead>Month</TableHead>
						<TableHead className='w-[300px]'>Progress</TableHead>
						<TableHead className='text-right'>Spent</TableHead>
						<TableHead className='text-right'>Limit</TableHead>
						<TableHead className='w-[50px]'></TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{budgets.length === 0 ? (
						<TableRow>
							<TableCell
								colSpan={6}
								className='text-center h-24 text-muted-foreground'
							>
								No budgets set.
							</TableCell>
						</TableRow>
					) : (
						budgets.map((budget) => (
							<TableRow key={budget.id}>
								<TableCell className='font-medium'>
									{budget.category.name}
								</TableCell>
								<TableCell>
									{format(
										new Date(budget.month),
										'MMMM yyyy'
									)}
								</TableCell>
								<TableCell>
									<div className='space-y-1'>
										<Progress
											value={Math.min(
												budget.percentage,
												100
											)}
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
											<span>
												{budget.percentage.toFixed(1)}%
											</span>
											<span>
												Spent ${budget.spent.toFixed(0)}{' '}
												of $
												{Number(budget.amount).toFixed(
													0
												)}
											</span>
										</div>
									</div>
								</TableCell>
								<TableCell className='text-right text-red-600'>
									${budget.spent.toFixed(2)}
								</TableCell>
								<TableCell className='text-right font-bold'>
									${Number(budget.amount).toFixed(2)}
								</TableCell>
								<TableCell>
									<Button
										variant='ghost'
										size='icon'
										className='h-8 w-8 text-destructive'
										onClick={() => handleDelete(budget.id)}
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
