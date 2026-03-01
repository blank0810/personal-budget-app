'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
	Users,
	Activity,
	ArrowRightLeft,
	DollarSign,
	TrendingUp,
} from 'lucide-react';

interface PlatformStats {
	totalUsers: number;
	signupsThisWeek: number;
	signupsThisMonth: number;
	activeUsers7d: number;
	totalTransactions: number;
	transactionsThisMonth: number;
	avgAccountsPerUser: number;
}

interface PlatformFinancials {
	totalMoneyTracked: number;
	topCategories: Array<{ name: string; count: number }>;
	currencyDistribution: Array<{ currency: string; count: number }>;
}

interface FeatureAdoption {
	totalUsers: number;
	budgets: number;
	goals: number;
	recurring: number;
	imports: number;
}

interface GrowthData {
	month: string;
	users: number;
	transactions: number;
}

interface AdminDashboardProps {
	stats: PlatformStats;
	financials: PlatformFinancials;
	adoption: FeatureAdoption;
	growth: GrowthData[];
}

export function AdminDashboard({
	stats,
	financials,
	adoption,
	growth,
}: AdminDashboardProps) {
	const maxTransactions = Math.max(...growth.map((g) => g.transactions), 1);

	return (
		<div className='space-y-6'>
			{/* KPI Cards */}
			<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
				<Card>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>
							Total Users
						</CardTitle>
						<Users className='h-4 w-4 text-muted-foreground' />
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold'>
							{stats.totalUsers}
						</div>
						<p className='text-xs text-muted-foreground'>
							+{stats.signupsThisWeek} this week, +
							{stats.signupsThisMonth} this month
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>
							Active Users (7d)
						</CardTitle>
						<Activity className='h-4 w-4 text-muted-foreground' />
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold'>
							{stats.activeUsers7d}
						</div>
						<p className='text-xs text-muted-foreground'>
							{stats.totalUsers > 0
								? Math.round(
										(stats.activeUsers7d /
											stats.totalUsers) *
											100
									)
								: 0}
							% of total users
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>
							Total Transactions
						</CardTitle>
						<ArrowRightLeft className='h-4 w-4 text-muted-foreground' />
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold'>
							{stats.totalTransactions.toLocaleString()}
						</div>
						<p className='text-xs text-muted-foreground'>
							{stats.transactionsThisMonth.toLocaleString()} this
							month
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>
							Money Tracked
						</CardTitle>
						<DollarSign className='h-4 w-4 text-muted-foreground' />
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold'>
							${financials.totalMoneyTracked.toLocaleString()}
						</div>
						<p className='text-xs text-muted-foreground'>
							{stats.avgAccountsPerUser} avg accounts/user
						</p>
					</CardContent>
				</Card>
			</div>

			<div className='grid gap-6 lg:grid-cols-2'>
				{/* Growth Timeline */}
				<Card>
					<CardHeader>
						<CardTitle className='flex items-center gap-2 text-base'>
							<TrendingUp className='h-4 w-4' />
							Monthly Transactions
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='space-y-3'>
							{growth.map((g) => (
								<div
									key={g.month}
									className='flex items-center gap-3'
								>
									<span className='text-xs text-muted-foreground w-16 shrink-0'>
										{g.month}
									</span>
									<div className='flex-1'>
										<div className='h-6 bg-muted rounded-full overflow-hidden'>
											<div
												className='h-full bg-primary rounded-full flex items-center justify-end px-2'
												style={{
													width: `${Math.max(
														(g.transactions /
															maxTransactions) *
															100,
														5
													)}%`,
												}}
											>
												<span className='text-[10px] font-medium text-primary-foreground'>
													{g.transactions}
												</span>
											</div>
										</div>
									</div>
									<span className='text-xs text-muted-foreground w-12 text-right'>
										{g.users} usr
									</span>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				{/* Feature Adoption */}
				<Card>
					<CardHeader>
						<CardTitle className='text-base'>
							Feature Adoption
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='space-y-4'>
							{[
								{
									name: 'Budgets',
									value: adoption.budgets,
								},
								{
									name: 'Goals',
									value: adoption.goals,
								},
								{
									name: 'Recurring',
									value: adoption.recurring,
								},
								{
									name: 'CSV Import',
									value: adoption.imports,
								},
							].map((feature) => (
								<div
									key={feature.name}
									className='space-y-1.5'
								>
									<div className='flex justify-between text-sm'>
										<span>{feature.name}</span>
										<span className='font-medium'>
											{feature.value}%
										</span>
									</div>
									<Progress
										value={feature.value}
										className='h-2'
									/>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				{/* Top Categories */}
				<Card>
					<CardHeader>
						<CardTitle className='text-base'>
							Most Used Categories
						</CardTitle>
					</CardHeader>
					<CardContent>
						{financials.topCategories.length > 0 ? (
							<div className='space-y-3'>
								{financials.topCategories.map((cat, i) => (
									<div
										key={cat.name}
										className='flex items-center justify-between'
									>
										<div className='flex items-center gap-2'>
											<span className='text-sm font-medium text-muted-foreground w-5'>
												{i + 1}.
											</span>
											<span className='text-sm'>
												{cat.name}
											</span>
										</div>
										<span className='text-sm text-muted-foreground'>
											{cat.count.toLocaleString()} txns
										</span>
									</div>
								))}
							</div>
						) : (
							<p className='text-sm text-muted-foreground'>
								No transaction data yet
							</p>
						)}
					</CardContent>
				</Card>

				{/* Currency Distribution */}
				<Card>
					<CardHeader>
						<CardTitle className='text-base'>
							Currency Distribution
						</CardTitle>
					</CardHeader>
					<CardContent>
						{financials.currencyDistribution.length > 0 ? (
							<div className='space-y-3'>
								{financials.currencyDistribution.map(
									(curr) => (
										<div
											key={curr.currency}
											className='flex items-center justify-between'
										>
											<span className='text-sm font-medium'>
												{curr.currency}
											</span>
											<div className='flex items-center gap-2'>
												<Progress
													value={
														stats.totalUsers > 0
															? (curr.count /
																	stats.totalUsers) *
																100
															: 0
													}
													className='h-2 w-20'
												/>
												<span className='text-sm text-muted-foreground w-16 text-right'>
													{curr.count} users
												</span>
											</div>
										</div>
									)
								)}
							</div>
						) : (
							<p className='text-sm text-muted-foreground'>
								No users yet
							</p>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
