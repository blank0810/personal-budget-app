'use client';

import { useState, useMemo } from 'react';
import { Budget, Category, Expense } from '@prisma/client';
import { format, isSameMonth, startOfYear, addMonths } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BudgetList } from './BudgetList';
import {
	ArrowLeft,
	CalendarDays,
	ChevronLeft,
	ChevronRight,
} from 'lucide-react';

interface BudgetWithRelations extends Budget {
	category: Category;
	expenses: Expense[];
	spent: number;
	remaining: number;
	percentage: number;
}

interface BudgetViewsProps {
	budgets: BudgetWithRelations[];
}

export function BudgetViews({ budgets }: BudgetViewsProps) {
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

			// Filter budgets for this month
			const monthBudgets = budgets.filter((budget) =>
				isSameMonth(new Date(budget.month), monthDate)
			);

			const totalBudget = monthBudgets.reduce(
				(sum, budget) => sum + Number(budget.amount),
				0
			);

			const totalSpent = monthBudgets.reduce(
				(sum, budget) => sum + budget.spent,
				0
			);

			months.push({
				date: monthDate,
				totalBudget,
				totalSpent,
				count: monthBudgets.length,
				isOverBudget: totalSpent > totalBudget,
			});
		}

		return months;
	}, [budgets, selectedYear]);

	// Filter budgets for the selected month
	const filteredBudgets = useMemo(() => {
		return budgets.filter((budget) =>
			isSameMonth(new Date(budget.month), selectedMonth)
		);
	}, [budgets, selectedMonth]);

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
						: `Budget Overview - ${selectedYear}`}
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
									month.totalBudget === 0
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
									<div className='space-y-1'>
										<div className='flex justify-between items-end'>
											<span className='text-sm text-muted-foreground'>
												Budget:
											</span>
											<span className='font-bold'>
												$
												{month.totalBudget.toLocaleString(
													'en-US',
													{
														minimumFractionDigits: 0,
														maximumFractionDigits: 0,
													}
												)}
											</span>
										</div>
										<div className='flex justify-between items-end'>
											<span className='text-sm text-muted-foreground'>
												Spent:
											</span>
											<span
												className={`font-bold ${
													month.isOverBudget
														? 'text-red-600'
														: 'text-green-600'
												}`}
											>
												$
												{month.totalSpent.toLocaleString(
													'en-US',
													{
														minimumFractionDigits: 0,
														maximumFractionDigits: 0,
													}
												)}
											</span>
										</div>
									</div>
									<p className='text-xs text-muted-foreground mt-3'>
										{month.count > 0
											? `${month.count} active budget${
													month.count > 1 ? 's' : ''
											  }`
											: 'No budgets set'}
									</p>
								</CardContent>
							</Card>
						))}
					</div>
				</>
			) : (
				<BudgetList budgets={filteredBudgets} />
			)}
		</div>
	);
}
