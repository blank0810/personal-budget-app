'use client';

import {
	Bar,
	BarChart,
	ResponsiveContainer,
	XAxis,
	YAxis,
	Tooltip,
	Legend,
	CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MonthlySummary } from '@/server/modules/report/report.types';
import { formatCurrency } from '@/lib/formatters';

interface MonthlyComparisonChartProps {
	data: MonthlySummary[];
}

export function MonthlyComparisonChart({ data }: MonthlyComparisonChartProps) {
	return (
		<Card className='col-span-4'>
			<CardHeader>
				<CardTitle>Income vs Expense</CardTitle>
			</CardHeader>
			<CardContent className='pl-2'>
				<ResponsiveContainer width='100%' height={350}>
					<BarChart data={data}>
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
							tickFormatter={(value) =>
								formatCurrency(value, { decimals: 0 })
							}
						/>
						<Tooltip
							formatter={(value: number | undefined) =>
								value != null ? formatCurrency(value) : ''
							}
							cursor={{ fill: 'transparent' }}
						/>
						<Legend />
						<Bar
							dataKey='income'
							name='Income'
							fill='#22c55e'
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
			</CardContent>
		</Card>
	);
}
