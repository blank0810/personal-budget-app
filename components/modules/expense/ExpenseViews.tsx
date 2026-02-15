'use client';

import { useState, useMemo } from 'react';
import { Expense, Category, Account, Budget } from '@prisma/client';
import { format, isSameMonth, startOfYear, addMonths } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExpenseList } from './ExpenseList';
import {
	ArrowLeft,
	CalendarDays,
	ChevronLeft,
	ChevronRight,
	Download,
} from 'lucide-react';

interface ExpenseWithRelations extends Expense {
	category: Category;
	account: Account | null;
	budget: Budget | null;
}

interface ExpenseViewsProps {
	expenses: ExpenseWithRelations[];
}

export function ExpenseViews({ expenses }: ExpenseViewsProps) {
	// Default to list view for the current month
	const [viewMode, setViewMode] = useState<'months' | 'list'>('list');
	const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
	const [selectedYear, setSelectedYear] = useState<number>(
		new Date().getFullYear()
	);
	const [selectedCategory, setSelectedCategory] = useState<string>('');

	// Extract unique categories from ALL expenses (not just current month)
	const categoryOptions = useMemo(() => {
		const uniqueCategories = new Map<string, string>();
		expenses.forEach((exp) => {
			uniqueCategories.set(exp.category.id, exp.category.name);
		});
		return Array.from(uniqueCategories.entries())
			.map(([value, label]) => ({ value, label }))
			.sort((a, b) => a.label.localeCompare(b.label));
	}, [expenses]);

	// Generate all 12 months for the selected year
	const allMonthsData = useMemo(() => {
		const yearStart = startOfYear(new Date(selectedYear, 0, 1));
		const months = [];

		for (let i = 0; i < 12; i++) {
			const monthDate = addMonths(yearStart, i);

			// Calculate total expenses for this month
			const monthExpenses = expenses.filter((expense) =>
				isSameMonth(new Date(expense.date), monthDate)
			);

			const total = monthExpenses.reduce(
				(sum, expense) => sum + Number(expense.amount),
				0
			);

			months.push({
				date: monthDate,
				total,
				count: monthExpenses.length,
			});
		}

		return months;
	}, [expenses, selectedYear]);

	// Filter expenses for the selected month AND category
	const filteredExpenses = useMemo(() => {
		return expenses.filter((expense) => {
			const matchesMonth = isSameMonth(new Date(expense.date), selectedMonth);
			const matchesCategory =
				!selectedCategory || expense.categoryId === selectedCategory;
			return matchesMonth && matchesCategory;
		});
	}, [expenses, selectedMonth, selectedCategory]);

	// Filter config for ExpenseList
	const filters = [
		{
			key: 'category',
			label: 'Categories',
			options: categoryOptions,
			value: selectedCategory,
			onChange: setSelectedCategory,
		},
	];

	const handleMonthClick = (date: Date) => {
		setSelectedMonth(date);
		setSelectedCategory(''); // Reset category filter when changing months
		setViewMode('list');
	};

	const handleExportCSV = () => {
		const headers = ['Date', 'Description', 'Category', 'Account', 'Amount'];
		const csvContent = [
			headers.join(','),
			...filteredExpenses.map((expense) =>
				[
					format(new Date(expense.date), 'yyyy-MM-dd'),
					`"${(expense.description || '').replace(/"/g, '""')}"`,
					`"${expense.category?.name || ''}"`,
					`"${expense.account?.name || ''}"`,
					expense.amount.toString(),
				].join(',')
			),
		].join('\n');

		const monthName = format(selectedMonth, 'MMMM_yyyy').toLowerCase();
		const categoryName = selectedCategory
			? `_${categoryOptions.find((c) => c.value === selectedCategory)?.label?.toLowerCase().replace(/\s+/g, '_') || ''}`
			: '';
		const filename = `expenses_${monthName}${categoryName}.csv`;

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

	const handlePreviousYear = () => {
		setSelectedYear((prev) => prev - 1);
	};

	const handleNextYear = () => {
		setSelectedYear((prev) => prev + 1);
	};

	const isCurrentYear = selectedYear === new Date().getFullYear();

	return (
		<div className='space-y-6'>
			<div className='flex items-center justify-between'>
				<h2 className='text-xl font-semibold tracking-tight'>
					{viewMode === 'list'
						? format(selectedMonth, 'MMMM yyyy')
						: `Expense Overview - ${selectedYear}`}
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
							onClick={() => setViewMode('months')}
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
						onClick={() => setViewMode('list')}
					>
						<ArrowLeft className='mr-2 h-4 w-4' />
						Back to {format(selectedMonth, 'MMMM')}
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
							disabled={isCurrentYear}
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
								onClick={() => handleMonthClick(month.date)}
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
										$
										{month.total.toLocaleString('en-US', {
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										})}
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
				<ExpenseList expenses={filteredExpenses} filters={filters} />
			)}
		</div>
	);
}
