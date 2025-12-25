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
import { deleteIncomeAction } from '@/server/modules/income/income.controller';

import { Income, Category, Account } from '@prisma/client';

interface IncomeWithRelations extends Income {
	category: Category;
	account: Account | null;
}

interface IncomeListProps {
	incomes: IncomeWithRelations[];
}

export function IncomeList({ incomes }: IncomeListProps) {
	async function handleDelete(id: string) {
		if (confirm('Are you sure you want to delete this income?')) {
			await deleteIncomeAction(id);
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
					{incomes.length === 0 ? (
						<TableRow>
							<TableCell
								colSpan={6}
								className='text-center h-24 text-muted-foreground'
							>
								No income entries found.
							</TableCell>
						</TableRow>
					) : (
						incomes.map((income) => (
							<TableRow key={income.id}>
								<TableCell>
									{format(new Date(income.date), 'PPP')}
								</TableCell>
								<TableCell>{income.description}</TableCell>
								<TableCell>
									<span className='inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80'>
										{income.category.name}
									</span>
								</TableCell>
								<TableCell>
									{income.account?.name || '-'}
								</TableCell>
								<TableCell className='text-right font-medium text-green-600'>
									+${Number(income.amount).toFixed(2)}
								</TableCell>
								<TableCell>
									<Button
										variant='ghost'
										size='icon'
										className='h-8 w-8 text-destructive'
										onClick={() => handleDelete(income.id)}
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
