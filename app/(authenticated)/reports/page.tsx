import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { ReportService } from '@/server/modules/report/report.service';
import { DashboardService } from '@/server/modules/dashboard/dashboard.service';
import { BudgetService } from '@/server/modules/budget/budget.service';
import { CategoryBreakdownChart } from '@/components/modules/reports/CategoryBreakdownChart';
import { MonthlyComparisonChart } from '@/components/modules/reports/MonthlyComparisonChart';
import { BudgetPerformanceChart } from '@/components/modules/reports/BudgetPerformanceChart';
import { BudgetAnalytics } from '@/components/modules/reports/BudgetAnalytics';
import { subMonths, startOfMonth, endOfMonth, parse, parseISO, isValid } from 'date-fns';
import { KPICard } from '@/components/modules/reports/KPICard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NetWorthTrendChart } from '@/components/modules/reports/NetWorthTrendChart';
import { ReportsToolbar } from '@/components/modules/reports/ReportsToolbar';
import { FinancialStatement } from '@/components/modules/reports/FinancialStatement';
import { CashFlowWaterfallChart } from '@/components/modules/reports/CashFlowWaterfallChart';
import { serialize } from '@/lib/serialization';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, TrendingDown, PiggyBank, Shield } from 'lucide-react';
import { FundHealthReport } from '@/components/modules/reports/FundHealthReport';

