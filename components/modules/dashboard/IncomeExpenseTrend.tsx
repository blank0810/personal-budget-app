'use client';

import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/lib/contexts/currency-context';

interface TrendDataPoint {
	month: string;
	income: number;
	expense: number;
}

interface IncomeExpenseTrendProps {
	data: TrendDataPoint[];
}

export function IncomeExpenseTrend({
	data,
}: IncomeExpenseTrendProps) {
	const { formatCurrency } = useCurrency();
	const totalIncome = data.reduce((sum, d) => sum + d.income, 0);
	const totalExpense = data.reduce((sum, d) => sum + d.expense, 0);
	const net = totalIncome - totalExpense;
	const netPositive = net >= 0;

	return (
		<Card className='animate-fade-up flex flex-col h-full'>
			<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-4'>
				<CardTitle>Income vs Expenses</CardTitle>
				<span className='text-xs text-muted-foreground'>Last 6 Months</span>
			</CardHeader>

			<CardContent className='flex flex-1 flex-col gap-6'>
				<ResponsiveContainer width='100%' height={260}>
					<BarChart
						data={data}
						margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
					>
						<CartesianGrid strokeDasharray='3 3' vertical={false} />
						<XAxis
							dataKey='month'
							stroke='#888888'
							fontSize={12}
							tickLine={false}
							axisLine={false}
						/>
						<YAxis
							stroke='#888888'
							fontSize={12}
							tickLine={false}
							axisLine={false}
							tickFormatter={(value) => formatCurrency(value)}
							width={72}
						/>
						<Tooltip
							cursor={{ fill: 'transparent' }}
							content={({ active, payload, label }) => {
								if (!active || !payload?.length) return null;
								return (
									<div className='rounded-lg border bg-card p-3 shadow-sm text-sm'>
										<p className='font-medium mb-2'>{label}</p>
										<div className='space-y-1'>
											{payload.map((entry) => (
												<p
													key={entry.dataKey as string}
													style={{ color: entry.color }}
												>
													{entry.name}:{' '}
													{formatCurrency(entry.value as number)}
												</p>
											))}
										</div>
									</div>
								);
							}}
						/>
						<Bar
							dataKey='income'
							name='Income'
							fill='#10b981'
							radius={[4, 4, 0, 0]}
						/>
						<Bar
							dataKey='expense'
							name='Expense'
							fill='#ef4444'
							radius={[4, 4, 0, 0]}
						/>
					</BarChart>
				</ResponsiveContainer>

				{/* Summary stats row */}
				<div className='grid grid-cols-3 gap-4 pt-4 border-t text-sm'>
					<div>
						<p className='text-xs text-muted-foreground mb-0.5'>
							Total Income
						</p>
						<p className='font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums'>
							{formatCurrency(totalIncome)}
						</p>
					</div>
					<div>
						<p className='text-xs text-muted-foreground mb-0.5'>
							Total Expenses
						</p>
						<p className='font-semibold text-red-500 dark:text-red-400 tabular-nums'>
							{formatCurrency(totalExpense)}
						</p>
					</div>
					<div>
						<p className='text-xs text-muted-foreground mb-0.5'>Net</p>
						<p
							className={cn(
								'font-semibold tabular-nums',
								netPositive
									? 'text-emerald-600 dark:text-emerald-400'
									: 'text-red-500 dark:text-red-400'
							)}
						>
							{netPositive ? '+' : ''}
							{formatCurrency(net)}
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
