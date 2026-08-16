'use client';

import Link from 'next/link';
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import type { DashboardOverview } from '@/server/modules/dashboard/dashboard.types';

export function CashFlowTrend({
	cashFlow,
	currency,
}: {
	cashFlow: DashboardOverview['cashFlow'];
	currency: string;
}) {
	if (!cashFlow.hasActivity) {
		return (
			<section
				className='border p-5 sm:p-6'
				aria-labelledby='cash-flow-title'
			>
				<h2 id='cash-flow-title' className='text-lg font-semibold'>
					Six-month cash flow
				</h2>
				<p className='mt-2 text-sm text-muted-foreground'>
					Income and expense trends appear after the first transaction.
				</p>
				<Button asChild variant='outline' size='sm' className='mt-5'>
					<Link href='/transactions'>Open Transactions</Link>
				</Button>
			</section>
		);
	}

	const summary =
		'Across six months, income was ' +
		formatCurrency(cashFlow.totalIncome, { currency }) +
		', expenses were ' +
		formatCurrency(cashFlow.totalExpense, { currency }) +
		', and net cash flow was ' +
		formatCurrency(cashFlow.net, { currency }) +
		'.';

	return (
		<figure className='border p-5 sm:p-6' aria-labelledby='cash-flow-title'>
			<figcaption className='flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between'>
				<div>
					<h2 id='cash-flow-title' className='text-lg font-semibold'>
						Six-month cash flow
					</h2>
					<p className='mt-1 text-sm text-muted-foreground'>{summary}</p>
				</div>
				<p
					className={`font-mono text-sm font-semibold tabular-nums ${
						cashFlow.net >= 0
							? 'text-emerald-700 dark:text-emerald-300'
							: 'text-red-700 dark:text-red-300'
					}`}
				>
					{cashFlow.net >= 0 ? 'Surplus ' : 'Deficit '}
					{formatCurrency(Math.abs(cashFlow.net), { currency })}
				</p>
			</figcaption>
			<div className='mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground'>
				<span className='flex items-center gap-2'>
					<span className='h-0.5 w-4 bg-[var(--chart-2)]' aria-hidden='true' />
					Income
				</span>
				<span className='flex items-center gap-2'>
					<span className='h-0.5 w-4 bg-destructive' aria-hidden='true' />
					Expenses
				</span>
			</div>
			<div className='mt-4 h-72' aria-hidden='true'>
				<ResponsiveContainer width='100%' height={288}>
					<LineChart
						data={cashFlow.points}
						margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
					>
						<CartesianGrid
							vertical={false}
							stroke='currentColor'
							className='text-border'
						/>
						<XAxis dataKey='month' tickLine={false} axisLine={false} />
						<YAxis
							width={72}
							tickLine={false}
							axisLine={false}
							tickFormatter={(value) =>
								formatCurrency(Number(value), {
									currency,
									decimals: 0,
								})
							}
						/>
						<Tooltip
							contentStyle={{
								backgroundColor: 'var(--popover)',
								borderColor: 'var(--border)',
								borderRadius: 'var(--radius-sm)',
								color: 'var(--popover-foreground)',
							}}
							formatter={(value, name) => [
								formatCurrency(Number(value), { currency }),
								name === 'income' ? 'Income' : 'Expense',
							]}
						/>
						<Line
							type='monotone'
							dataKey='income'
							stroke='var(--chart-2)'
							strokeWidth={2}
							dot={false}
							isAnimationActive={false}
						/>
						<Line
							type='monotone'
							dataKey='expense'
							stroke='var(--destructive)'
							strokeWidth={2}
							dot={false}
							isAnimationActive={false}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>
			<table className='sr-only'>
				<caption>{summary}</caption>
				<thead>
					<tr>
						<th>Month</th>
						<th>Income</th>
						<th>Expense</th>
						<th>Surplus</th>
					</tr>
				</thead>
				<tbody>
					{cashFlow.points.map((point) => (
						<tr key={point.month}>
							<th>{point.month}</th>
							<td>{formatCurrency(point.income, { currency })}</td>
							<td>{formatCurrency(point.expense, { currency })}</td>
							<td>{formatCurrency(point.surplus, { currency })}</td>
						</tr>
					))}
				</tbody>
			</table>
		</figure>
	);
}
