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

	// Filter expenses for the selected month
	const filteredExpenses = useMemo(() => {
		return expenses.filter((expense) =>
			isSameMonth(new Date(expense.date), selectedMonth)
		);
	}, [expenses, selectedMonth]);

	const handleMonthClick = (date: Date) => {
		setSelectedMonth(date);
		setViewMode('list');
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
					<Button
						variant='outline'
						size='sm'
						onClick={() => setViewMode('months')}
					>
						<CalendarDays className='mr-2 h-4 w-4' />
						View All Months
					</Button>
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
				<ExpenseList expenses={filteredExpenses} />
			)}
		</div>
	);
}
