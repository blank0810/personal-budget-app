'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FinancialStatement as FinancialStatementType } from '@/server/modules/report/report.types';
import { formatCurrency } from '@/lib/formatters';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import {
	ArrowDownLeft,
	ArrowUpRight,
	DollarSign,
	Wallet,
	CreditCard,
	Landmark,
} from 'lucide-react';

import { Account } from '@prisma/client';

interface FinancialStatementProps {
	data: FinancialStatementType;
	initialFrom: Date;
	initialTo: Date;
	accounts: Account[];
}

export function FinancialStatement({
	data,
	initialFrom,
	initialTo,
	accounts,
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

			{/* Balance Sheet Section */}
			<Card>
				<CardHeader>
					<CardTitle>Balance Sheet (Current Context)</CardTitle>
				</CardHeader>
				<CardContent>
					<div className='flex flex-col gap-6'>
						<div className='grid gap-8 md:grid-cols-2'>
							{/* Assets Column */}
							<div className='flex flex-col h-full rounded-xl border bg-card/50 overflow-hidden'>
								<div className='p-4 border-b bg-emerald-50/50 dark:bg-emerald-950/20'>
									<h3 className='font-semibold text-lg text-emerald-600 flex items-center gap-2'>
										<Wallet className='h-5 w-5' /> Assets
									</h3>
								</div>

								<div className='flex-1 p-4 space-y-4'>
									{accounts
										.filter((a) => !a.isLiability)
										.map((account) => (
											<div
												key={account.id}
												className='flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-accent/50 transition-colors'
											>
												<div className='flex items-center gap-3'>
													<div className='h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400'>
														<Landmark className='h-4 w-4' />
													</div>
													<div>
														<p className='font-medium text-sm'>
															{account.name}
														</p>
														<p className='text-xs text-muted-foreground capitalize'>
															{account.type.toLowerCase()}
														</p>
													</div>
												</div>
												<div className='font-bold'>
													{formatCurrency(
														Number(account.balance)
													)}
												</div>
											</div>
										))}
									{accounts.filter((a) => !a.isLiability)
										.length === 0 && (
										<p className='text-muted-foreground italic text-sm py-4 text-center'>
											No assets found.
										</p>
									)}
								</div>

								<div className='p-4 border-t bg-emerald-50/30 dark:bg-emerald-950/10 mt-auto'>
									<div className='flex justify-between items-center font-bold text-lg'>
										<span>Total Assets</span>
										<span className='text-emerald-600'>
											{formatCurrency(
												accounts
													.filter(
														(a) => !a.isLiability
													)
													.reduce(
														(sum, a) =>
															sum +
															Number(a.balance),
														0
													)
											)}
										</span>
									</div>
								</div>
							</div>

							{/* Liabilities Column */}
							<div className='flex flex-col h-full rounded-xl border bg-card/50 overflow-hidden'>
								<div className='p-4 border-b bg-red-50/50 dark:bg-red-950/20'>
									<h3 className='font-semibold text-lg text-red-600 flex items-center gap-2'>
										<CreditCard className='h-5 w-5' />{' '}
										Liabilities
									</h3>
								</div>

								<div className='flex-1 p-4 space-y-4'>
									{accounts
										.filter((a) => a.isLiability)
										.map((account) => (
											<div
												key={account.id}
												className='flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-accent/50 transition-colors'
											>
												<div className='flex items-center gap-3'>
													<div className='h-8 w-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center text-red-600 dark:text-red-400'>
														<CreditCard className='h-4 w-4' />
													</div>
													<div>
														<p className='font-medium text-sm'>
															{account.name}
														</p>
														<div className='flex flex-col gap-1'>
															<p className='text-xs text-muted-foreground capitalize'>
																{account.type.toLowerCase()}
															</p>
															{account.type ===
																'CREDIT' &&
																account.creditLimit && (
																	<div className='flex flex-col gap-1 mt-0.5 w-[140px]'>
																		<div className='flex justify-between items-center text-[10px]'>
																			<span className='text-muted-foreground'>
																				Limit:{' '}
																				{formatCurrency(
																					Number(
																						account.creditLimit
																					)
																				)}
																			</span>
																			<span
																				className={
																					(Number(
																						account.creditLimit
																					) -
																						Number(
																							account.balance
																						)) /
																						Number(
																							account.creditLimit
																						) <
																					0.3
																						? 'text-green-600 font-medium'
																						: (Number(
																								account.creditLimit
																						  ) -
																								Number(
																									account.balance
																								)) /
																								Number(
																									account.creditLimit
																								) <
																						  0.5
																						? 'text-yellow-600 font-medium'
																						: 'text-red-600 font-medium'
																				}
																			>
																				{Math.round(
																					((Number(
																						account.creditLimit
																					) -
																						Number(
																							account.balance
																						)) /
																						Number(
																							account.creditLimit
																						)) *
																						100
																				)}

																				%
																			</span>
																		</div>
																		<div className='h-1 w-full bg-secondary rounded-full overflow-hidden'>
																			<div
																				className={`h-full ${
																					(Number(
																						account.creditLimit
																					) -
																						Number(
																							account.balance
																						)) /
																						Number(
																							account.creditLimit
																						) <
																					0.3
																						? 'bg-green-500'
																						: (Number(
																								account.creditLimit
																						  ) -
																								Number(
																									account.balance
																								)) /
																								Number(
																									account.creditLimit
																								) <
																						  0.5
																						? 'bg-yellow-500'
																						: 'bg-red-500'
																				}`}
																				style={{
																					width: `${Math.min(
																						((Number(
																							account.creditLimit
																						) -
																							Number(
																								account.balance
																							)) /
																							Number(
																								account.creditLimit
																							)) *
																							100,
																						100
																					)}%`,
																				}}
																			/>
																		</div>
																	</div>
																)}
														</div>
													</div>
												</div>
												<div className='font-bold text-red-600 self-start mt-1'>
													{formatCurrency(
														account.creditLimit
															? Number(
																	account.creditLimit
															  ) -
																	Number(
																		account.balance
																	)
															: Number(
																	account.balance
															  )
													)}
												</div>
											</div>
										))}
									{accounts.filter((a) => a.isLiability)
										.length === 0 && (
										<div className='flex flex-col items-center justify-center h-24 text-center border-2 border-dashed rounded-lg text-muted-foreground bg-background/50'>
											<p className='text-sm'>
												No liabilities found.
											</p>
											<p className='text-xs'>
												Great job keeping debt low!
											</p>
										</div>
									)}
								</div>

								<div className='p-4 border-t bg-red-50/30 dark:bg-red-950/10 mt-auto'>
									<div className='flex justify-between items-center font-bold text-lg'>
										<span>Total Liabilities</span>
										<span className='text-red-600'>
											{formatCurrency(
												accounts
													.filter(
														(a) => a.isLiability
													)
													.reduce(
														(sum, a) =>
															sum +
															(a.creditLimit
																? Number(
																		a.creditLimit
																  ) -
																  Number(
																		a.balance
																  )
																: Number(
																		a.balance
																  )),
														0
													)
											)}
										</span>
									</div>
								</div>
							</div>
						</div>

						{/* Net Worth Summary Footer */}
						<div className='rounded-xl border bg-gradient-to-r from-background to-secondary/10 p-4'>
							<div className='flex justify-between items-center'>
								<div>
									<h3 className='font-bold text-lg'>
										Total Equity (Net Worth)
									</h3>
									<p className='text-sm text-muted-foreground'>
										Total Assets - Total Liabilities
									</p>
								</div>
								<div className='text-2xl font-bold text-primary'>
									{formatCurrency(
										accounts.reduce((sum, a) => {
											if (a.isLiability) {
												const liabilityAmount =
													a.creditLimit
														? Number(
																a.creditLimit
														  ) - Number(a.balance)
														: Number(a.balance);
												return sum - liabilityAmount;
											} else {
												return sum + Number(a.balance);
											}
										}, 0)
									)}
								</div>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>
						Income & Expense Detail (
						{format(initialFrom, 'MMM d, yyyy')} -{' '}
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
