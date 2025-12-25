'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FinancialStatement as FinancialStatementType } from '@/server/modules/report/report.types';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { ArrowDownLeft, ArrowUpRight, DollarSign } from 'lucide-react';

interface FinancialStatementProps {
	data: FinancialStatementType;
	initialFrom: Date;
	initialTo: Date;
}

export function FinancialStatement({
	data,
	initialFrom,
	initialTo,
}: FinancialStatementProps) {
	const router = useRouter();
	const [date, setDate] = useState<DateRange | undefined>({
		from: initialFrom,
		to: initialTo,
	});

	// Update URL when date changes
	useEffect(() => {
		if (date?.from && date?.to) {
			const params = new URLSearchParams();
			params.set('from', date.from.toISOString());
			params.set('to', date.to.toISOString());

			// Use replace to prevent history stack buildup, but keep interaction snappy
			router.push(`?${params.toString()}`);
		}
	}, [date, router]);

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
		}).format(amount);
	};

	return (
		<div className='space-y-6'>
			<div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
				<h2 className='text-2xl font-bold tracking-tight'>
					Financial Statement
				</h2>
				<DateRangePicker date={date} setDate={setDate} />
			</div>

			<div className='grid gap-4 md:grid-cols-3'>
				<Card>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>
							Total Income
						</CardTitle>
						<ArrowDownLeft className='h-4 w-4 text-green-500' />
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold text-green-600'>
							+{formatCurrency(data.totalIncome)}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>
							Total Expenses
						</CardTitle>
						<ArrowUpRight className='h-4 w-4 text-red-500' />
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold text-red-600'>
							-{formatCurrency(data.totalExpense)}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>
							Net Income
						</CardTitle>
						<DollarSign className='h-4 w-4 text-muted-foreground' />
					</CardHeader>
					<CardContent>
						<div
							className={`text-2xl font-bold ${
								data.netIncome >= 0
									? 'text-green-600'
									: 'text-red-600'
							}`}
						>
							{data.netIncome >= 0 ? '+' : ''}
							{formatCurrency(data.netIncome)}
						</div>
						<p className='text-xs text-muted-foreground'>
							Savings Rate: {data.savingsRate.toFixed(1)}%
						</p>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>
						Detailed Ledger ({format(initialFrom, 'MMM d, yyyy')} -{' '}
						{format(initialTo, 'MMM d, yyyy')})
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className='space-y-8'>
						{/* Income Section */}
						<div>
							<h3 className='font-semibold text-lg mb-4 text-green-600 border-b pb-2'>
								Income
							</h3>
							<div className='space-y-2'>
								{data.income.map((item) => (
									<div
										key={item.categoryId}
										className='flex items-center justify-between text-sm'
									>
										<div className='flex items-center gap-2'>
											<div
												className='w-3 h-3 rounded-full'
												style={{
													backgroundColor:
														item.color || '#10b981',
												}}
											/>
											<span>{item.categoryName}</span>
										</div>
										<span className='font-medium'>
											{formatCurrency(item.amount)}
										</span>
									</div>
								))}
								{data.income.length === 0 && (
									<p className='text-sm text-muted-foreground'>
										No income recorded for this period.
									</p>
								)}
								<div className='pt-2 mt-2 border-t flex justify-between font-bold'>
									<span>Total Income</span>
									<span>
										{formatCurrency(data.totalIncome)}
									</span>
								</div>
							</div>
						</div>

						{/* Expenses Section */}
						<div>
							<h3 className='font-semibold text-lg mb-4 text-red-600 border-b pb-2'>
								Expenses
							</h3>
							<div className='space-y-2'>
								{data.expenses.map((item) => (
									<div
										key={item.categoryId}
										className='flex items-center justify-between text-sm'
									>
										<div className='flex items-center gap-2'>
											<div
												className='w-3 h-3 rounded-full'
												style={{
													backgroundColor:
														item.color || '#ef4444',
												}}
											/>
											<span>{item.categoryName}</span>
										</div>
										<span className='font-medium'>
											{formatCurrency(item.amount)}
										</span>
									</div>
								))}
								{data.expenses.length === 0 && (
									<p className='text-sm text-muted-foreground'>
										No expenses recorded for this period.
									</p>
								)}
								<div className='pt-2 mt-2 border-t flex justify-between font-bold'>
									<span>Total Expenses</span>
									<span>
										{formatCurrency(data.totalExpense)}
									</span>
								</div>
							</div>
						</div>

						{/* Net Income Summary */}
						<div className='pt-4 border-t-2 border-dashed'>
							<div className='flex justify-between items-center text-lg font-bold'>
								<span>Net Income</span>
								<span
									className={
										data.netIncome >= 0
											? 'text-green-600'
											: 'text-red-600'
									}
								>
									{formatCurrency(data.netIncome)}
								</span>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
