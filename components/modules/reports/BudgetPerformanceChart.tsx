'use client';

import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface BudgetMetric {
	categoryId: string;
	categoryName: string;
	color: string | null;
	icon: string | null;
	budgeted: number;
	actual: number;
	variance: number;
	percentUsed: number;
}

interface BudgetPerformanceChartProps {
	data: BudgetMetric[];
}

export function BudgetPerformanceChart({ data }: BudgetPerformanceChartProps) {
	if (data.length === 0) {
		return (
			<Card className='col-span-2'>
				<CardHeader>
					<CardTitle>Budget vs. Actual</CardTitle>
				</CardHeader>
				<CardContent>
					<div className='flex h-[350px] items-center justify-center text-muted-foreground'>
						No budget data available for this month.
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className='col-span-2'>
			<CardHeader>
				<CardTitle>Budget Performance (This Month)</CardTitle>
			</CardHeader>
			<CardContent className='space-y-6'>
				{/* Chart View */}
				<div className='h-[300px] w-full'>
					<ResponsiveContainer width='100%' height='100%'>
						<BarChart
							data={data}
							layout='vertical'
							margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
						>
							<CartesianGrid
								strokeDasharray='3 3'
								horizontal={false}
							/>
							<XAxis type='number' hide />
							<YAxis
								dataKey='categoryName'
								type='category'
								width={100}
								tick={{ fontSize: 12 }}
							/>
							<Tooltip
								cursor={{ fill: 'transparent' }}
								formatter={(value: number) =>
									`$${value.toFixed(2)}`
								}
							/>
							<Legend />
							<Bar
								dataKey='budgeted'
								name='Budget'
								fill='#cbd5e1'
								radius={[0, 4, 4, 0]}
								barSize={20}
							/>
							<Bar
								dataKey='actual'
								name='Actual'
								fill='#3b82f6'
								radius={[0, 4, 4, 0]}
								barSize={20}
							/>
						</BarChart>
					</ResponsiveContainer>
				</div>

				{/* Detailed List View */}
				<div className='space-y-4 pt-4 border-t'>
					{data.map((item) => (
						<div key={item.categoryId} className='space-y-2'>
							<div className='flex items-center justify-between text-sm'>
								<div className='flex items-center gap-2'>
									<span className='font-medium'>
										{item.categoryName}
									</span>
									{item.variance < 0 && (
										<span className='text-xs text-red-500 font-bold'>
											Over Budget
										</span>
									)}
								</div>
								<div className='text-muted-foreground'>
									<span
										className={
											item.actual > item.budgeted
												? 'text-red-600 font-bold'
												: ''
										}
									>
										${item.actual.toFixed(0)}
									</span>
									{' / '}
									<span>${item.budgeted.toFixed(0)}</span>
								</div>
							</div>
							<Progress
								value={Math.min(item.percentUsed, 100)}
								className={`h-2 ${
									item.actual > item.budgeted
										? 'bg-red-100'
										: ''
								}`}
								indicatorClassName={
									item.actual > item.budgeted
										? 'bg-red-500'
										: item.percentUsed > 80
										? 'bg-yellow-500'
										: 'bg-green-500'
								}
							/>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
