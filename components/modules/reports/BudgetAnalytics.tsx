'use client';

import {
	Bar,
	Line,
	ComposedChart,
	ResponsiveContainer,
	XAxis,
	YAxis,
	Tooltip,
	Legend,
	CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { ArrowUp, ArrowDown, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type {
	MonthlyTrend,
	CategoryRecommendation,
} from '@/server/modules/budget/budget.types';
import { format } from 'date-fns';

interface BudgetAnalyticsProps {
	trends: MonthlyTrend[];
	recommendations: CategoryRecommendation[];
}

export function BudgetAnalytics({
	trends,
	recommendations,
}: BudgetAnalyticsProps) {
	// Calculate aggregate summary across all months in the selected period
	const periodSummary = trends.reduce(
		(acc, month) => ({
			totalBudgeted: acc.totalBudgeted + month.totalBudgeted,
			totalSpent: acc.totalSpent + month.totalSpent,
			categoriesOnTrack: acc.categoriesOnTrack + month.categoriesOnTrack,
			categoriesOver: acc.categoriesOver + month.categoriesOver,
			totalCategories: acc.totalCategories + month.totalCategories,
		}),
		{
			totalBudgeted: 0,
			totalSpent: 0,
			categoriesOnTrack: 0,
			categoriesOver: 0,
			totalCategories: 0,
		}
	);
	const periodSavings = periodSummary.totalBudgeted - periodSummary.totalSpent;
	const periodUtilization =
		periodSummary.totalBudgeted > 0
			? (periodSummary.totalSpent / periodSummary.totalBudgeted) * 100
			: 0;

	// Get date range label
	const getDateRangeLabel = () => {
		if (trends.length === 0) return 'Selected Period';
		if (trends.length === 1) {
			return format(new Date(trends[0].month), 'MMMM yyyy');
		}
		const firstMonth = format(new Date(trends[0].month), 'MMM yyyy');
		const lastMonth = format(new Date(trends[trends.length - 1].month), 'MMM yyyy');
		return `${firstMonth} - ${lastMonth}`;
	};

	// Empty state
	if (trends.length === 0 || trends.every((t) => t.totalCategories === 0)) {
		return (
			<div className='space-y-6'>
				<Card>
					<CardContent className='flex h-[400px] items-center justify-center'>
						<div className='text-center text-muted-foreground'>
							<p className='text-lg font-medium'>
								No budget data available
							</p>
							<p className='text-sm'>
								Create budgets to see analytics and recommendations
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className='space-y-6'>
			{/* Period Summary Card */}
			<Card>
				<CardHeader>
					<CardTitle>{getDateRangeLabel()} Summary</CardTitle>
				</CardHeader>
				<CardContent className='space-y-4'>
					{periodSummary.totalBudgeted > 0 ? (
						<>
							<div className='grid gap-4 md:grid-cols-3'>
								<div className='text-center p-4 bg-muted/50 rounded-lg'>
									<p className='text-sm text-muted-foreground'>
										Budgeted
									</p>
									<p className='text-2xl font-bold'>
										{formatCurrency(periodSummary.totalBudgeted)}
									</p>
								</div>
								<div className='text-center p-4 bg-muted/50 rounded-lg'>
									<p className='text-sm text-muted-foreground'>Spent</p>
									<p
										className={cn(
											'text-2xl font-bold',
											periodSummary.totalSpent >
												periodSummary.totalBudgeted
												? 'text-red-600'
												: ''
										)}
									>
										{formatCurrency(periodSummary.totalSpent)}
									</p>
								</div>
								<div className='text-center p-4 bg-muted/50 rounded-lg'>
									<p className='text-sm text-muted-foreground'>
										{periodSavings >= 0 ? 'Saved' : 'Over'}
									</p>
									<p
										className={cn(
											'text-2xl font-bold',
											periodSavings >= 0
												? 'text-emerald-600'
												: 'text-red-600'
										)}
									>
										{formatCurrency(Math.abs(periodSavings))}
									</p>
								</div>
							</div>
							<div className='space-y-2'>
								<div className='flex justify-between text-sm'>
									<span className='text-muted-foreground'>
										Budget Utilization
									</span>
									<span
										className={cn(
											'font-medium',
											periodUtilization > 100
												? 'text-red-600'
												: periodUtilization > 80
												? 'text-amber-600'
												: 'text-emerald-600'
										)}
									>
										{periodUtilization.toFixed(1)}%
									</span>
								</div>
								<Progress
									value={Math.min(periodUtilization, 100)}
									className={cn(
										'h-3',
										periodUtilization > 100
											? '[&>div]:bg-red-500'
											: periodUtilization > 80
											? '[&>div]:bg-amber-500'
											: '[&>div]:bg-emerald-500'
									)}
								/>
								<div className='flex gap-4 text-xs text-muted-foreground'>
									<span>
										{periodSummary.categoriesOnTrack} categories on
										track
									</span>
									{periodSummary.categoriesOver > 0 && (
										<span className='text-red-600'>
											{periodSummary.categoriesOver} over budget
										</span>
									)}
								</div>
							</div>
						</>
					) : (
						<div className='text-center py-8 space-y-2'>
							<p className='text-muted-foreground'>
								No budgets set for {getDateRangeLabel()}
							</p>
							<p className='text-sm text-muted-foreground'>
								Create a budget to start tracking your spending
							</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Budget Trend Chart */}
			<Card>
				<CardHeader>
					<CardTitle>Budget Trends</CardTitle>
				</CardHeader>
				<CardContent>
					<div className='h-[350px]'>
						<ResponsiveContainer width='100%' height='100%'>
							<ComposedChart data={trends}>
								<CartesianGrid
									strokeDasharray='3 3'
									vertical={false}
								/>
								<XAxis
									dataKey='monthLabel'
									stroke='#888888'
									fontSize={12}
									tickLine={false}
									axisLine={false}
								/>
								<YAxis
									yAxisId='left'
									stroke='#888888'
									fontSize={12}
									tickLine={false}
									axisLine={false}
									tickFormatter={(value) =>
										formatCurrency(value, { decimals: 0 })
									}
								/>
								<YAxis
									yAxisId='right'
									orientation='right'
									stroke='#888888'
									fontSize={12}
									tickLine={false}
									axisLine={false}
									domain={[0, 100]}
									tickFormatter={(value) => `${value}%`}
								/>
								<Tooltip
									formatter={(
										value: number | undefined,
										name: string | undefined
									) => {
										if (value === undefined || name === undefined)
											return ['', name ?? ''];
										if (name === 'Adherence %') {
											return [`${value.toFixed(1)}%`, name];
										}
										return [formatCurrency(value), name];
									}}
									cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
								/>
								<Legend />
								<Bar
									yAxisId='left'
									dataKey='totalBudgeted'
									name='Budgeted'
									fill='#cbd5e1'
									radius={[4, 4, 0, 0]}
								/>
								<Bar
									yAxisId='left'
									dataKey='totalSpent'
									name='Spent'
									fill='#3b82f6'
									radius={[4, 4, 0, 0]}
								/>
								<Line
									yAxisId='right'
									type='monotone'
									dataKey='adherencePercent'
									name='Adherence %'
									stroke='#22c55e'
									strokeWidth={2}
									dot={{ fill: '#22c55e', strokeWidth: 2 }}
								/>
							</ComposedChart>
						</ResponsiveContainer>
					</div>
				</CardContent>
			</Card>

			{/* Category Recommendations Table */}
			<Card>
				<CardHeader>
					<CardTitle>Category Performance & Recommendations</CardTitle>
				</CardHeader>
				<CardContent>
					{recommendations.length > 0 ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Category</TableHead>
									<TableHead className='text-right'>
										Avg Budget
									</TableHead>
									<TableHead className='text-right'>
										Avg Spent
									</TableHead>
									<TableHead className='text-right'>Variance</TableHead>
									<TableHead>Trend</TableHead>
									<TableHead>Recommendation</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{recommendations.map((rec) => (
									<TableRow key={rec.categoryId}>
										<TableCell className='font-medium'>
											{rec.categoryName}
										</TableCell>
										<TableCell className='text-right'>
											{formatCurrency(rec.avgBudget)}
										</TableCell>
										<TableCell className='text-right'>
											{formatCurrency(rec.avgSpent)}
										</TableCell>
										<TableCell className='text-right'>
											<span
												className={cn(
													'font-medium',
													rec.variance > 0
														? 'text-red-600'
														: rec.variance < -20
														? 'text-amber-600'
														: 'text-emerald-600'
												)}
											>
												{rec.variance > 0 ? '+' : ''}
												{rec.variance.toFixed(1)}%
											</span>
										</TableCell>
										<TableCell>
											<span className='text-sm text-muted-foreground'>
												{rec.trend}
											</span>
										</TableCell>
										<TableCell>
											<RecommendationBadge
												recommendation={rec.recommendation}
												suggestedAmount={rec.suggestedAmount}
											/>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					) : (
						<p className='text-muted-foreground text-center py-8'>
							Not enough data for recommendations. Continue tracking
							budgets for at least 2-3 months.
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function RecommendationBadge({
	recommendation,
	suggestedAmount,
}: {
	recommendation: 'increase' | 'decrease' | 'stable';
	suggestedAmount: number | null;
}) {
	switch (recommendation) {
		case 'increase':
			return (
				<Badge
					variant='destructive'
					className='flex items-center gap-1 w-fit'
				>
					<ArrowUp className='h-3 w-3' />
					{suggestedAmount
						? `Increase to ${formatCurrency(suggestedAmount)}`
						: 'Increase'}
				</Badge>
			);
		case 'decrease':
			return (
				<Badge
					variant='secondary'
					className='flex items-center gap-1 w-fit bg-amber-100 text-amber-800 hover:bg-amber-200'
				>
					<ArrowDown className='h-3 w-3' />
					{suggestedAmount
						? `Reduce to ${formatCurrency(suggestedAmount)}`
						: 'Reduce'}
				</Badge>
			);
		case 'stable':
			return (
				<Badge
					variant='outline'
					className='flex items-center gap-1 w-fit text-emerald-600 border-emerald-200'
				>
					<CheckCircle className='h-3 w-3' />
					On track
				</Badge>
			);
	}
}
