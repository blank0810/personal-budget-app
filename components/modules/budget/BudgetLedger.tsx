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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import {
	ArrowLeft,
	Download,
	TrendingUp,
	TrendingDown,
	Wallet,
	Target,
	AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/formatters';
import { Budget, Category, Expense, Account } from '@prisma/client';
import { cn } from '@/lib/utils';
import { EditBudgetDialog } from './EditBudgetDialog';

interface ExpenseWithRunning extends Expense {
	account: Account | null;
	runningTotal: number;
	isOverBudget: boolean;
}

interface BudgetMetrics {
	limit: number;
	spent: number;
	remaining: number;
	percentage: number;
	daysElapsed: number;
	daysRemaining: number;
	daysInMonth: number;
	dailyBurnRate: number;
	allowedDailyRate: number;
	isOverBudget: boolean;
	burnStatus: 'overpace' | 'ontrack';
}

// Extended Budget type with name field (matches Prisma schema)
export interface BudgetWithName extends Budget {
	name: string;
	category: Category;
}

interface BudgetLedgerProps {
	budget: BudgetWithName;
	expenses: ExpenseWithRunning[];
	metrics: BudgetMetrics;
	categories: Category[];
}

export function BudgetLedger({
	budget,
	expenses,
	metrics,
	categories,
}: BudgetLedgerProps) {
	const handleExportCSV = () => {
		const headers = [
			'Date',
			'Description',
			'Amount',
			'Running Total',
			'Account',
		];
		const csvContent = [
			headers.join(','),
			...expenses.map((e) =>
				[
					format(new Date(e.date), 'yyyy-MM-dd'),
					`"${(e.description || '').replace(/"/g, '""')}"`,
					e.amount.toString(),
					e.runningTotal.toString(),
					`"${e.account?.name || ''}"`,
				].join(',')
			),
		].join('\n');

		const blob = new Blob([csvContent], { type: 'text/csv' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${budget.name.replace(/\s+/g, '_')}_expenses.csv`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		window.URL.revokeObjectURL(url);
	};

	// Determine progress bar color based on percentage
	const getProgressColor = () => {
		if (metrics.percentage > 100) return 'bg-red-600';
		if (metrics.percentage > 80) return 'bg-yellow-500';
		return 'bg-green-600';
	};

	return (
		<div className='space-y-6'>
			{/* Header */}
			<div className='flex items-center gap-4'>
				<Button variant='outline' size='icon' asChild>
					<Link href='/budgets'>
						<ArrowLeft className='h-4 w-4' />
					</Link>
				</Button>
				<div className='flex-1'>
					<h1 className='text-3xl font-bold tracking-tight'>
						{budget.name}
					</h1>
					<div className='flex items-center gap-2 text-muted-foreground'>
						<Badge variant='outline'>{budget.category.name}</Badge>
						<span>
							{format(new Date(budget.month), 'MMMM yyyy')}
						</span>
					</div>
				</div>
				<div className='flex items-center gap-2'>
					<EditBudgetDialog budget={budget} categories={categories} />
					<Button onClick={handleExportCSV} variant='outline' size='sm'>
						<Download className='mr-2 h-4 w-4' />
						Export CSV
					</Button>
				</div>
			</div>

			{/* Metrics Cards */}
			<div className='grid gap-4 md:grid-cols-4'>
				<Card>
					<CardHeader className='flex flex-row items-center justify-between pb-2'>
						<CardTitle className='text-sm font-medium'>
							Budget Limit
						</CardTitle>
						<Target className='h-4 w-4 text-muted-foreground' />
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold'>
							{formatCurrency(metrics.limit)}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className='flex flex-row items-center justify-between pb-2'>
						<CardTitle className='text-sm font-medium'>
							Total Spent
						</CardTitle>
						<Wallet className='h-4 w-4 text-muted-foreground' />
					</CardHeader>
					<CardContent>
						<div
							className={cn(
								'text-2xl font-bold',
								metrics.isOverBudget
									? 'text-red-600'
									: 'text-foreground'
							)}
						>
							{formatCurrency(metrics.spent)}
						</div>
						<p className='text-xs text-muted-foreground'>
							{metrics.percentage.toFixed(1)}% of budget
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className='flex flex-row items-center justify-between pb-2'>
						<CardTitle className='text-sm font-medium'>
							Remaining
						</CardTitle>
						{metrics.remaining < 0 ? (
							<AlertTriangle className='h-4 w-4 text-red-600' />
						) : (
							<TrendingDown className='h-4 w-4 text-green-600' />
						)}
					</CardHeader>
					<CardContent>
						<div
							className={cn(
								'text-2xl font-bold',
								metrics.remaining < 0
									? 'text-red-600'
									: 'text-green-600'
							)}
						>
							{formatCurrency(Math.abs(metrics.remaining))}
							{metrics.remaining < 0 && ' over'}
						</div>
						<p className='text-xs text-muted-foreground'>
							{metrics.daysRemaining} days left
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className='flex flex-row items-center justify-between pb-2'>
						<CardTitle className='text-sm font-medium'>
							Daily Pace
						</CardTitle>
						{metrics.burnStatus === 'overpace' ? (
							<TrendingUp className='h-4 w-4 text-red-600' />
						) : (
							<TrendingDown className='h-4 w-4 text-green-600' />
						)}
					</CardHeader>
					<CardContent>
						<div
							className={cn(
								'text-2xl font-bold',
								metrics.burnStatus === 'overpace'
									? 'text-red-600'
									: 'text-green-600'
							)}
						>
							{formatCurrency(metrics.dailyBurnRate, {
								decimals: 0,
							})}
							/day
						</div>
						<p className='text-xs text-muted-foreground'>
							Target:{' '}
							{formatCurrency(metrics.allowedDailyRate, {
								decimals: 0,
							})}
							/day
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Progress Bar */}
			<Card>
				<CardContent className='pt-6'>
					<div className='space-y-2'>
						<div className='flex justify-between text-sm'>
							<span>Budget Progress</span>
							<span
								className={cn(
									metrics.isOverBudget &&
										'text-red-600 font-bold'
								)}
							>
								{metrics.percentage.toFixed(1)}%
							</span>
						</div>
						<Progress
							value={Math.min(metrics.percentage, 100)}
							className='h-3'
							indicatorClassName={getProgressColor()}
						/>
						<div className='flex justify-between text-xs text-muted-foreground'>
							<span>{formatCurrency(metrics.spent)} spent</span>
							<span>{formatCurrency(metrics.limit)} limit</span>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Expenses Table */}
			<div className='rounded-md border bg-card'>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className='w-[120px]'>Date</TableHead>
							<TableHead>Description</TableHead>
							<TableHead>Account</TableHead>
							<TableHead className='text-right'>Amount</TableHead>
							<TableHead className='text-right'>
								Running Total
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{expenses.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={5}
									className='text-center h-24 text-muted-foreground'
								>
									No expenses recorded for this budget period.
								</TableCell>
							</TableRow>
						) : (
							expenses.map((expense) => (
								<TableRow
									key={expense.id}
									className={cn(
										expense.isOverBudget &&
											'bg-red-50 dark:bg-red-950/20'
									)}
								>
									<TableCell>
										{format(
											new Date(expense.date),
											'MMM d, yyyy'
										)}
									</TableCell>
									<TableCell>
										{expense.description || '-'}
									</TableCell>
									<TableCell>
										<Badge
											variant='outline'
											className='text-xs'
										>
											{expense.account?.name || "-"}
										</Badge>
									</TableCell>
									<TableCell className='text-right font-medium text-red-600'>
										-{formatCurrency(Number(expense.amount))}
									</TableCell>
									<TableCell
										className={cn(
											'text-right font-bold',
											expense.isOverBudget
												? 'text-red-600'
												: 'text-muted-foreground'
										)}
									>
										{formatCurrency(expense.runningTotal)}
										{expense.isOverBudget && (
											<AlertTriangle className='inline ml-1 h-3 w-3' />
										)}
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
