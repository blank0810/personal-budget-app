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

interface BudgetAnalyticsProps {
	trends: MonthlyTrend[];
	recommendations: CategoryRecommendation[];
}

export function BudgetAnalytics({
	trends,
	recommendations,
}: BudgetAnalyticsProps) {
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
