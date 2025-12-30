'use client';

import {
	Area,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
	Line,
	ComposedChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NetWorthHistoryPoint } from '@/server/modules/report/report.types';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';

interface NetWorthTrendChartProps {
	data: NetWorthHistoryPoint[];
}

export function NetWorthTrendChart({ data }: NetWorthTrendChartProps) {
	return (
		<Card className='col-span-4'>
			<CardHeader>
				<CardTitle>Net Worth Trend</CardTitle>
			</CardHeader>
			<CardContent className='pl-2'>
				<ResponsiveContainer width='100%' height={350}>
					<ComposedChart data={data}>
						<defs>
							<linearGradient
								id='colorNetWorth'
								x1='0'
								y1='0'
								x2='0'
								y2='1'
							>
								<stop
									offset='5%'
									stopColor='#6366f1'
									stopOpacity={0.3}
								/>
								<stop
									offset='95%'
									stopColor='#6366f1'
									stopOpacity={0}
								/>
							</linearGradient>
						</defs>
						<CartesianGrid strokeDasharray='3 3' vertical={false} />
						<XAxis
							dataKey='date'
							stroke='#888888'
							fontSize={12}
							tickLine={false}
							axisLine={false}
							tickFormatter={(value) =>
								format(new Date(value), 'MMM d')
							}
							minTickGap={30}
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
							labelFormatter={(label) =>
								format(new Date(label), 'PPP')
							}
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							formatter={(value: any) =>
								value != null
									? formatCurrency(Number(value))
									: ''
							}
							contentStyle={{
								backgroundColor: 'hsl(var(--card))',
								borderColor: 'hsl(var(--border))',
								borderRadius: '0.5rem',
							}}
							itemStyle={{ color: 'hsl(var(--foreground))' }}
						/>
						<Legend />
						<Area
							type='monotone'
							dataKey='netWorth'
							name='Net Worth'
							stroke='#6366f1'
							strokeWidth={2}
							fillOpacity={1}
							fill='url(#colorNetWorth)'
						/>
						<Line
							type='monotone'
							dataKey='assets'
							name='Total Assets'
							stroke='#10b981'
							strokeWidth={2}
							dot={false}
						/>
						<Line
							type='monotone'
							dataKey='liabilities'
							name='Total Liabilities'
							stroke='#ef4444'
							strokeWidth={2}
							dot={false}
						/>
					</ComposedChart>
				</ResponsiveContainer>
			</CardContent>
		</Card>
	);
}
