'use client';

import { useMemo } from 'react';
import {
	Area,
	CartesianGrid,
	ComposedChart,
	Legend,
	Line,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MonthlySummary } from '@/server/modules/report/report.types';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface IncomeExpenseRatioChartProps {
	data: MonthlySummary[];
}

interface RatioDataPoint {
	month: string;
	label: string;
	ratio: number;
	savings: number;
	income: number;
	expense: number;
}

function getHealthColor(ratio: number): string {
	if (ratio > 100) return '#dc2626'; // red-600 — critical
	if (ratio > 90) return '#ef4444'; // red-500
	if (ratio > 70) return '#eab308'; // yellow-500
	return '#22c55e'; // green-500
}

function getHealthLabel(ratio: number): string {
	if (ratio > 100) return 'Critical';
	if (ratio > 90) return 'Tight';
	if (ratio > 70) return 'Moderate';
	return 'Healthy';
}

export function IncomeExpenseRatioChart({ data }: IncomeExpenseRatioChartProps) {
	const { chartData, summary } = useMemo(() => {
		const points: RatioDataPoint[] = data.map((d) => {
			const ratio = d.income > 0 ? (d.expense / d.income) * 100 : d.expense > 0 ? 100 : 0;
			return {
				month: d.month,
				label: format(new Date(d.month + '-01'), 'MMM'),
				ratio: Math.round(ratio * 10) / 10,
				savings: Math.max(d.income - d.expense, 0),
				income: d.income,
				expense: d.expense,
			};
		});

		const ratios = points.filter((p) => p.income > 0).map((p) => p.ratio);
		const avg = ratios.length > 0 ? ratios.reduce((s, r) => s + r, 0) / ratios.length : 0;

		const best = ratios.length > 0
			? points.reduce((b, p) => (p.income > 0 && p.ratio < b.ratio ? p : b), points.filter(p => p.income > 0)[0])
			: null;
		const worst = ratios.length > 0
			? points.reduce((w, p) => (p.income > 0 && p.ratio > w.ratio ? p : w), points.filter(p => p.income > 0)[0])
			: null;

		// Trend: compare first half avg vs second half avg
		const mid = Math.floor(ratios.length / 2);
		const firstHalf = ratios.slice(0, mid);
		const secondHalf = ratios.slice(mid);
		const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((s, r) => s + r, 0) / firstHalf.length : 0;
		const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((s, r) => s + r, 0) / secondHalf.length : 0;
		const trendDiff = secondAvg - firstAvg;
		const trend: 'improving' | 'worsening' | 'stable' =
			trendDiff < -2 ? 'improving' : trendDiff > 2 ? 'worsening' : 'stable';

		return {
			chartData: points,
			summary: {
				avg: Math.round(avg * 10) / 10,
				best,
				worst,
				trend,
			},
		};
	}, [data]);

	if (chartData.length === 0) return null;

	return (
		<Card className='col-span-full'>
			<CardHeader>
				<CardTitle>Income vs Expense Ratio</CardTitle>
			</CardHeader>
			<CardContent>
				<ResponsiveContainer width='100%' height={300}>
					<ComposedChart data={chartData}>
						<defs>
							<linearGradient id='colorSavings' x1='0' y1='0' x2='0' y2='1'>
								<stop offset='5%' stopColor='#22c55e' stopOpacity={0.3} />
								<stop offset='95%' stopColor='#22c55e' stopOpacity={0.05} />
							</linearGradient>
						</defs>
						<CartesianGrid strokeDasharray='3 3' vertical={false} />
						<XAxis
							dataKey='label'
							stroke='#888888'
							fontSize={12}
							tickLine={false}
							axisLine={false}
						/>
						{/* Left Y-axis: Ratio % */}
						<YAxis
							yAxisId='ratio'
							stroke='#888888'
							fontSize={12}
							tickLine={false}
							axisLine={false}
							domain={[0, (max: number) => Math.max(Math.ceil(max / 10) * 10, 110)]}
							tickFormatter={(v) => `${v}%`}
						/>
						{/* Right Y-axis: Savings amount */}
						<YAxis
							yAxisId='savings'
							orientation='right'
							stroke='#888888'
							fontSize={12}
							tickLine={false}
							axisLine={false}
							tickFormatter={(v) => formatCurrency(v, { decimals: 0 })}
						/>
						<Tooltip
							content={({ active, payload, label }) => {
								if (!active || !payload?.length) return null;
								const d = payload[0]?.payload as RatioDataPoint;
								if (!d) return null;
								const ratioColor = getHealthColor(d.ratio);
								return (
									<div className='rounded-lg border bg-card p-3 shadow-sm'>
										<p className='text-sm font-medium mb-2'>{label}</p>
										<div className='space-y-1 text-sm'>
											<p style={{ color: ratioColor }}>
												Ratio: {d.ratio}% ({getHealthLabel(d.ratio)})
											</p>
											<p className='text-green-600'>
												Income: {formatCurrency(d.income)}
											</p>
											<p className='text-red-500'>
												Expense: {formatCurrency(d.expense)}
											</p>
											<p className='text-emerald-600'>
												Saved: {formatCurrency(d.savings)}
											</p>
										</div>
									</div>
								);
							}}
						/>
						<Legend />
						{/* Health zone reference lines */}
						<ReferenceLine
							yAxisId='ratio'
							y={70}
							stroke='#22c55e'
							strokeDasharray='4 4'
							strokeOpacity={0.5}
							label={{ value: '70%', position: 'left', fontSize: 10, fill: '#22c55e' }}
						/>
						<ReferenceLine
							yAxisId='ratio'
							y={90}
							stroke='#eab308'
							strokeDasharray='4 4'
							strokeOpacity={0.5}
							label={{ value: '90%', position: 'left', fontSize: 10, fill: '#eab308' }}
						/>
						<ReferenceLine
							yAxisId='ratio'
							y={100}
							stroke='#ef4444'
							strokeDasharray='4 4'
							strokeOpacity={0.5}
							label={{ value: '100%', position: 'left', fontSize: 10, fill: '#ef4444' }}
						/>
						{/* Savings gap area */}
						<Area
							yAxisId='savings'
							type='monotone'
							dataKey='savings'
							name='Savings'
							stroke='#22c55e'
							strokeWidth={0}
							fillOpacity={1}
							fill='url(#colorSavings)'
						/>
						{/* Ratio line */}
						<Line
							yAxisId='ratio'
							type='monotone'
							dataKey='ratio'
							name='Expense Ratio (%)'
							stroke='#6366f1'
							strokeWidth={2.5}
							dot={(props) => {
								const { cx, cy, payload } = props;
								const color = getHealthColor(payload.ratio);
								return (
									<circle
										key={`dot-${payload.month}`}
										cx={cx}
										cy={cy}
										r={4}
										fill={color}
										stroke='white'
										strokeWidth={2}
									/>
								);
							}}
							activeDot={{ r: 6, strokeWidth: 2 }}
						/>
					</ComposedChart>
				</ResponsiveContainer>

				{/* Summary row */}
				<div className='mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
					<div>
						<p className='text-muted-foreground text-xs'>Avg Ratio</p>
						<p className='font-semibold' style={{ color: getHealthColor(summary.avg) }}>
							{summary.avg}%
						</p>
					</div>
					{summary.best && (
						<div>
							<p className='text-muted-foreground text-xs'>Best Month</p>
							<p className='font-semibold text-green-600'>
								{format(new Date(summary.best.month + '-01'), 'MMM')} ({summary.best.ratio}%)
							</p>
						</div>
					)}
					{summary.worst && (
						<div>
							<p className='text-muted-foreground text-xs'>Worst Month</p>
							<p className='font-semibold text-red-500'>
								{format(new Date(summary.worst.month + '-01'), 'MMM')} ({summary.worst.ratio}%)
							</p>
						</div>
					)}
					<div>
						<p className='text-muted-foreground text-xs'>Trend</p>
						<p className='font-semibold flex items-center gap-1'>
							{summary.trend === 'improving' ? (
								<><TrendingDown className='h-4 w-4 text-green-600' /> <span className='text-green-600'>Improving</span></>
							) : summary.trend === 'worsening' ? (
								<><TrendingUp className='h-4 w-4 text-red-500' /> <span className='text-red-500'>Worsening</span></>
							) : (
								<><Minus className='h-4 w-4 text-muted-foreground' /> <span className='text-muted-foreground'>Stable</span></>
							)}
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
