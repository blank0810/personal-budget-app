import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { DashboardService } from '@/server/modules/dashboard/dashboard.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import {
	ArrowDownLeft,
	ArrowUpRight,
	Wallet,
	CreditCard,
	DollarSign,
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

import { ClearCacheButton } from '@/components/common/clear-cache-button';
import { ScrollArea } from '@/components/ui/scroll-area';

export default async function DashboardPage() {
	const session = await auth();
	if (!session?.user?.id) {
		redirect('/api/auth/signin');
	}

	const userId = session.user.id;

	const [netWorthData, recentTransactions, accounts, financialHealth] =
		await Promise.all([
			DashboardService.getNetWorth(userId),
			DashboardService.getRecentTransactions(userId, 5),
			DashboardService.getAccountBalances(userId),
			DashboardService.getFinancialHealthMetrics(userId),
		]);

	return (
		<div className='container mx-auto py-10 space-y-8'>
			<div className='flex justify-between items-center'>
				<h1 className='text-3xl font-bold tracking-tight'>Dashboard</h1>
				<ClearCacheButton />
			</div>

			{/* Financial Health Grid - Solvency First */}
			<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
				{/* 1. Net Worth (Primary Solvency Metric) */}
				<Card className='bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950 dark:to-background border-indigo-100 dark:border-indigo-900 transition-all hover:shadow-md'>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium text-indigo-900 dark:text-indigo-100'>
							Net Worth
						</CardTitle>
						<div className='h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center'>
							<DollarSign className='h-4 w-4 text-indigo-600 dark:text-indigo-400' />
						</div>
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold text-indigo-700 dark:text-indigo-300'>
							{formatCurrency(netWorthData.netWorth)}
						</div>
						<p className='text-xs text-muted-foreground mt-1'>
							Assets: {formatCurrency(netWorthData.assets)}
						</p>
					</CardContent>
				</Card>

				{/* 2. Total Debt (Key Liability Metric) */}
				<Card className='transition-all hover:shadow-md'>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>
							Total Debt
						</CardTitle>
						<div className='h-8 w-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center'>
							<CreditCard className='h-4 w-4 text-red-600 dark:text-red-400' />
						</div>
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold text-red-600 dark:text-red-400'>
							{formatCurrency(netWorthData.liabilities)}
						</div>
						<p className='text-xs text-muted-foreground mt-1'>
							{financialHealth.debtToAssetRatio.toFixed(1)}%
							Debt-to-Asset
						</p>
					</CardContent>
				</Card>

				{/* 3. Runway (Liquidity) - Brutally Honest */}
				<Card className='transition-all hover:shadow-md'>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>
							Runway
						</CardTitle>
						<div className='h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center'>
							<Wallet className='h-4 w-4 text-blue-600 dark:text-blue-400' />
						</div>
					</CardHeader>
					<CardContent>
						{(() => {
							const runway = financialHealth.runwayMonths;
							const noExpenses =
								financialHealth.avgMonthlyExpense === 0;

							// Determine display value and status
							let displayValue: string;
							let statusMessage: string;
							let colorClass: string;

							if (noExpenses) {
								displayValue = '—';
								statusMessage = '📊 Add expenses to track';
								colorClass = 'text-muted-foreground';
							} else if (runway >= 12) {
								displayValue = '12+';
								statusMessage = '🏖️ Living the dream';
								colorClass =
									'text-green-600 dark:text-green-400';
							} else if (runway >= 6) {
								displayValue = runway.toFixed(1);
								statusMessage = '💪 Healthy cushion';
								colorClass =
									'text-green-600 dark:text-green-400';
							} else if (runway >= 3) {
								displayValue = runway.toFixed(1);
								statusMessage = '⚠️ Getting thin...';
								colorClass =
									'text-yellow-600 dark:text-yellow-400';
							} else if (runway >= 1) {
								displayValue = runway.toFixed(1);
								statusMessage = '🔥 Danger zone';
								colorClass =
									'text-orange-600 dark:text-orange-400';
							} else if (runway > 0) {
								displayValue = runway.toFixed(1);
								statusMessage = "💀 You're cooked";
								colorClass = 'text-red-600 dark:text-red-400';
							} else {
								displayValue = '0';
								statusMessage = '🪦 Financially deceased';
								colorClass = 'text-red-600 dark:text-red-400';
							}

							return (
								<>
									<div
										className={`text-2xl font-bold ${colorClass}`}
									>
										{displayValue} {!noExpenses && 'mo'}
									</div>
									<p className='text-xs text-muted-foreground mt-1'>
										{statusMessage}
									</p>
								</>
							);
						})()}
					</CardContent>
				</Card>

				{/* 4. Savings Rate (Velocity) - Brutally Honest */}
				<Card className='transition-all hover:shadow-md'>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>
							Savings Rate
						</CardTitle>
						<div className='h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center'>
							<ArrowUpRight className='h-4 w-4 text-emerald-600 dark:text-emerald-400' />
						</div>
					</CardHeader>
					<CardContent>
						{(() => {
							const rate = financialHealth.savingsRate;
							const noIncome = financialHealth.ytdIncome === 0;

							let displayValue: string;
							let statusMessage: string;
							let colorClass: string;

							if (noIncome) {
								displayValue = '—';
								statusMessage = '📊 Add income to track';
								colorClass = 'text-muted-foreground';
							} else if (rate >= 50) {
								displayValue = rate.toFixed(1) + '%';
								statusMessage = '🤑 Money hoarder (respect)';
								colorClass =
									'text-green-600 dark:text-green-400';
							} else if (rate >= 30) {
								displayValue = rate.toFixed(1) + '%';
								statusMessage = '🏆 FIRE candidate';
								colorClass =
									'text-green-600 dark:text-green-400';
							} else if (rate >= 20) {
								displayValue = rate.toFixed(1) + '%';
								statusMessage = '🚀 Building wealth';
								colorClass =
									'text-green-600 dark:text-green-400';
							} else if (rate >= 10) {
								displayValue = rate.toFixed(1) + '%';
								statusMessage = '📈 Making progress';
								colorClass =
									'text-yellow-600 dark:text-yellow-400';
							} else if (rate > 0) {
								displayValue = rate.toFixed(1) + '%';
								statusMessage = '😬 Barely saving';
								colorClass =
									'text-yellow-600 dark:text-yellow-400';
							} else if (rate === 0) {
								displayValue = '0%';
								statusMessage =
									'💸 Living paycheck to paycheck';
								colorClass =
									'text-orange-600 dark:text-orange-400';
							} else if (rate >= -20) {
								displayValue = rate.toFixed(1) + '%';
								statusMessage = '🔥 Spending more than earning';
								colorClass = 'text-red-600 dark:text-red-400';
							} else {
								displayValue = rate.toFixed(1) + '%';
								statusMessage = '💀 Bleeding money';
								colorClass = 'text-red-600 dark:text-red-400';
							}

							return (
								<>
									<div
										className={`text-2xl font-bold ${colorClass}`}
									>
										{displayValue}
									</div>
									<p className='text-xs text-muted-foreground mt-1'>
										{statusMessage}
									</p>
								</>
							);
						})()}
					</CardContent>
				</Card>
			</div>

			{/* Secondary Metrics Row (Utilization & Paydown) - Always Visible */}
			<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
				{/* Credit Utilization - Always Show */}
				<Card className='md:col-span-2 transition-all hover:shadow-md border-l-4 border-l-orange-500'>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>
							Credit Utilization
						</CardTitle>
						<CreditCard className='h-4 w-4 text-orange-500' />
					</CardHeader>
					<CardContent>
						{financialHealth.creditUtilization > 0 ? (
							<>
								<div className='flex items-center gap-4'>
									<div className='text-2xl font-bold'>
										{financialHealth.creditUtilization.toFixed(
											1
										)}
										%
									</div>
									<div className='h-2 flex-1 bg-secondary rounded-full overflow-hidden'>
										<div
											className={`h-full ${
												financialHealth.creditUtilization <
												30
													? 'bg-green-500'
													: financialHealth.creditUtilization <
													  50
													? 'bg-yellow-500'
													: 'bg-red-500'
											}`}
											style={{
												width: `${Math.min(
													financialHealth.creditUtilization,
													100
												)}%`,
											}}
										/>
									</div>
								</div>
								<p className='text-xs text-muted-foreground mt-1'>
									{financialHealth.creditUtilization < 30
										? '✅ Excellent - under 30%'
										: financialHealth.creditUtilization < 50
										? '⚠️ Fair - aim for under 30%'
										: '🔴 High - hurting credit score'}
								</p>
							</>
						) : (
							<>
								<div className='text-2xl font-bold text-muted-foreground'>
									—
								</div>
								<p className='text-xs text-muted-foreground mt-1'>
									💳 No credit cards added
								</p>
							</>
						)}
					</CardContent>
				</Card>

				{/* Debt Paydown - Always Show */}
				<Card className='md:col-span-2 transition-all hover:shadow-md'>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>
							Debt Paydown (This Month)
						</CardTitle>
						<ArrowDownLeft className='h-4 w-4 text-green-500' />
					</CardHeader>
					<CardContent>
						{financialHealth.debtPaydown > 0 ? (
							<>
								<div className='text-2xl font-bold text-green-600'>
									{formatCurrency(
										financialHealth.debtPaydown
									)}
								</div>
								<p className='text-xs text-muted-foreground mt-1'>
									🎯 Principal reduction - nice!
								</p>
							</>
						) : (
							<>
								<div className='text-2xl font-bold text-muted-foreground'>
									{formatCurrency(0)}
								</div>
								<p className='text-xs text-muted-foreground mt-1'>
									📅 No debt payments this month
								</p>
							</>
						)}
					</CardContent>
				</Card>
			</div>

			<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-7'>
				{/* Recent Transactions - Top 5 with Summary */}
				<Card className='col-span-4'>
					<CardHeader className='flex flex-row items-center justify-between'>
						<CardTitle>Recent Transactions</CardTitle>
						<span className='text-xs text-muted-foreground'>
							Last 5 shown
						</span>
					</CardHeader>
					<CardContent>
						<div className='space-y-4'>
							{recentTransactions
								.slice(0, 5)
								.map((transaction) => (
									<div
										key={transaction.id}
										className='flex items-center'
									>
										<div
											className={`flex h-9 w-9 items-center justify-center rounded-full border ${
												transaction.type === 'INCOME'
													? 'bg-green-100'
													: 'bg-red-100'
											}`}
										>
											{transaction.type === 'INCOME' ? (
												<ArrowDownLeft className='h-4 w-4 text-green-500' />
											) : (
												<ArrowUpRight className='h-4 w-4 text-red-500' />
											)}
										</div>
										<div className='ml-4 space-y-1'>
											<p className='text-sm font-medium leading-none'>
												{transaction.description ||
													transaction.category.name}
											</p>
											<p className='text-sm text-muted-foreground'>
												{transaction.category.name} •{' '}
												{format(
													new Date(transaction.date),
													'MMM d'
												)}
											</p>
										</div>
										<div
											className={`ml-auto font-medium ${
												transaction.type === 'INCOME'
													? 'text-green-600'
													: 'text-red-600'
											}`}
										>
											{transaction.type === 'INCOME'
												? '+'
												: '-'}
											{formatCurrency(
												transaction.amount?.toNumber() ??
													0
											)}
										</div>
									</div>
								))}
							{recentTransactions.length === 0 && (
								<p className='text-muted-foreground text-center py-4'>
									No recent transactions
								</p>
							)}
						</div>
						{/* Summary Footer */}
						{recentTransactions.length > 0 && (
							<div className='mt-4 pt-4 border-t'>
								<div className='flex items-center justify-between text-sm'>
									<div className='flex gap-4'>
										<span className='text-green-600'>
											↓{' '}
											{formatCurrency(
												recentTransactions
													.filter(
														(t) =>
															t.type === 'INCOME'
													)
													.reduce(
														(sum, t) =>
															sum +
															(t.amount?.toNumber() ??
																0),
														0
													)
											)}
										</span>
										<span className='text-red-600'>
											↑{' '}
											{formatCurrency(
												recentTransactions
													.filter(
														(t) =>
															t.type === 'EXPENSE'
													)
													.reduce(
														(sum, t) =>
															sum +
															(t.amount?.toNumber() ??
																0),
														0
													)
											)}
										</span>
									</div>
									<a
										href='/expense'
										className='text-primary hover:underline text-xs'
									>
										View all transactions →
									</a>
								</div>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Split Account List: Assets vs Liabilities */}
				<Card className='col-span-3'>
					<CardHeader>
						<CardTitle>Accounts</CardTitle>
					</CardHeader>
					<CardContent>
						<ScrollArea className='h-[400px] pr-4'>
							<div className='space-y-6'>
								{/* Assets Group */}
								<div>
									<h3 className='text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-1'>
										<Wallet className='h-3 w-3' /> Liquid
										Assets
									</h3>
									<div className='space-y-4'>
										{accounts
											.filter((a) => !a.isLiability)
											.map((account) => (
												<div
													key={account.id}
													className='flex items-center'
												>
													<div className='flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600'>
														<Wallet className='h-4 w-4' />
													</div>
													<div className='ml-4 space-y-1'>
														<p className='text-sm font-medium leading-none'>
															{account.name}
														</p>
														<p className='text-xs text-muted-foreground'>
															{account.type}
														</p>
													</div>
													<div className='ml-auto font-medium'>
														{formatCurrency(
															account.balance.toNumber()
														)}
													</div>
												</div>
											))}
										{accounts.filter((a) => !a.isLiability)
											.length === 0 && (
											<p className='text-xs text-muted-foreground italic pl-2'>
												No asset accounts
											</p>
										)}
									</div>
								</div>

								<div className='border-t border-border'></div>

								{/* Liabilities Group */}
								<div>
									<h3 className='text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-1'>
										<CreditCard className='h-3 w-3' />{' '}
										Liabilities
									</h3>
									<div className='space-y-4'>
										{accounts
											.filter((a) => a.isLiability)
											.map((account) => (
												<div
													key={account.id}
													className='flex items-center'
												>
													<div className='flex h-9 w-9 items-center justify-center rounded-full bg-red-100 dark:bg-red-900 text-red-600'>
														<CreditCard className='h-4 w-4' />
													</div>
													<div className='ml-4 space-y-1'>
														<p className='text-sm font-medium leading-none'>
															{account.name}
														</p>
														<div className='flex gap-2 text-xs text-muted-foreground'>
															<span>
																{account.type}
															</span>
															{account.type ===
																'CREDIT' &&
																account.creditLimit && (
																	<span
																		className={
																			Number(
																				account.balance
																			) /
																				Number(
																					account.creditLimit
																				) >
																			0.5
																				? 'text-red-600 dark:text-red-400'
																				: Number(
																						account.balance
																				  ) /
																						Number(
																							account.creditLimit
																						) >
																				  0.3
																				? 'text-yellow-600 dark:text-yellow-400'
																				: 'text-green-600 dark:text-green-400'
																		}
																	>
																		{Math.round(
																			(Number(
																				account.balance
																			) /
																				Number(
																					account.creditLimit
																				)) *
																				100
																		)}
																		% Util
																	</span>
																)}
														</div>
													</div>
													<div className='ml-auto font-medium text-red-600'>
														{formatCurrency(
															Number(
																account.balance
															)
														)}
													</div>
												</div>
											))}
										{accounts.filter((a) => a.isLiability)
											.length === 0 && (
											<p className='text-xs text-muted-foreground italic pl-2'>
												No liability accounts
											</p>
										)}
									</div>
								</div>
							</div>
						</ScrollArea>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
