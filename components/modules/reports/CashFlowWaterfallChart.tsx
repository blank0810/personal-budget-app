'use client';

import {
	Bar,
	BarChart,
	Cell,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
	ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import type { CashFlowWaterfall } from '@/server/modules/report/report.types';

interface CashFlowWaterfallChartProps {
	data: CashFlowWaterfall;
}

export function CashFlowWaterfallChart({ data }: CashFlowWaterfallChartProps) {
	// Transform data for waterfall visualization
	// Each bar needs: name, start (invisible spacer), value (visible bar)
	const waterfallData = [];
	let runningTotal = 0;

	for (const item of data.items) {
		if (item.type === 'income') {
			// Income bar starts at 0, goes up
			waterfallData.push({
				name: item.name,
				start: 0,
				value: item.value,
				type: item.type,
				color: item.color || '#22c55e',
				displayValue: item.value,
			});
			runningTotal = item.value;
		} else if (item.type === 'expense') {
			// Expense bars start at running total and go down
			const newTotal = runningTotal - item.value;
			waterfallData.push({
				name: item.name,
				start: Math.min(runningTotal, newTotal),
				value: item.value,
				type: item.type,
				color: item.color || '#ef4444',
				displayValue: -item.value,
			});
			runningTotal = newTotal;
		} else if (item.type === 'net') {
			// Net result bar shows final position
			waterfallData.push({
				name: item.name,
				start: 0,
				value: Math.abs(item.value),
				type: item.type,
				color: item.value >= 0 ? '#22c55e' : '#ef4444',
				displayValue: item.value,
				isNet: true,
			});
		}
	}

	// Empty state
	if (data.items.length === 0 || data.totalIncome === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Cash Flow</CardTitle>
				</CardHeader>
				<CardContent>
					<div className='flex h-[350px] items-center justify-center text-muted-foreground'>
						No income or expense data available for this period.
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader className='pb-2'>
				<div className='flex items-center justify-between'>
					<CardTitle>Cash Flow</CardTitle>
					<div className='flex items-center gap-4 text-sm'>
						<div className='flex items-center gap-1.5'>
							<div className='h-3 w-3 rounded-sm bg-green-500' />
							<span className='text-muted-foreground'>Income</span>
						</div>
						<div className='flex items-center gap-1.5'>
							<div className='h-3 w-3 rounded-sm bg-red-500' />
							<span className='text-muted-foreground'>Expenses</span>
						</div>
					</div>
				</div>
			</CardHeader>
			<CardContent className='space-y-4'>
				{/* Summary Row */}
				<div className='grid grid-cols-3 gap-4 text-center p-4 bg-muted/50 rounded-lg'>
					<div>
						<p className='text-sm text-muted-foreground'>Total Income</p>
						<p className='text-lg font-bold text-green-600'>
							{formatCurrency(data.totalIncome)}
						</p>
					</div>
					<div>
						<p className='text-sm text-muted-foreground'>Total Expenses</p>
						<p className='text-lg font-bold text-red-600'>
							{formatCurrency(data.totalExpenses)}
						</p>
					</div>
					<div>
						<p className='text-sm text-muted-foreground'>Net Result</p>
						<p
							className={`text-lg font-bold ${
								data.netResult >= 0 ? 'text-green-600' : 'text-red-600'
							}`}
						>
							{formatCurrency(data.netResult)}
						</p>
					</div>
				</div>

				{/* Waterfall Chart */}
				<div className='h-[300px] w-full'>
					<ResponsiveContainer width='100%' height='100%'>
						<BarChart
							data={waterfallData}
							margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
						>
							<XAxis
								dataKey='name'
								tick={{ fontSize: 11 }}
								angle={-45}
								textAnchor='end'
								height={60}
								interval={0}
							/>
							<YAxis
								tickFormatter={(value) =>
									formatCurrency(value, { decimals: 0 })
								}
								tick={{ fontSize: 11 }}
							/>
							<Tooltip
								cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
								content={({ active, payload }) => {
									if (!active || !payload || !payload[0]) return null;
									const item = payload[0].payload;
									return (
										<div className='bg-background border rounded-lg shadow-lg p-3'>
											<p className='font-medium'>{item.name}</p>
											<p
												className={`text-sm ${
													item.displayValue >= 0
														? 'text-green-600'
														: 'text-red-600'
												}`}
											>
												{item.displayValue >= 0 ? '+' : ''}
												{formatCurrency(item.displayValue)}
											</p>
										</div>
									);
								}}
							/>
							<ReferenceLine y={0} stroke='#888' strokeDasharray='3 3' />

							{/* Invisible spacer bar */}
							<Bar dataKey='start' stackId='waterfall' fill='transparent' />

							{/* Visible value bar */}
							<Bar
								dataKey='value'
								stackId='waterfall'
								radius={[4, 4, 0, 0]}
							>
								{waterfallData.map((entry, index) => (
									<Cell key={`cell-${index}`} fill={entry.color} />
								))}
							</Bar>
						</BarChart>
					</ResponsiveContainer>
				</div>

				{/* Expense Breakdown List */}
				<div className='space-y-2 pt-4 border-t'>
					<p className='text-sm font-medium text-muted-foreground'>
						Expense Breakdown
					</p>
					<div className='grid gap-2'>
						{data.items
							.filter((item) => item.type === 'expense')
							.map((item, index) => (
								<div
									key={index}
									className='flex items-center justify-between text-sm'
								>
									<div className='flex items-center gap-2'>
										<div
											className='h-2 w-2 rounded-full'
											style={{
												backgroundColor: item.color || '#ef4444',
											}}
										/>
										<span>{item.name}</span>
									</div>
									<span className='font-medium text-red-600'>
										-{formatCurrency(item.value)}
									</span>
								</div>
							))}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
