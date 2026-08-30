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
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from '@/components/ui/alert';
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
	Clock3,
	CalendarClock,
} from 'lucide-react';
import Link from 'next/link';
import { useCurrency } from '@/lib/contexts/currency-context';
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
	safeToSpend: number | null;
	isOverBudget: boolean;
	burnStatus: 'overpace' | 'ontrack' | 'insufficient_data';
}

// Extended Budget type with name field (matches Prisma schema)
export interface BudgetWithName extends Budget {
	name: string;
	category: Category;
}

interface UnlinkedExpense extends Expense {
	account: Account | null;
}

interface BudgetLedgerProps {
	budget: BudgetWithName;
	expenses: ExpenseWithRunning[];
	unlinkedExpenses?: UnlinkedExpense[];
	metrics: BudgetMetrics;
	categories: Category[];
}

export function BudgetLedger({
	budget,
	expenses,
	unlinkedExpenses = [],
	metrics,
	categories,
}: BudgetLedgerProps) {
	const { formatCurrency } = useCurrency();
	const unlinkedTotal = unlinkedExpenses.reduce(
		(sum, expense) => sum + Number(expense.amount),
		0
	);
	// Deliberately NOT the category total: the schema permits several envelopes
	// per category+month, and a sibling envelope's linked spend is not counted
	// here. Labelled to match what it actually is.
	const envelopePlusUnlinked = metrics.spent + unlinkedTotal;

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
			<div className='flex flex-col gap-4 sm:flex-row sm:items-center'>
				<div className='flex items-center gap-4 flex-1'>
					<Button variant='outline' size='icon' asChild>
						<Link href='/budgets'>
							<ArrowLeft className='h-4 w-4' />
						</Link>
					</Button>
					<div className='flex-1 min-w-0'>
						<h1 className='text-2xl sm:text-3xl font-bold tracking-tight truncate'>
							{budget.name}
						</h1>
						<div className='flex items-center gap-2 text-muted-foreground flex-wrap'>
							<Badge variant='outline'>{budget.category.name}</Badge>
							<span>
								{format(new Date(budget.month), 'MMMM yyyy')}
							</span>
						</div>
					</div>
				</div>
				<div className='flex items-center gap-2'>
					<EditBudgetDialog budget={budget} categories={categories} />
					<Button onClick={handleExportCSV} variant='outline' size='sm'>
						<Download className='mr-2 h-4 w-4' />
						<span className='hidden sm:inline'>Export CSV</span>
						<span className='sm:hidden'>CSV</span>
					</Button>
				</div>
			</div>

			{/* Metrics Cards */}
			<div
				className={cn(
					'grid grid-cols-2 gap-4',
					metrics.safeToSpend === null
						? 'lg:grid-cols-4'
						: 'lg:grid-cols-5'
				)}
			>
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

				{metrics.safeToSpend !== null && (
					<Card>
						<CardHeader className='flex flex-row items-center justify-between pb-2'>
							<CardTitle className='text-sm font-medium'>
								Safe to Spend Today
							</CardTitle>
							<CalendarClock className='h-4 w-4 text-muted-foreground' />
						</CardHeader>
						<CardContent>
							<div className='text-2xl font-bold'>
								{formatCurrency(metrics.safeToSpend)}
							</div>
							<p className='text-xs text-muted-foreground'>
								Based on {metrics.daysRemaining} days remaining
							</p>
						</CardContent>
					</Card>
				)}

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
						{metrics.burnStatus === 'insufficient_data' ? (
							<Clock3 className='h-4 w-4 text-muted-foreground' />
						) : metrics.burnStatus === 'overpace' ? (
							<TrendingUp className='h-4 w-4 text-red-600' />
						) : (
							<TrendingDown className='h-4 w-4 text-green-600' />
						)}
					</CardHeader>
					<CardContent>
						{metrics.burnStatus === 'insufficient_data' ? (
							<>
								<div className='text-2xl font-bold text-muted-foreground'>
									Building…
								</div>
								<p className='text-xs text-muted-foreground'>
									Not enough data for a pace verdict
								</p>
							</>
						) : (
							<>
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
							</>
						)}
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
			<div className='rounded-md border bg-card overflow-x-auto'>
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

			{/* Unlinked Expenses in Same Category */}
			{unlinkedExpenses.length > 0 && (
				<Alert className='border-amber-400/70 bg-amber-50/80 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100 [&>svg]:text-amber-700 dark:[&>svg]:text-amber-300'>
					<AlertTriangle className='h-4 w-4' />
					<AlertTitle className='text-amber-900 dark:text-amber-100'>
						Spent total is incomplete
					</AlertTitle>
					<AlertDescription className='text-amber-900 dark:text-amber-200'>
						<Badge
							variant='outline'
							className='mb-2 border-amber-400 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200'
						>
							{unlinkedExpenses.length} unlinked expense
							{unlinkedExpenses.length !== 1 ? 's' : ''}
						</Badge>
						<p>
							These {budget.category.name} expenses are not linked to an
							envelope, so the official spent figure above is only a floor.
						</p>
						<dl className='mt-3 grid gap-2 sm:grid-cols-2'>
							<div className='border border-amber-300/80 bg-background/80 px-3 py-2 dark:border-amber-800'>
								<dt className='text-xs font-medium text-amber-800 dark:text-amber-300'>
									Official spent
								</dt>
								<dd className='font-mono text-base font-semibold tabular-nums text-foreground'>
									{formatCurrency(metrics.spent)}
								</dd>
							</div>
							<div className='border border-amber-400 bg-amber-100/80 px-3 py-2 dark:border-amber-700 dark:bg-amber-950/60'>
								<dt className='text-xs font-medium text-amber-900 dark:text-amber-200'>
									This envelope + unlinked
								</dt>
								<dd className='font-mono text-base font-semibold tabular-nums text-amber-950 dark:text-amber-100'>
									{formatCurrency(envelopePlusUnlinked)}
								</dd>
							</div>
						</dl>
						<div className='mt-4 overflow-x-auto rounded-md border border-amber-300 bg-background/90 text-foreground dark:border-amber-800'>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className='w-[120px]'>Date</TableHead>
										<TableHead>Description</TableHead>
										<TableHead>Account</TableHead>
										<TableHead className='text-right'>Amount</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{unlinkedExpenses.map((expense) => (
										<TableRow key={expense.id}>
											<TableCell>
												{format(new Date(expense.date), 'MMM d, yyyy')}
											</TableCell>
											<TableCell>
												{expense.description || '-'}
											</TableCell>
											<TableCell>
												<Badge variant='outline' className='text-xs'>
													{expense.account?.name || '-'}
												</Badge>
											</TableCell>
											<TableCell className='text-right font-medium'>
												-{formatCurrency(Number(expense.amount))}
											</TableCell>
										</TableRow>
									))}
									<TableRow className='bg-amber-100/60 dark:bg-amber-950/50'>
										<TableCell
											colSpan={3}
											className='text-right text-xs font-semibold'
										>
											Unlinked total
										</TableCell>
										<TableCell className='text-right font-mono text-sm font-bold tabular-nums'>
											-{formatCurrency(unlinkedTotal)}
										</TableCell>
									</TableRow>
								</TableBody>
							</Table>
						</div>
					</AlertDescription>
				</Alert>
			)}
		</div>
	);
}
