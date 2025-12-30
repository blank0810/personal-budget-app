import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { ReportService } from '@/server/modules/report/report.service';
import { DashboardService } from '@/server/modules/dashboard/dashboard.service';
import { CategoryBreakdownChart } from '@/components/modules/reports/CategoryBreakdownChart';
import { MonthlyComparisonChart } from '@/components/modules/reports/MonthlyComparisonChart';
import { BudgetPerformanceChart } from '@/components/modules/reports/BudgetPerformanceChart';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { KPICard } from '@/components/modules/reports/KPICard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NetWorthTrendChart } from '@/components/modules/reports/NetWorthTrendChart';
import { ReportsToolbar } from '@/components/modules/reports/ReportsToolbar';
import { FinancialStatement } from '@/components/modules/reports/FinancialStatement';
import { serialize } from '@/lib/serialization';

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

	// Global Date Range
	const from = resolvedSearchParams.from
		? new Date(resolvedSearchParams.from)
		: startOfMonth(now);
	const to = resolvedSearchParams.to
		? new Date(resolvedSearchParams.to)
		: endOfMonth(now);

	const [
		categoryBreakdown,
		monthlyComparison,
		budgetPerformance,
		financialStatement,
		kpis,
		accounts,
		netWorthHistory,
	] = await Promise.all([
		ReportService.getCategoryBreakdown(userId, from, to),
		ReportService.getMonthlyComparison(userId, subMonths(to, 5), to),
		ReportService.getBudgetVsActual(userId, to),
		ReportService.getFinancialStatement(userId, from, to),
		ReportService.getDashboardKPIs(userId, from, to),
		DashboardService.getAccountBalances(userId),
		ReportService.getNetWorthHistory(userId, from, to),
	]);

	const formatCurrency = (val: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			maximumFractionDigits: 0,
		}).format(val);
	};

	return (
		<div className='container mx-auto py-10 space-y-8'>
			{/* Global Header & Controls */}
			<div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
				<div>
					<h1 className='text-3xl font-bold tracking-tight'>
						Financial Analytics
					</h1>
					<p className='text-muted-foreground'>
						Deep dive into your financial performance and trends.
					</p>
				</div>
				<ReportsToolbar initialFrom={from} initialTo={to} />
			</div>

			<Tabs defaultValue='overview' className='space-y-4'>
				<TabsList>
					<TabsTrigger value='overview'>Overview</TabsTrigger>
					<TabsTrigger value='pnl'>Income & Expenses</TabsTrigger>
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
					<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-7'>
						<div className='col-span-4'>
							<MonthlyComparisonChart
								data={serialize(monthlyComparison)}
							/>
						</div>
						<div className='col-span-3'>
							<CategoryBreakdownChart
								data={serialize(categoryBreakdown)}
							/>
						</div>
						<div className='col-span-7'>
							<BudgetPerformanceChart
								data={serialize(budgetPerformance)}
							/>
						</div>
					</div>
				</TabsContent>

				{/* 3. LEDGER / STATEMENTS TAB */}
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
