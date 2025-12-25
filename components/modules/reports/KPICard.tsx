'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';

interface KPICardProps {
	title: string;
	value: string | number;
	change: number;
	trend: 'up' | 'down' | 'neutral';
	history: number[];
	formatValue?: (val: number) => string;
	inverseTrend?: boolean; // If true, "up" is bad (e.g. Expenses)
}

export function KPICard({
	title,
	value,
	change,
	trend,
	history,
	inverseTrend = false,
}: KPICardProps) {
	const chartData = history.map((val, i) => ({ i, val }));

	const isPositive = trend === 'up';
	const isNeutral = trend === 'neutral';

	// Determine color based on trend and inverse flag
	// Default: Up = Green (Good), Down = Red (Bad)
	// Inverse: Up = Red (Bad), Down = Green (Good)
	let trendColor = 'text-green-500';
	if (isNeutral) trendColor = 'text-muted-foreground';
	else if ((isPositive && inverseTrend) || (!isPositive && !inverseTrend)) {
		trendColor = 'text-red-500';
	}

	const Icon = isNeutral ? Minus : isPositive ? ArrowUpRight : ArrowDownRight;

	return (
		<Card className='overflow-hidden'>
			<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
				<CardTitle className='text-sm font-medium text-muted-foreground'>
					{title}
				</CardTitle>
				<div
					className={`flex items-center text-xs font-medium ${trendColor}`}
				>
					<Icon className='h-3 w-3 mr-1' />
					{Math.abs(change).toFixed(1)}%
				</div>
			</CardHeader>
			<CardContent>
				<div className='text-2xl font-bold'>{value}</div>

				<div className='h-[40px] mt-3 -mx-2'>
					<ResponsiveContainer width='100%' height='100%'>
						<AreaChart data={chartData}>
							<defs>
								<linearGradient
									id={`gradient-${title}`}
									x1='0'
									y1='0'
									x2='0'
									y2='1'
								>
									<stop
										offset='0%'
										stopColor='currentColor'
										className={trendColor}
										stopOpacity={0.2}
									/>
									<stop
										offset='100%'
										stopColor='currentColor'
										className={trendColor}
										stopOpacity={0}
									/>
								</linearGradient>
							</defs>
							<YAxis domain={['dataMin', 'dataMax']} hide />
							<Area
								type='monotone'
								dataKey='val'
								stroke='currentColor'
								strokeWidth={2}
								className={trendColor}
								fill={`url(#gradient-${title})`}
							/>
						</AreaChart>
					</ResponsiveContainer>
				</div>
			</CardContent>
		</Card>
	);
}
