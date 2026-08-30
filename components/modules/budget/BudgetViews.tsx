'use client';

import { useState } from 'react';
import { Budget, Category } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BudgetList } from './BudgetList';
import {
	ArrowLeft,
	CalendarDays,
	ChevronLeft,
	ChevronRight,
	Copy,
} from 'lucide-react';
import { ReplicateBudgetDialog } from './ReplicateBudgetDialog';
import { useCurrency } from '@/lib/contexts/currency-context';
import type {
	BurnStatus,
	BurnStatusReason,
} from '@/server/modules/budget/budget.burn';
import type { BudgetYearOverviewMonth } from '@/server/modules/budget/budget.types';
import {
	formatUtcMonth,
	normalizeBudgetMonth,
} from '@/server/modules/budget/budget.month';
import { useRouter } from 'next/navigation';
import { getBudgetMonthHref, getBudgetYearHref } from './budget-navigation';

interface BudgetWithRelations extends Budget {
	category: Category;
	spent: number;
	remaining: number;
	percentage: number;
	daysElapsed: number;
	daysInMonth: number;
	expectedPercentage: number;
	burnStatus: BurnStatus;
	burnStatusReason: BurnStatusReason;
	unlinkedExpenseCount: number;
}

interface BudgetViewsProps {
	budgets: BudgetWithRelations[];
	yearOverview: BudgetYearOverviewMonth[];
	availableMonths: Date[];
	initialMonth: Date;
}

export function BudgetViews({
	budgets,
	yearOverview,
	availableMonths,
	initialMonth,
}: BudgetViewsProps) {
	const { formatCurrency } = useCurrency();
	const router = useRouter();
	const [viewMode, setViewMode] = useState<'months' | 'list'>('list');
	const selectedMonth = normalizeBudgetMonth(initialMonth);
	const selectedYear = selectedMonth.getUTCFullYear();
	const selectedMonthLabel = formatUtcMonth(selectedMonth, 'long');
	const selectedMonthName = selectedMonthLabel.replace(
		` ${selectedYear}`,
		''
	);

	const handleMonthClick = (date: Date) => {
		setViewMode('list');
		router.push(getBudgetMonthHref(date));
	};

	const handlePreviousYear = () => {
		router.push(getBudgetYearHref(selectedMonth, selectedYear - 1));
	};

	const handleNextYear = () => {
		router.push(getBudgetYearHref(selectedMonth, selectedYear + 1));
	};

	const currentYear = new Date().getUTCFullYear();
	// Allow navigating up to 5 years in the future (matches BudgetForm)
	const maxYear = currentYear + 4;

	return (
		<div className='space-y-6'>
			<div className='flex items-center justify-between'>
				<h2 className='text-xl font-semibold tracking-tight'>
					{viewMode === 'list'
						? selectedMonthLabel
						: `Budget Overview - ${selectedYear}`}
				</h2>
				{viewMode === 'list' && (
					<div className='flex items-center gap-2'>
						<ReplicateBudgetDialog
							trigger={
								<Button variant='outline' size='sm'>
									<Copy className='mr-2 h-4 w-4' />
									Replicate Budgets
								</Button>
							}
							availableMonths={availableMonths}
						/>
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
						Back to {selectedMonthName}
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
							aria-label={`View ${selectedYear - 1}`}
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
							disabled={selectedYear >= maxYear}
							aria-label={`View ${selectedYear + 1}`}
						>
							<ChevronRight className='h-4 w-4' />
						</Button>
					</div>

					{/* Month Cards Grid */}
					<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
						{yearOverview.map((month) => {
							const monthDate = new Date(month.month);
							const monthName = month.monthLabel.replace(
								` ${selectedYear}`,
								''
							);

							return (
								<Card
								key={monthDate.toISOString()}
								className={`cursor-pointer hover:bg-accent/50 transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
									month.totalBudget === 0
										? 'opacity-60 hover:opacity-100'
										: ''
								}`}
								onClick={() => handleMonthClick(monthDate)}
								onKeyDown={(event) => {
									if (event.key === 'Enter' || event.key === ' ') {
										event.preventDefault();
										handleMonthClick(monthDate);
									}
								}}
								role='link'
								tabIndex={0}
							>
								<CardHeader className='pb-3'>
									<CardTitle className='text-base font-medium text-muted-foreground'>
										{monthName}
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className='space-y-1'>
										<div className='flex justify-between items-end'>
											<span className='text-sm text-muted-foreground'>
												Budget:
											</span>
											<span className='font-bold'>
												{formatCurrency(month.totalBudget, {
													decimals: 0,
												})}
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
												{formatCurrency(month.totalSpent, {
													decimals: 0,
												})}
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
							);
						})}
					</div>
				</>
			) : (
				<BudgetList
					budgets={budgets}
					availableMonths={availableMonths}
				/>
			)}
		</div>
	);
}
