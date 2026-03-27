import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { DashboardService } from '@/server/modules/dashboard/dashboard.service';
import { BudgetService } from '@/server/modules/budget/budget.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, startOfMonth } from 'date-fns';
import { BudgetHealthSummary } from '@/components/modules/budget/BudgetHealthSummary';
import {
	ArrowDownLeft,
	ArrowUpRight,
	Wallet,
	CreditCard,
	DollarSign,
	AlertTriangle,
	BarChart3,
	CheckCircle,
	Flame,
	XCircle,
	Shield,
	TrendingUp,
	PiggyBank,
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { groupAccountsByClass, ACCOUNT_CLASS_META } from '@/lib/account-utils';
import type { AccountClass } from '@/lib/account-utils';

import { GoalService } from '@/server/modules/goal/goal.service';
import { GoalsDashboardWidget } from '@/components/modules/goal/GoalsDashboardWidget';
import type { GoalCardData } from '@/components/modules/goal/GoalCard';
import { serialize } from '@/lib/serialization';
import { InvoiceService } from '@/server/modules/invoice/invoice.service';
import { InvoiceDashboardWidget } from '@/components/modules/invoice/InvoiceDashboardWidget';

export default async function DashboardPage() {
	const session = await auth();
	if (!session?.user?.id) {
		redirect('/api/auth/signin');
	}

	const userId = session.user.id;
	const currentMonth = startOfMonth(new Date());

	const [
		dashboardData,
		recentTransactions,
		budgetHealth,
		goalHealth,
		dbUser,
		goals,
		invoiceSummary,
	] = await Promise.all([
		DashboardService.getDashboardData(userId),
		DashboardService.getRecentTransactions(userId, 5),
		BudgetService.getBudgetHealthSummary(userId, currentMonth),
		GoalService.getGoalHealthMetrics(userId),
		prisma.user.findUnique({
			where: { id: userId },
			select: { currency: true },
		}),
		GoalService.getAll(userId),
		InvoiceService.getSummary(userId),
	]);

	const currency = dbUser?.currency ?? 'USD';

	const invoiceOutstanding =
		(invoiceSummary['SENT']?.totalAmount ?? 0) +
		(invoiceSummary['OVERDUE']?.totalAmount ?? 0);
	const invoiceOverdueCount = invoiceSummary['OVERDUE']?.count ?? 0;
	const invoiceDraftCount = invoiceSummary['DRAFT']?.count ?? 0;

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-8'>
			<div className='flex justify-between items-center'>
				<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>Dashboard</h1>
			</div>

			{/* Row 1: 4-column grid — Net Worth | Savings Rate | Runway/EF | Debt Overview */}
			<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
				{/* 1. Net Worth */}
				<Card
					className={`bg-gradient-to-br transition-all hover:shadow-md ${
						dashboardData.netWorth >= 0
							? 'from-emerald-50 to-white dark:from-emerald-950 dark:to-background border-emerald-100 dark:border-emerald-900'
							: 'from-red-50 to-white dark:from-red-950 dark:to-background border-red-100 dark:border-red-900'
					}`}
				>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle
							className={`text-sm font-medium ${
								dashboardData.netWorth >= 0
									? 'text-emerald-900 dark:text-emerald-100'
									: 'text-red-900 dark:text-red-100'
							}`}
						>
							Net Worth
						</CardTitle>
						<div
							className={`h-8 w-8 rounded-full flex items-center justify-center ${
								dashboardData.netWorth >= 0
									? 'bg-emerald-100 dark:bg-emerald-900'
									: 'bg-red-100 dark:bg-red-900'
							}`}
						>
							<DollarSign
								className={`h-4 w-4 ${
									dashboardData.netWorth >= 0
										? 'text-emerald-600 dark:text-emerald-400'
										: 'text-red-600 dark:text-red-400'
								}`}
							/>
						</div>
					</CardHeader>
					<CardContent>
						<div
							className={`text-2xl font-bold ${
								dashboardData.netWorth >= 0
									? 'text-emerald-700 dark:text-emerald-300'
									: 'text-red-700 dark:text-red-300'
							}`}
						>
							{formatCurrency(dashboardData.netWorth, { currency })}
						</div>
						<p className='text-xs text-muted-foreground mt-1'>
							Assets: {formatCurrency(dashboardData.assets, { currency })}
						</p>
						{dashboardData.netWorth < 0 && (
							<p className='text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1'>
								<AlertTriangle className='h-3 w-3' />
								Liabilities exceed assets
							</p>
						)}
					</CardContent>
				</Card>

				{/* 2. Savings Rate */}
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
							const rate = dashboardData.savingsRate;
							const noIncome = dashboardData.ytdIncome === 0;

							let displayValue: string;
							let statusText: string;
							let StatusIcon: typeof BarChart3;
							let colorClass: string;

							if (noIncome) {
								displayValue = '\u2014';
								statusText = 'Add income to track';
								StatusIcon = BarChart3;
								colorClass = 'text-muted-foreground';
							} else if (rate >= 20) {
								displayValue = rate.toFixed(1) + '%';
								statusText = 'Building wealth';
								StatusIcon = CheckCircle;
								colorClass = 'text-green-600 dark:text-green-400';
							} else if (rate >= 10) {
								displayValue = rate.toFixed(1) + '%';
								statusText = 'Making progress';
								StatusIcon = TrendingUp;
								colorClass = 'text-yellow-600 dark:text-yellow-400';
							} else if (rate > 0) {
								displayValue = rate.toFixed(1) + '%';
								statusText = 'Barely saving';
								StatusIcon = AlertTriangle;
								colorClass = 'text-yellow-600 dark:text-yellow-400';
							} else if (rate === 0) {
								displayValue = '0%';
								statusText = 'Living paycheck to paycheck';
								StatusIcon = Flame;
								colorClass = 'text-orange-600 dark:text-orange-400';
							} else if (rate >= -20) {
								displayValue = rate.toFixed(1) + '%';
								statusText = 'Spending more than earning';
								StatusIcon = Flame;
								colorClass = 'text-red-600 dark:text-red-400';
							} else {
								displayValue = rate.toFixed(1) + '%';
								statusText = 'Bleeding money';
								StatusIcon = XCircle;
								colorClass = 'text-red-600 dark:text-red-400';
							}

							return (
								<>
									<div className={`text-2xl font-bold ${colorClass}`}>
										{displayValue}
									</div>
									<p className='text-xs text-muted-foreground mt-1 flex items-center gap-1'>
										<StatusIcon className='h-3 w-3' />
										{statusText}
									</p>
								</>
							);
						})()}
					</CardContent>
				</Card>

				{/* 3. Runway OR Emergency Fund */}
				<Card className='transition-all hover:shadow-md'>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>
							{goalHealth.hasEmergencyFund
								? 'Emergency Fund'
								: 'Runway'}
						</CardTitle>
						<div className='h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center'>
							{goalHealth.hasEmergencyFund ? (
								<Shield className='h-4 w-4 text-blue-600 dark:text-blue-400' />
							) : (
								<Wallet className='h-4 w-4 text-blue-600 dark:text-blue-400' />
							)}
						</div>
					</CardHeader>
					<CardContent>
						{goalHealth.hasEmergencyFund ? (
							// Emergency Fund Display
							(() => {
								const months = goalHealth.emergencyFundMonths;
								const health = goalHealth.emergencyFundHealth;

								const statusConfig = {
									critical: {
										color: 'text-red-600 dark:text-red-400',
										icon: XCircle,
										text: 'Critical - build urgently',
									},
									underfunded: {
										color: 'text-yellow-600 dark:text-yellow-400',
										icon: AlertTriangle,
										text: 'Underfunded',
									},
									building: {
										color: 'text-blue-600 dark:text-blue-400',
										icon: CheckCircle,
										text: 'Building momentum',
									},
									funded: {
										color: 'text-green-600 dark:text-green-400',
										icon: Shield,
										text: 'Fully funded!',
									},
									insufficient_data: {
										color: 'text-muted-foreground',
										icon: BarChart3,
										text: 'Insufficient expense data',
									},
								};

								const config =
									statusConfig[
										(health as keyof typeof statusConfig) ||
											'critical'
									];
								const StatusIcon = config.icon;

								const expenseSource =
									goalHealth.emergencyFundExpenseSource;

								return (
									<>
										<div
											className={`text-2xl font-bold ${config.color}`}
										>
											{months === null ? '\u2014' : months >= 12
												? '12+'
												: months.toFixed(1)}{' '}
											{months !== null && 'mo'}
										</div>
										<p className='text-xs text-muted-foreground mt-1 flex items-center gap-1'>
											<StatusIcon className='h-3 w-3' />
											{config.text}
										</p>
										<p className='text-xs text-muted-foreground mt-1'>
											{expenseSource === 'actual'
												? 'Based on actual spending'
												: expenseSource === 'budget'
												? 'Based on monthly budget'
												: 'No expense data'}
										</p>
									</>
								);
							})()
						) : (
							// Runway Display
							(() => {
								const runway = dashboardData.runwayMonths;
								const noExpenses = runway === null;

								let displayValue: string;
								let statusText: string;
								let StatusIcon: typeof BarChart3;
								let colorClass: string;

								if (noExpenses) {
									displayValue = '\u2014';
									statusText = 'Add expenses to track';
									StatusIcon = BarChart3;
									colorClass = 'text-muted-foreground';
								} else if (runway >= 12) {
									displayValue = '12+';
									statusText = 'Living the dream';
									StatusIcon = CheckCircle;
									colorClass = 'text-green-600 dark:text-green-400';
								} else if (runway >= 6) {
									displayValue = runway.toFixed(1);
									statusText = 'Healthy cushion';
									StatusIcon = CheckCircle;
									colorClass = 'text-green-600 dark:text-green-400';
								} else if (runway >= 3) {
									displayValue = runway.toFixed(1);
									statusText = 'Getting thin...';
									StatusIcon = AlertTriangle;
									colorClass = 'text-yellow-600 dark:text-yellow-400';
								} else if (runway >= 1) {
									displayValue = runway.toFixed(1);
									statusText = 'Danger zone';
									StatusIcon = Flame;
									colorClass = 'text-orange-600 dark:text-orange-400';
								} else if (runway > 0) {
									displayValue = runway.toFixed(1);
									statusText = "You're cooked";
									StatusIcon = XCircle;
									colorClass = 'text-red-600 dark:text-red-400';
								} else {
									displayValue = '0';
									statusText = 'Financially deceased';
									StatusIcon = XCircle;
									colorClass = 'text-red-600 dark:text-red-400';
								}

								return (
									<>
										<div
											className={`text-2xl font-bold ${colorClass}`}
										>
											{displayValue} {!noExpenses && 'mo'}
										</div>
										<p className='text-xs text-muted-foreground mt-1 flex items-center gap-1'>
											<StatusIcon className='h-3 w-3' />
											{statusText}
										</p>
									</>
								);
							})()
						)}
					</CardContent>
				</Card>

				{/* 4. Debt Overview — merged */}
				<Card className='transition-all hover:shadow-md'>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>Debt Overview</CardTitle>
						<div className='h-8 w-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center'>
							<CreditCard className='h-4 w-4 text-red-600 dark:text-red-400' />
						</div>
					</CardHeader>
					<CardContent className='space-y-3'>
						{dashboardData.totalDebt > 0 ? (
							<>
								<div className='text-2xl font-bold text-red-600 dark:text-red-400'>
									{formatCurrency(dashboardData.totalDebt, { currency })}
								</div>
								<p className='text-xs text-muted-foreground'>
									{dashboardData.debtToAssetRatio.toFixed(1)}% Debt-to-Asset
								</p>
								{dashboardData.totalCreditLimit > 0 && (
									<div className='space-y-1'>
										<div className='flex justify-between text-xs text-muted-foreground'>
											<span>Credit: {dashboardData.creditUtilization.toFixed(0)}% used</span>
											<span className='text-green-600 dark:text-green-400'>
												Avail: {formatCurrency(dashboardData.availableCredit, { currency })}
											</span>
										</div>
										<div className='h-1.5 bg-secondary rounded-full overflow-hidden'>
											<div
												className={`h-full rounded-full ${
													dashboardData.creditUtilization >= 70 ? 'bg-red-500'
													: dashboardData.creditUtilization >= 30 ? 'bg-yellow-500'
													: 'bg-green-500'
												}`}
												style={{ width: `${Math.min(dashboardData.creditUtilization, 100)}%` }}
											/>
										</div>
									</div>
								)}
								<div className='text-xs text-muted-foreground pt-2 border-t flex justify-between'>
									<span>Paid this month: {formatCurrency(dashboardData.debtPaydown, { currency })}</span>
									<span>
										{dashboardData.monthsToPayoff === -1
											? 'No payments made'
											: dashboardData.monthsToPayoff <= 12
											? `~${dashboardData.monthsToPayoff} mo to payoff`
											: `~${Math.round(dashboardData.monthsToPayoff / 12)} yr to payoff`}
									</span>
								</div>
							</>
						) : (
							<div className='text-2xl font-bold text-green-600 dark:text-green-400'>
								Debt Free!
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Budget Health Summary - Full Width (most actionable) */}
			<BudgetHealthSummary health={budgetHealth} month={currentMonth} />

			{/* Goals Widget */}
			<GoalsDashboardWidget
				goals={(serialize(goals) as GoalCardData[]).map((g) => {
					const metric = goalHealth.goals.find((m) => m.id === g.id);
					return {
						...g,
						monthsCoverage: metric ? metric.monthsCoverage : undefined,
						healthStatus: metric?.healthStatus ?? undefined,
					};
				})}
			/>

			{/* Invoice Widget */}
			<InvoiceDashboardWidget
				outstanding={invoiceOutstanding}
				overdueCount={invoiceOverdueCount}
				draftCount={invoiceDraftCount}
				currency={currency}
			/>

			{/* Bottom Row: Recent Transactions + Accounts */}
			<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-7'>
				{/* Recent Transactions */}
				<Card className='md:col-span-2 lg:col-span-4'>
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
													0,
												{ currency }
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
						<div className='mt-4 pt-4 border-t'>
							<div className='flex justify-end'>
								<a
									href='/expense'
									className='text-primary hover:underline text-xs'
								>
									View all transactions {'\u2192'}
								</a>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Account List: Grouped by Classification */}
				<Card className='md:col-span-2 lg:col-span-3'>
					<CardHeader>
						<CardTitle>Accounts</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='max-h-[400px] overflow-y-auto pr-4'>
							<div className='space-y-6'>
								{(() => {
									const grouped = groupAccountsByClass(dashboardData.accounts);
									const iconMap: Record<AccountClass, typeof Wallet> = {
										liquid: Wallet,
										savings: PiggyBank,
										liability: CreditCard,
									};
									const bgMap: Record<AccountClass, string> = {
										liquid: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600',
										savings: 'bg-blue-100 dark:bg-blue-900 text-blue-600',
										liability: 'bg-red-100 dark:bg-red-900 text-red-600',
									};
									const colorMap: Record<AccountClass, string> = {
										liquid: 'text-emerald-600',
										savings: 'text-blue-600',
										liability: 'text-red-600',
									};
									const classOrder: AccountClass[] = ['liquid', 'savings', 'liability'];

									return classOrder.map((cls, idx) => {
										const groupAccounts = grouped[cls];
										if (groupAccounts.length === 0) return null;
										const meta = ACCOUNT_CLASS_META[cls];
										const Icon = iconMap[cls];
										const isLiability = cls === 'liability';

										return (
											<div key={cls}>
												{idx > 0 && classOrder.slice(0, idx).some(c => grouped[c].length > 0) && (
													<div className='border-t border-border mb-6'></div>
												)}
												<div>
													<h3 className={`text-xs font-semibold mb-3 uppercase tracking-wider flex items-center gap-1 ${colorMap[cls]}`}>
														<Icon className='h-3 w-3' /> {meta.label}
													</h3>
													<div className='space-y-4'>
														{groupAccounts.map((account) => (
															<div
																key={account.id}
																className='flex items-center'
															>
																<div className={`flex h-9 w-9 items-center justify-center rounded-full ${bgMap[cls]}`}>
																	<Icon className='h-4 w-4' />
																</div>
																<div className='ml-4 space-y-1'>
																	<p className='text-sm font-medium leading-none'>
																		{account.name}
																	</p>
																	<div className='flex gap-2 text-xs text-muted-foreground'>
																		<span>{account.type}</span>
																	</div>
																</div>
																<div className={`ml-auto font-medium ${isLiability ? 'text-red-600' : ''}`}>
																	{formatCurrency(Number(account.balance), { currency })}
																</div>
															</div>
														))}
													</div>
												</div>
											</div>
										);
									});
								})()}
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
