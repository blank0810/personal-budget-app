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
	Umbrella,
	Zap,
	Flame,
	Skull,
	CircleDollarSign,
	Trophy,
	Rocket,
	TrendingUp,
	Meh,
	Banknote,
	CheckCircle,
	ThumbsUp,
	AlertOctagon,
	PartyPopper,
	Shield,
	PiggyBank,
	Target,
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { groupAccountsByClass, ACCOUNT_CLASS_META } from '@/lib/account-utils';
import type { AccountClass } from '@/lib/account-utils';

import { ClearCacheButton } from '@/components/common/clear-cache-button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FundCard } from '@/components/modules/fund/FundCard';
import { GoalService } from '@/server/modules/goal/goal.service';
import { GoalsDashboardWidget } from '@/components/modules/goal/GoalsDashboardWidget';
import { serialize } from '@/lib/serialization';

export default async function DashboardPage() {
	const session = await auth();
	if (!session?.user?.id) {
		redirect('/api/auth/signin');
	}

	const userId = session.user.id;
	const currentMonth = startOfMonth(new Date());

	const [
		netWorthData,
		recentTransactions,
		accounts,
		financialHealth,
		budgetHealth,
		fundHealth,
		dbUser,
		goals,
	] = await Promise.all([
		DashboardService.getNetWorth(userId),
		DashboardService.getRecentTransactions(userId, 5),
		DashboardService.getAccountBalances(userId),
		DashboardService.getFinancialHealthMetrics(userId),
		BudgetService.getBudgetHealthSummary(userId, currentMonth),
		DashboardService.getFundHealthMetrics(userId),
		prisma.user.findUnique({
			where: { id: userId },
			select: { currency: true },
		}),
		GoalService.getAll(userId),
	]);

	const currency = dbUser?.currency ?? 'USD';

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-8'>
			<div className='flex justify-between items-center'>
				<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>Dashboard</h1>
				<ClearCacheButton />
			</div>

			{/* Financial Health Grid - Solvency First */}
			<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
				{/* 1. Net Worth (Primary Solvency Metric) */}
				<Card
					className={`bg-gradient-to-br transition-all hover:shadow-md ${
						netWorthData.netWorth >= 0
							? 'from-emerald-50 to-white dark:from-emerald-950 dark:to-background border-emerald-100 dark:border-emerald-900'
							: 'from-red-50 to-white dark:from-red-950 dark:to-background border-red-100 dark:border-red-900'
					}`}
				>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle
							className={`text-sm font-medium ${
								netWorthData.netWorth >= 0
									? 'text-emerald-900 dark:text-emerald-100'
									: 'text-red-900 dark:text-red-100'
							}`}
						>
							Net Worth
						</CardTitle>
						<div
							className={`h-8 w-8 rounded-full flex items-center justify-center ${
								netWorthData.netWorth >= 0
									? 'bg-emerald-100 dark:bg-emerald-900'
									: 'bg-red-100 dark:bg-red-900'
							}`}
						>
							<DollarSign
								className={`h-4 w-4 ${
									netWorthData.netWorth >= 0
										? 'text-emerald-600 dark:text-emerald-400'
										: 'text-red-600 dark:text-red-400'
								}`}
							/>
						</div>
					</CardHeader>
					<CardContent>
						<div
							className={`text-2xl font-bold ${
								netWorthData.netWorth >= 0
									? 'text-emerald-700 dark:text-emerald-300'
									: 'text-red-700 dark:text-red-300'
							}`}
						>
							{formatCurrency(netWorthData.netWorth, { currency })}
						</div>
						<p className='text-xs text-muted-foreground mt-1'>
							Assets: {formatCurrency(netWorthData.assets, { currency })}
						</p>
						{netWorthData.netWorth < 0 && (
							<p className='text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1'>
								<AlertTriangle className='h-3 w-3' />
								Liabilities exceed assets
							</p>
						)}
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
							{formatCurrency(netWorthData.liabilities, { currency })}
						</div>
						<p className='text-xs text-muted-foreground mt-1'>
							{financialHealth.debtToAssetRatio.toFixed(1)}%
							Debt-to-Asset
						</p>
					</CardContent>
				</Card>

				{/* 3. Runway OR Emergency Fund (Liquidity) */}
				<Card className='transition-all hover:shadow-md'>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>
							{fundHealth.hasEmergencyFund
								? 'Emergency Fund'
								: 'Runway'}
						</CardTitle>
						<div className='h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center'>
							{fundHealth.hasEmergencyFund ? (
								<Shield className='h-4 w-4 text-blue-600 dark:text-blue-400' />
							) : (
								<Wallet className='h-4 w-4 text-blue-600 dark:text-blue-400' />
							)}
						</div>
					</CardHeader>
					<CardContent>
						{fundHealth.hasEmergencyFund ? (
							// Emergency Fund Display
							(() => {
								const months =
									fundHealth.emergencyFundMonths ?? 0;
								const health = fundHealth.emergencyFundHealth;

								const statusConfig = {
									critical: {
										color: 'text-red-600 dark:text-red-400',
										icon: Skull,
										text: 'Critical - build urgently',
									},
									underfunded: {
										color: 'text-yellow-600 dark:text-yellow-400',
										icon: AlertTriangle,
										text: 'Underfunded',
									},
									building: {
										color: 'text-blue-600 dark:text-blue-400',
										icon: Zap,
										text: 'Building momentum',
									},
									funded: {
										color: 'text-green-600 dark:text-green-400',
										icon: Shield,
										text: 'Fully funded!',
									},
								};

								const config =
									statusConfig[
										(health as keyof typeof statusConfig) ||
											'critical'
									];
								const StatusIcon = config.icon;

								const expenseSource =
									fundHealth.emergencyFundExpenseSource;

								return (
									<>
										<div
											className={`text-2xl font-bold ${config.color}`}
										>
											{months >= 12
												? '12+'
												: months.toFixed(1)}{' '}
											mo
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
							// Original Runway Display
							(() => {
								const runway = financialHealth.runwayMonths;
								const noExpenses =
									financialHealth.avgMonthlyExpense === 0;

								let displayValue: string;
								let statusText: string;
								let StatusIcon: typeof BarChart3;
								let colorClass: string;

								if (noExpenses) {
									displayValue = '—';
									statusText = 'Add expenses to track';
									StatusIcon = BarChart3;
									colorClass = 'text-muted-foreground';
								} else if (runway >= 12) {
									displayValue = '12+';
									statusText = 'Living the dream';
									StatusIcon = Umbrella;
									colorClass =
										'text-green-600 dark:text-green-400';
								} else if (runway >= 6) {
									displayValue = runway.toFixed(1);
									statusText = 'Healthy cushion';
									StatusIcon = Zap;
									colorClass =
										'text-green-600 dark:text-green-400';
								} else if (runway >= 3) {
									displayValue = runway.toFixed(1);
									statusText = 'Getting thin...';
									StatusIcon = AlertTriangle;
									colorClass =
										'text-yellow-600 dark:text-yellow-400';
								} else if (runway >= 1) {
									displayValue = runway.toFixed(1);
									statusText = 'Danger zone';
									StatusIcon = Flame;
									colorClass =
										'text-orange-600 dark:text-orange-400';
								} else if (runway > 0) {
									displayValue = runway.toFixed(1);
									statusText = "You're cooked";
									StatusIcon = Skull;
									colorClass =
										'text-red-600 dark:text-red-400';
								} else {
									displayValue = '0';
									statusText = 'Financially deceased';
									StatusIcon = Skull;
									colorClass =
										'text-red-600 dark:text-red-400';
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
							let statusText: string;
							let StatusIcon: typeof BarChart3;
							let colorClass: string;

							if (noIncome) {
								displayValue = '—';
								statusText = 'Add income to track';
								StatusIcon = BarChart3;
								colorClass = 'text-muted-foreground';
							} else if (rate >= 50) {
								displayValue = rate.toFixed(1) + '%';
								statusText = 'Money hoarder (respect)';
								StatusIcon = CircleDollarSign;
								colorClass =
									'text-green-600 dark:text-green-400';
							} else if (rate >= 30) {
								displayValue = rate.toFixed(1) + '%';
								statusText = 'FIRE candidate';
								StatusIcon = Trophy;
								colorClass =
									'text-green-600 dark:text-green-400';
							} else if (rate >= 20) {
								displayValue = rate.toFixed(1) + '%';
								statusText = 'Building wealth';
								StatusIcon = Rocket;
								colorClass =
									'text-green-600 dark:text-green-400';
							} else if (rate >= 10) {
								displayValue = rate.toFixed(1) + '%';
								statusText = 'Making progress';
								StatusIcon = TrendingUp;
								colorClass =
									'text-yellow-600 dark:text-yellow-400';
							} else if (rate > 0) {
								displayValue = rate.toFixed(1) + '%';
								statusText = 'Barely saving';
								StatusIcon = Meh;
								colorClass =
									'text-yellow-600 dark:text-yellow-400';
							} else if (rate === 0) {
								displayValue = '0%';
								statusText = 'Living paycheck to paycheck';
								StatusIcon = Banknote;
								colorClass =
									'text-orange-600 dark:text-orange-400';
							} else if (rate >= -20) {
								displayValue = rate.toFixed(1) + '%';
								statusText = 'Spending more than earning';
								StatusIcon = Flame;
								colorClass = 'text-red-600 dark:text-red-400';
							} else {
								displayValue = rate.toFixed(1) + '%';
								statusText = 'Bleeding money';
								StatusIcon = Skull;
								colorClass = 'text-red-600 dark:text-red-400';
							}

							return (
								<>
									<div
										className={`text-2xl font-bold ${colorClass}`}
									>
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
			</div>

			{/* Secondary Metrics Row (Utilization & Paydown) - Always Visible */}
			<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
				{/* Credit Utilization - Always Show */}
				<Card
					className={`md:col-span-2 transition-all hover:shadow-md border-l-4 ${
						financialHealth.creditUtilization >= 70
							? 'border-l-red-500'
							: financialHealth.creditUtilization >= 50
							? 'border-l-orange-500'
							: financialHealth.creditUtilization >= 30
							? 'border-l-yellow-500'
							: 'border-l-green-500'
					}`}
				>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>
							Credit Utilization
						</CardTitle>
						<CreditCard
							className={`h-4 w-4 ${
								financialHealth.creditUtilization >= 70
									? 'text-red-500'
									: financialHealth.creditUtilization >= 50
									? 'text-orange-500'
									: financialHealth.creditUtilization >= 30
									? 'text-yellow-500'
									: 'text-green-500'
							}`}
						/>
					</CardHeader>
					<CardContent>
						{financialHealth.totalCreditLimit > 0 ? (
							<>
								<div className='flex items-center gap-4'>
									<div
										className={`text-2xl font-bold ${
											financialHealth.creditUtilization >=
											70
												? 'text-red-600 dark:text-red-400'
												: financialHealth.creditUtilization >=
												  50
												? 'text-orange-600 dark:text-orange-400'
												: financialHealth.creditUtilization >=
												  30
												? 'text-yellow-600 dark:text-yellow-400'
												: 'text-green-600 dark:text-green-400'
										}`}
									>
										{financialHealth.creditUtilization.toFixed(
											1
										)}
										%
									</div>
									<div className='h-2 flex-1 bg-secondary rounded-full overflow-hidden'>
										<div
											className={`h-full ${
												financialHealth.creditUtilization >=
												90
													? 'bg-red-600'
													: financialHealth.creditUtilization >=
													  70
													? 'bg-red-500'
													: financialHealth.creditUtilization >=
													  50
													? 'bg-orange-500'
													: financialHealth.creditUtilization >=
													  30
													? 'bg-yellow-500'
													: financialHealth.creditUtilization >=
													  10
													? 'bg-green-500'
													: 'bg-green-400'
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
								<div className='flex justify-between items-center mt-2'>
									<p className='text-xs text-muted-foreground flex items-center gap-1'>
										{financialHealth.creditUtilization === 0 ? (
											<><Trophy className='h-3 w-3' /> Zero utilization - perfect!</>
										) : financialHealth.creditUtilization < 10 ? (
											<><CheckCircle className='h-3 w-3' /> Excellent - minimal credit use</>
										) : financialHealth.creditUtilization < 30 ? (
											<><ThumbsUp className='h-3 w-3' /> Healthy range</>
										) : financialHealth.creditUtilization < 50 ? (
											<><AlertTriangle className='h-3 w-3' /> Getting high - pay down soon</>
										) : financialHealth.creditUtilization < 70 ? (
											<><Flame className='h-3 w-3' /> High utilization - credit score suffering</>
										) : financialHealth.creditUtilization < 90 ? (
											<><AlertOctagon className='h-3 w-3' /> Critical - seriously hurting your credit</>
										) : (
											<><Skull className='h-3 w-3' /> Maxed out - immediate action needed</>
										)}
									</p>
								</div>
								<div className='flex justify-between text-xs text-muted-foreground mt-2 pt-2 border-t'>
									<span>
										Used:{' '}
										{formatCurrency(
											financialHealth.totalCreditUsed,
											{ currency }
										)}
									</span>
									<span className='text-green-600 dark:text-green-400 font-medium'>
										Available:{' '}
										{formatCurrency(
											financialHealth.availableCredit,
											{ currency }
										)}
									</span>
								</div>
							</>
						) : (
							<>
								<div className='text-2xl font-bold text-muted-foreground'>
									—
								</div>
								<p className='text-xs text-muted-foreground mt-1 flex items-center gap-1'>
									<CreditCard className='h-3 w-3' />
									No credit cards added
								</p>
							</>
						)}
					</CardContent>
				</Card>

				{/* Debt Paydown - Always Show */}
				<Card
					className={`md:col-span-2 transition-all hover:shadow-md border-l-4 ${
						financialHealth.totalDebt === 0
							? 'border-l-green-500'
							: financialHealth.debtPaydownPercent >= 5
							? 'border-l-green-500'
							: financialHealth.debtPaydownPercent >= 3
							? 'border-l-yellow-500'
							: financialHealth.debtPaydownPercent >= 1
							? 'border-l-orange-500'
							: 'border-l-red-500'
					}`}
				>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>
							Debt Paydown (This Month)
						</CardTitle>
						<ArrowDownLeft
							className={`h-4 w-4 ${
								financialHealth.totalDebt === 0
									? 'text-green-500'
									: financialHealth.debtPaydownPercent >= 5
									? 'text-green-500'
									: financialHealth.debtPaydownPercent >= 3
									? 'text-yellow-500'
									: financialHealth.debtPaydownPercent >= 1
									? 'text-orange-500'
									: 'text-red-500'
							}`}
						/>
					</CardHeader>
					<CardContent>
						{financialHealth.totalDebt > 0 ? (
							<>
								<div className='flex items-baseline gap-2'>
									<div
										className={`text-2xl font-bold ${
											financialHealth.debtPaydownPercent >=
											5
												? 'text-green-600 dark:text-green-400'
												: financialHealth.debtPaydownPercent >=
												  3
												? 'text-yellow-600 dark:text-yellow-400'
												: financialHealth.debtPaydownPercent >=
												  1
												? 'text-orange-600 dark:text-orange-400'
												: 'text-red-600 dark:text-red-400'
										}`}
									>
										{formatCurrency(
											financialHealth.debtPaydown,
											{ currency }
										)}
									</div>
									<span className='text-sm text-muted-foreground'>
										(
										{financialHealth.debtPaydownPercent.toFixed(
											1
										)}
										% of debt)
									</span>
								</div>
								<p className='text-xs text-muted-foreground mt-1 flex items-center gap-1'>
									{financialHealth.debtPaydown === 0 ? (
										<><Skull className='h-3 w-3' /> Zero payments — debt growing</>
									) : financialHealth.debtPaydownPercent < 1 ? (
										<><Meh className='h-3 w-3' /> Token payment — barely a dent</>
									) : financialHealth.debtPaydownPercent < 3 ? (
										<><AlertTriangle className='h-3 w-3' /> Minimum effort — debt lingers</>
									) : financialHealth.debtPaydownPercent < 5 ? (
										<><TrendingUp className='h-3 w-3' /> Making progress — keep pushing</>
									) : financialHealth.debtPaydownPercent < 10 ? (
										<><Zap className='h-3 w-3' /> Strong paydown — you&apos;re serious</>
									) : (
										<><Flame className='h-3 w-3' /> Aggressive — debt-free soon!</>
									)}
								</p>
								<div className='flex justify-between text-xs text-muted-foreground mt-2 pt-2 border-t'>
									<span>
										Total Debt:{' '}
										{formatCurrency(
											financialHealth.totalDebt,
											{ currency }
										)}
									</span>
									<span
										className={`flex items-center gap-1 ${
											financialHealth.monthsToPayoff ===
											-1
												? 'text-red-600 dark:text-red-400'
												: financialHealth.monthsToPayoff <=
												  12
												? 'text-green-600 dark:text-green-400'
												: financialHealth.monthsToPayoff <=
												  36
												? 'text-yellow-600 dark:text-yellow-400'
												: 'text-orange-600 dark:text-orange-400'
										}`}
									>
										{financialHealth.monthsToPayoff === -1 ? (
											<><AlertTriangle className='h-3 w-3' /> Never at this rate</>
										) : financialHealth.monthsToPayoff <= 12 ? (
											`~${financialHealth.monthsToPayoff} mo to freedom`
										) : financialHealth.monthsToPayoff <= 24 ? (
											`~${Math.round(financialHealth.monthsToPayoff / 12)} yr to go`
										) : (
											`~${Math.round(financialHealth.monthsToPayoff / 12)}+ yrs remaining`
										)}
									</span>
								</div>
							</>
						) : (
							<>
								<div className='text-2xl font-bold text-green-600 dark:text-green-400 flex items-center gap-2'>
									Debt Free! <PartyPopper className='h-5 w-5' />
								</div>
								<p className='text-xs text-muted-foreground mt-1 flex items-center gap-1'>
									<Trophy className='h-3 w-3' />
									No liabilities — keep it up!
								</p>
							</>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Budget Health Summary - Full Width */}
			<BudgetHealthSummary health={budgetHealth} month={currentMonth} />

			{/* Funds Section - Strategic goals above operational data */}
			{fundHealth.funds.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<Shield className='h-5 w-5 text-blue-600' />
							Your Funds
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
							{fundHealth.funds.map((fund) => (
								<FundCard key={fund.id} fund={fund} />
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Goals Widget */}
			<GoalsDashboardWidget goals={serialize(goals)} />

			<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-7'>
				{/* Recent Transactions - Top 5 with Summary */}
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
													),
												{ currency }
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
													),
												{ currency }
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

				{/* Account List: Grouped by Classification */}
				<Card className='md:col-span-2 lg:col-span-3'>
					<CardHeader>
						<CardTitle>Accounts</CardTitle>
					</CardHeader>
					<CardContent>
						<ScrollArea className='h-[400px] pr-4'>
							<div className='space-y-6'>
								{(() => {
									const grouped = groupAccountsByClass(accounts);
									const iconMap = {
										liquid: Wallet,
										savings: PiggyBank,
										liability: CreditCard,
										fund: Target,
									};
									const bgMap = {
										liquid: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600',
										savings: 'bg-blue-100 dark:bg-blue-900 text-blue-600',
										liability: 'bg-red-100 dark:bg-red-900 text-red-600',
										fund: 'bg-violet-100 dark:bg-violet-900 text-violet-600',
									};
									const colorMap = {
										liquid: 'text-emerald-600',
										savings: 'text-blue-600',
										liability: 'text-red-600',
										fund: 'text-violet-600',
									};
									// Show liquid, savings, liability in the accounts card
									// Funds have their own section below
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
																		{account.type === 'CREDIT' && account.creditLimit && (
																			<>
																				<span
																					className={(() => {
																						const utilization = Number(account.balance) / Number(account.creditLimit);
																						if (utilization >= 0.7) return 'text-red-600 dark:text-red-400';
																						if (utilization >= 0.5) return 'text-orange-600 dark:text-orange-400';
																						if (utilization >= 0.3) return 'text-yellow-600 dark:text-yellow-400';
																						return 'text-green-600 dark:text-green-400';
																					})()}
																				>
																					{Math.round((Number(account.balance) / Number(account.creditLimit)) * 100)}% Util
																				</span>
																				<span className='text-green-600 dark:text-green-400'>
																					Avail: {formatCurrency(Number(account.creditLimit) - Number(account.balance), { currency })}
																				</span>
																			</>
																		)}
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
						</ScrollArea>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
