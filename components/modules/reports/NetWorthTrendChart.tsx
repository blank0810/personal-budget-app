'use client';

import { useState } from 'react';
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
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronsUpDown } from 'lucide-react';
import { NetWorthHistoryPoint } from '@/server/modules/report/report.types';
import { useCurrency } from '@/lib/contexts/currency-context';
import { format } from 'date-fns';

interface NetWorthTrendChartProps {
	data: NetWorthHistoryPoint[];
}

export function NetWorthTrendChart({ data }: NetWorthTrendChartProps) {
	const { formatCurrency } = useCurrency();
	const [isOpen, setIsOpen] = useState(true);

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen}>
			<Card className='col-span-4'>
				<CardHeader className='flex flex-row items-center justify-between space-y-0'>
					<CardTitle>Net Worth Trend</CardTitle>
					<CollapsibleTrigger asChild>
						<Button variant='ghost' size='sm'>
							<ChevronsUpDown className='h-4 w-4' />
							<span className='sr-only'>Toggle chart</span>
						</Button>
					</CollapsibleTrigger>
				</CardHeader>
				<CollapsibleContent>
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
				</CollapsibleContent>
			</Card>
		</Collapsible>
	);
}
