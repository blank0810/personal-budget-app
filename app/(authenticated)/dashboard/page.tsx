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

import { ClearCacheButton } from '@/components/common/clear-cache-button';

export default async function DashboardPage() {
	const session = await auth();
	if (!session?.user?.id) {
		redirect('/api/auth/signin');
	}

	const userId = session.user.id;
	const now = new Date();
	const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

	const [
		netWorthData,
		cashFlowData,
		recentTransactions,
		accounts,
		financialHealth,
	] = await Promise.all([
		DashboardService.getNetWorth(userId),
		DashboardService.getCashFlow(userId, firstDayOfMonth, lastDayOfMonth),
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

			{/* Financial Health Key Metrics */}
			<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
				<Card className='bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950 dark:to-background border-indigo-100 dark:border-indigo-900'>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium text-indigo-900 dark:text-indigo-100'>
							Savings Rate
						</CardTitle>
						<Wallet className='h-4 w-4 text-indigo-500' />
					</CardHeader>
					<CardContent>
						<div
							className={`text-2xl font-bold ${
								financialHealth.savingsRate >= 20
									? 'text-green-600'
									: 'text-yellow-600'
							}`}
						>
							{financialHealth.savingsRate.toFixed(1)}%
						</div>
						<p className='text-xs text-muted-foreground'>
							Saved: $
							{(
								financialHealth.income - financialHealth.expense
							).toFixed(0)}
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>
							Debt-to-Asset
						</CardTitle>
						<CreditCard className='h-4 w-4 text-muted-foreground' />
					</CardHeader>
					<CardContent>
						<div
							className={`text-2xl font-bold ${
								financialHealth.debtToAssetRatio < 30
									? 'text-green-600'
									: 'text-yellow-600'
							}`}
						>
							{financialHealth.debtToAssetRatio.toFixed(1)}%
						</div>
						<p className='text-xs text-muted-foreground'>
							Lower is better
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>
							Debt Paydown
						</CardTitle>
						<ArrowUpRight className='h-4 w-4 text-green-500' />
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold'>
							${financialHealth.debtPaydown.toFixed(0)}
						</div>
						<p className='text-xs text-muted-foreground'>
							Paid to debt this month
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>
							Runway
						</CardTitle>
						<Wallet className='h-4 w-4 text-muted-foreground' />
					</CardHeader>
					<CardContent>
						<div
							className={`text-2xl font-bold ${
								financialHealth.runwayMonths > 6
									? 'text-green-600'
									: 'text-red-600'
							}`}
						>
							{financialHealth.runwayMonths.toFixed(1)} mo
						</div>
						<p className='text-xs text-muted-foreground'>
							Survival time
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Detailed Breakdown */}
			<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
				<Card>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>
							Net Worth
						</CardTitle>
						<DollarSign className='h-4 w-4 text-muted-foreground' />
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold'>
							${netWorthData.netWorth.toFixed(2)}
						</div>
						<p className='text-xs text-muted-foreground'>
							Assets: ${netWorthData.assets.toFixed(2)} |
							Liabilities: ${netWorthData.liabilities.toFixed(2)}
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>
							Income (This Month)
						</CardTitle>
						<ArrowDownLeft className='h-4 w-4 text-green-500' />
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold text-green-600'>
							+${cashFlowData.income.toFixed(2)}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>
							Expenses (This Month)
						</CardTitle>
						<ArrowUpRight className='h-4 w-4 text-red-500' />
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold text-red-600'>
							-${cashFlowData.expense.toFixed(2)}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>
							Cash Flow
						</CardTitle>
						<Wallet className='h-4 w-4 text-muted-foreground' />
					</CardHeader>
					<CardContent>
						<div
							className={
								cashFlowData.income - cashFlowData.expense >= 0
									? 'text-2xl font-bold text-green-600'
									: 'text-2xl font-bold text-red-600'
							}
						>
							$
							{(
								cashFlowData.income - cashFlowData.expense
							).toFixed(2)}
						</div>
					</CardContent>
				</Card>
			</div>

			<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-7'>
				{/* Recent Transactions */}
				<Card className='col-span-4'>
					<CardHeader>
						<CardTitle>Recent Transactions</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='space-y-8'>
							{recentTransactions.map((transaction) => (
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
										${Number(transaction.amount).toFixed(2)}
									</div>
								</div>
							))}
							{recentTransactions.length === 0 && (
								<p className='text-muted-foreground text-center py-4'>
									No recent transactions
								</p>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Accounts Overview */}
				<Card className='col-span-3'>
					<CardHeader>
						<CardTitle>Accounts</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='space-y-8'>
							{accounts.map((account) => (
								<div
									key={account.id}
									className='flex items-center'
								>
									<div className='flex h-9 w-9 items-center justify-center rounded-full bg-primary/10'>
										<CreditCard className='h-4 w-4 text-primary' />
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
										${Number(account.balance).toFixed(2)}
									</div>
								</div>
							))}
							{accounts.length === 0 && (
								<p className='text-muted-foreground text-center py-4'>
									No accounts found
								</p>
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