export default async function ReportsPage({
	searchParams,
}: {
	searchParams: Promise<{ from?: string; to?: string }>;
}) {
	const session = await auth();
	if (!session?.user?.id) {
		redirect('/api/auth/signin');
	}

	const userId = session.user.id;
	const resolvedSearchParams = await searchParams;
	const now = new Date();

	// Helper to parse date strings - handles both YYYY-MM-DD and ISO formats
	const parseDate = (dateStr: string): Date | null => {
		// Try YYYY-MM-DD format first (local date, no timezone shift)
		const parsed = parse(dateStr, 'yyyy-MM-dd', new Date());
		if (isValid(parsed)) return parsed;
		// Fall back to ISO format
		const isoDate = parseISO(dateStr);
		if (isValid(isoDate)) return isoDate;
		return null;
	};

	// Global Date Range - parse as local dates to avoid timezone shifts
	const from = resolvedSearchParams.from
		? parseDate(resolvedSearchParams.from) ?? startOfMonth(now)
		: startOfMonth(now);
	const to = resolvedSearchParams.to
		? parseDate(resolvedSearchParams.to) ?? endOfMonth(now)
		: endOfMonth(now);

	const [
		categoryBreakdown,
		monthlyComparison,
		budgetPerformance,
		financialStatement,
		kpis,
		accounts,
		netWorthHistory,
		budgetTrends,
		budgetRecommendations,
		cashFlowWaterfall,
		fundHealth,
	] = await Promise.all([
		ReportService.getCategoryBreakdown(userId, from, to),
		ReportService.getMonthlyComparison(userId, subMonths(to, 5), to),
		ReportService.getBudgetVsActual(userId, from, to),
		ReportService.getFinancialStatement(userId, from, to),
		ReportService.getDashboardKPIs(userId, from, to),
		DashboardService.getAccountBalances(userId),
		ReportService.getNetWorthHistory(userId, from, to),
		BudgetService.getBudgetTrends(userId, from, to),
		BudgetService.getBudgetRecommendations(userId, 6),
		ReportService.getCashFlowWaterfall(userId, from, to),
		DashboardService.getFundHealthMetrics(userId),
	]);

	const formatCurrency = (val: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			maximumFractionDigits: 0,
		}).format(val);
	};

	// Budget Summary Calculations
	const budgetSummary = budgetTrends.reduce(
		(acc, trend) => ({
			totalBudgeted: acc.totalBudgeted + trend.totalBudgeted,
			totalSpent: acc.totalSpent + trend.totalSpent,
		}),
		{ totalBudgeted: 0, totalSpent: 0 }
	);
	const budgetSavedOrOver = budgetSummary.totalBudgeted - budgetSummary.totalSpent;

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-8'>
			{/* Global Header & Controls */}
			<div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
				<div>
					<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
						Financial Analytics
					</h1>
					<p className='text-muted-foreground'>
						Deep dive into your financial performance and trends.
					</p>
				</div>
				<ReportsToolbar initialFrom={from} initialTo={to} />
			</div>

			<Tabs defaultValue='overview' className='space-y-4'>
				<TabsList className='w-full justify-start overflow-x-auto'>
					<TabsTrigger value='overview'>Overview</TabsTrigger>
					<TabsTrigger value='pnl'>Income & Expenses</TabsTrigger>
					<TabsTrigger value='budget'>Budget Analytics</TabsTrigger>
					<TabsTrigger value='funds'>Fund Health</TabsTrigger>
					<TabsTrigger value='ledger'>Statements</TabsTrigger>
				</TabsList>

				{/* 1. OVERVIEW TAB */}
				<TabsContent value='overview' className='space-y-6'>
					{/* KPI Cards */}
					<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
						<KPICard
							title='Net Result'
							value={formatCurrency(kpis.netIncome.value)}
							change={kpis.netIncome.change}
							trend={kpis.netIncome.trend}
							history={kpis.netIncome.history}
						/>
						<KPICard
							title='Inflow Velocity'
							value={formatCurrency(kpis.totalIncome.value)}
							change={kpis.totalIncome.change}
							trend={kpis.totalIncome.trend}
							history={kpis.totalIncome.history}
						/>
						<KPICard
							title='Burn Rate'
							value={formatCurrency(kpis.totalExpenses.value)}
							change={kpis.totalExpenses.change}
							trend={kpis.totalExpenses.trend}
							history={kpis.totalExpenses.history}
							inverseTrend
						/>
						<KPICard
							title='Savings Ratio'
							value={`${kpis.savingsRate.value.toFixed(1)}%`}
							change={kpis.savingsRate.change}
							trend={kpis.savingsRate.trend}
							history={kpis.savingsRate.history}
						/>
					</div>

					{/* Net Worth Trend - The "Hero" Chart of Overview */}
					<div className='grid gap-4 md:grid-cols-1'>
						<NetWorthTrendChart data={netWorthHistory} />
					</div>
				</TabsContent>

				{/* 2. INCOME & EXPENSES TAB */}
				<TabsContent value='pnl' className='space-y-4'>
					<div className='grid gap-4 grid-cols-1 lg:grid-cols-7'>
						<div className='lg:col-span-4'>
							<MonthlyComparisonChart
								data={serialize(monthlyComparison)}
							/>
						</div>
						<div className='lg:col-span-3'>
							<CategoryBreakdownChart
								data={serialize(categoryBreakdown)}
							/>
						</div>
						<div className='lg:col-span-7'>
							<CashFlowWaterfallChart
								data={serialize(cashFlowWaterfall)}
							/>
						</div>
					</div>
				</TabsContent>

				{/* 3. BUDGET ANALYTICS TAB */}
				<TabsContent value='budget' className='space-y-4'>
					{/* Budget Summary Cards */}
					<div className='grid gap-4 md:grid-cols-3'>
						<Card>
							<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
								<CardTitle className='text-sm font-medium'>
									Total Budgeted
								</CardTitle>
								<Wallet className='h-4 w-4 text-muted-foreground' />
							</CardHeader>
							<CardContent>
								<div className='text-2xl font-bold'>
									{formatCurrency(budgetSummary.totalBudgeted)}
								</div>
								<p className='text-xs text-muted-foreground'>
									Planned spending for period
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
								<CardTitle className='text-sm font-medium'>
									Total Spent
								</CardTitle>
								<TrendingDown className='h-4 w-4 text-muted-foreground' />
							</CardHeader>
							<CardContent>
								<div className={`text-2xl font-bold ${budgetSummary.totalSpent > budgetSummary.totalBudgeted ? 'text-red-600' : ''}`}>
									{formatCurrency(budgetSummary.totalSpent)}
								</div>
								<p className='text-xs text-muted-foreground'>
									Actual spending for period
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
								<CardTitle className='text-sm font-medium'>
									{budgetSavedOrOver >= 0 ? 'Under Budget' : 'Over Budget'}
								</CardTitle>
								<PiggyBank className={`h-4 w-4 ${budgetSavedOrOver >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
							</CardHeader>
							<CardContent>
								<div className={`text-2xl font-bold ${budgetSavedOrOver >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
									{formatCurrency(Math.abs(budgetSavedOrOver))}
								</div>
								<p className='text-xs text-muted-foreground'>
									{budgetSavedOrOver >= 0 ? 'Saved from budget' : 'Exceeded budget'}
								</p>
							</CardContent>
						</Card>
					</div>
					<BudgetPerformanceChart
						data={serialize(budgetPerformance)}
					/>
					<BudgetAnalytics
						trends={serialize(budgetTrends)}
						recommendations={serialize(budgetRecommendations)}
					/>
				</TabsContent>

				{/* 4. FUND HEALTH TAB */}
				<TabsContent value='funds' className='space-y-4'>
					<FundHealthReport fundHealth={fundHealth} />
				</TabsContent>

				{/* 5. LEDGER / STATEMENTS TAB */}
				<TabsContent value='ledger'>
					<FinancialStatement
						data={serialize(financialStatement)}
						initialFrom={from}
						initialTo={to}
						accounts={serialize(accounts)}
						hideControls={true}
						// Force re-render when dates change so it respects props
						key={`${from.toISOString()}-${to.toISOString()}`}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}
