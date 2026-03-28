'use client';

import { useState, useTransition, useCallback } from 'react';
import { Expense, Category, Account, Budget } from '@prisma/client';
import { format, startOfYear, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExpenseList } from './ExpenseList';
import {
	ArrowLeft,
	CalendarDays,
	ChevronLeft,
	ChevronRight,
	Download,
	Loader2,
} from 'lucide-react';
import {
	getPaginatedExpensesAction,
	getExpenseMonthlyTotalsAction,
} from '@/server/modules/expense/expense.controller';
import { toast } from 'sonner';
import { useCurrency } from '@/lib/contexts/currency-context';

interface ExpenseWithRelations extends Expense {
	category: Category;
	account: Account | null;
	budget: Budget | null;
}

interface MonthlyTotal {
	month: number;
	total: number;
	count: number;
}

interface ExpenseViewsProps {
	initialExpenses: ExpenseWithRelations[];
	initialTotal: number;
	initialMonthlyTotals: MonthlyTotal[];
	initialYear: number;
	initialMonth: number;
}

const PAGE_SIZE = 20;

export function ExpenseViews({
	initialExpenses,
	initialTotal,
	initialMonthlyTotals,
	initialYear,
	initialMonth,
}: ExpenseViewsProps) {
	const { formatCurrency } = useCurrency();

	const [viewMode, setViewMode] = useState<'months' | 'list'>('list');
	const [selectedMonth, setSelectedMonth] = useState(initialMonth);
	const [selectedYear, setSelectedYear] = useState(initialYear);

	// Paginated list state
	const [expenses, setExpenses] = useState<ExpenseWithRelations[]>(initialExpenses);
	const [total, setTotal] = useState(initialTotal);
	const [page, setPage] = useState(1);
	const [sortBy, setSortBy] = useState<string>('date');
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

	// Monthly totals state
	const [monthlyTotals, setMonthlyTotals] = useState<MonthlyTotal[]>(initialMonthlyTotals);
	const [monthlyTotalsYear, setMonthlyTotalsYear] = useState(initialYear);

	const [isPending, startTransition] = useTransition();

	const fetchExpenses = useCallback(
		(opts: {
			page: number;
			month: number;
			year: number;
			sortBy: string;
			sortOrder: 'asc' | 'desc';
		}) => {
			startTransition(async () => {
				const monthDate = new Date(opts.year, opts.month, 1);
				const result = await getPaginatedExpensesAction({
					page: opts.page,
					pageSize: PAGE_SIZE,
					sortBy: opts.sortBy,
					sortOrder: opts.sortOrder,
					startDate: startOfMonth(monthDate),
					endDate: endOfMonth(monthDate),
				});
				if ('error' in result) {
					toast.error(result.error);
					return;
				}
				const { expenses: rows, total: t } = result.data as { expenses: unknown[]; total: number };
				setExpenses(rows as ExpenseWithRelations[]);
				setTotal(t);
			});
		},
		[]
	);

	const fetchMonthlyTotals = useCallback(
		(year: number) => {
			startTransition(async () => {
				const result = await getExpenseMonthlyTotalsAction(year);
				if ('error' in result) {
					toast.error(result.error);
					return;
				}
				setMonthlyTotals(result.data!);
				setMonthlyTotalsYear(year);
			});
		},
		[]
	);

	const handlePageChange = (newPage: number) => {
		setPage(newPage);
		fetchExpenses({
			page: newPage,
			month: selectedMonth,
			year: selectedYear,
			sortBy,
			sortOrder,
		});
	};

	const handleSort = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
		setSortBy(newSortBy);
		setSortOrder(newSortOrder);
		setPage(1);
		fetchExpenses({
			page: 1,
			month: selectedMonth,
			year: selectedYear,
			sortBy: newSortBy,
			sortOrder: newSortOrder,
		});
	};

	const handleMonthClick = (monthIndex: number) => {
		setSelectedMonth(monthIndex);
		setPage(1);
		setViewMode('list');
		fetchExpenses({
			page: 1,
			month: monthIndex,
			year: selectedYear,
			sortBy,
			sortOrder,
		});
	};

	const handlePreviousYear = () => {
		const newYear = selectedYear - 1;
		setSelectedYear(newYear);
		if (viewMode === 'months') {
			fetchMonthlyTotals(newYear);
		} else {
			setPage(1);
			fetchExpenses({
				page: 1,
				month: selectedMonth,
				year: newYear,
				sortBy,
				sortOrder,
			});
		}
	};

	const handleNextYear = () => {
		const newYear = selectedYear + 1;
		setSelectedYear(newYear);
		if (viewMode === 'months') {
			fetchMonthlyTotals(newYear);
		} else {
			setPage(1);
			fetchExpenses({
				page: 1,
				month: selectedMonth,
				year: newYear,
				sortBy,
				sortOrder,
			});
		}
	};

	const handleViewMonths = () => {
		setViewMode('months');
		if (monthlyTotalsYear !== selectedYear) {
			fetchMonthlyTotals(selectedYear);
		}
	};

	const handleExportCSV = () => {
		const headers = ['Date', 'Description', 'Category', 'Account', 'Amount'];
		const csvContent = [
			headers.join(','),
			...expenses.map((expense) =>
				[
					format(new Date(expense.date), 'yyyy-MM-dd'),
					`"${(expense.description || '').replace(/"/g, '""')}"`,
					`"${expense.category?.name || ''}"`,
					`"${expense.account?.name || ''}"`,
					expense.amount.toString(),
				].join(',')
			),
		].join('\n');

		const monthDate = new Date(selectedYear, selectedMonth, 1);
		const monthName = format(monthDate, 'MMMM_yyyy').toLowerCase();
		const filename = `expenses_${monthName}.csv`;

		const blob = new Blob([csvContent], { type: 'text/csv' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		window.URL.revokeObjectURL(url);
	};

	const isCurrentYear = selectedYear === new Date().getFullYear();
	const displayMonthDate = new Date(selectedYear, selectedMonth, 1);

	// Generate all 12 months data from monthly totals
	const allMonthsData = monthlyTotals.map((mt) => {
		const yearStart = startOfYear(new Date(selectedYear, 0, 1));
		return {
			date: addMonths(yearStart, mt.month),
			total: mt.total,
			count: mt.count,
			monthIndex: mt.month,
		};
	});

	const totalPages = Math.ceil(total / PAGE_SIZE);

	return (
		<div className='space-y-6'>
			<div className='flex items-center justify-between'>
				<h2 className='text-xl font-semibold tracking-tight'>
					{viewMode === 'list'
						? format(displayMonthDate, 'MMMM yyyy')
						: `Expense Overview - ${selectedYear}`}
					{isPending && (
						<Loader2 className='inline-block ml-2 h-4 w-4 animate-spin' />
					)}
				</h2>
				{viewMode === 'list' && (
					<div className='flex items-center gap-2'>
						<Button
							variant='outline'
							size='sm'
							onClick={handleExportCSV}
						>
							<Download className='mr-2 h-4 w-4' />
							<span className='hidden sm:inline'>Export CSV</span>
							<span className='sm:hidden'>CSV</span>
						</Button>
						<Button
							variant='outline'
							size='sm'
							onClick={handleViewMonths}
						>
							<CalendarDays className='mr-2 h-4 w-4' />
							View All Months
						</Button>
					</div>
				)}
				{viewMode === 'months' && (
					<Button
						variant='ghost'
						size='sm'
						onClick={() => {
							setViewMode('list');
							setPage(1);
							fetchExpenses({
								page: 1,
								month: selectedMonth,
								year: selectedYear,
								sortBy,
								sortOrder,
							});
						}}
					>
						<ArrowLeft className='mr-2 h-4 w-4' />
						Back to {format(displayMonthDate, 'MMMM')}
					</Button>
				)}
			</div>

			{viewMode === 'months' ? (
				<>
					{/* Year Navigator */}
					<div className='flex items-center justify-center gap-4'>
						<Button
							variant='outline'
							size='icon'
							onClick={handlePreviousYear}
							disabled={isPending}
						>
							<ChevronLeft className='h-4 w-4' />
						</Button>
						<span className='text-lg font-semibold min-w-[100px] text-center'>
							{selectedYear}
						</span>
						<Button
							variant='outline'
							size='icon'
							onClick={handleNextYear}
							disabled={isCurrentYear || isPending}
						>
							<ChevronRight className='h-4 w-4' />
						</Button>
					</div>

					{/* Month Cards Grid */}
					<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
						{allMonthsData.map((month) => (
							<Card
								key={month.date.toISOString()}
								className={`cursor-pointer hover:bg-accent/50 transition-all hover:scale-105 ${
									month.total === 0
										? 'opacity-60 hover:opacity-100'
										: ''
								}`}
								onClick={() => handleMonthClick(month.monthIndex)}
							>
								<CardHeader className='pb-3'>
									<CardTitle className='text-base font-medium text-muted-foreground'>
										{format(month.date, 'MMMM')}
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div
										className={`text-2xl font-bold ${
											month.total > 0
												? 'text-red-600'
												: 'text-muted-foreground'
										}`}
									>
										{formatCurrency(month.total)}
									</div>
									<p className='text-xs text-muted-foreground mt-1'>
										{month.count > 0
											? `${month.count} transaction${
													month.count > 1 ? 's' : ''
											  }`
											: 'No transactions'}
									</p>
								</CardContent>
							</Card>
						))}
					</div>
				</>
			) : (
				<ExpenseList
					expenses={expenses}
					total={total}
					page={page}
					pageSize={PAGE_SIZE}
					totalPages={totalPages}
					sortBy={sortBy}
					sortOrder={sortOrder}
					onPageChange={handlePageChange}
					onSort={handleSort}
					isPending={isPending}
				/>
			)}
		</div>
	);
}
