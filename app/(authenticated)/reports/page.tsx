import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { ReportService } from '@/server/modules/report/report.service';
import { CategoryBreakdownChart } from '@/components/modules/reports/CategoryBreakdownChart';
import { MonthlyComparisonChart } from '@/components/modules/reports/MonthlyComparisonChart';
import { BudgetPerformanceChart } from '@/components/modules/reports/BudgetPerformanceChart';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { KPICard } from '@/components/modules/reports/KPICard';
import { AnalyticsTabs } from '@/components/modules/reports/AnalyticsTabs';
import { FinancialStatement } from '@/components/modules/reports/FinancialStatement';

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

	// Global Date Range (Controls everything now)
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
	] = await Promise.all([
		ReportService.getCategoryBreakdown(userId, from, to), // Now respects global range
		ReportService.getMonthlyComparison(userId, subMonths(to, 5), to), // Keep historical context fixed relative to end date
		ReportService.getBudgetVsActual(userId, to), // Budget for end-of-period month
		ReportService.getFinancialStatement(userId, from, to),
		ReportService.getDashboardKPIs(userId, from, to),
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
			{/* Header with Global Controls */}
			<div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
				<div>
					<h1 className='text-3xl font-bold tracking-tight'>
						Financial Analytics
					</h1>
					<p className='text-muted-foreground'>
						Deep dive into your financial performance and trends.
					</p>
				</div>
				{/* We'll rely on FinancialStatement's internal picker for now, 
				    but ideally this should be hoisted. 
					For now, the FinancialStatement component handles the URL state which drives this page. 
					We will render a hidden or sync'd picker inside FinancialStatement, 
					or better yet, update FinancialStatement to accept date props primarily 
					and move the picker here.
					
					Let's use the one inside FinancialStatement as the primary driver for now to avoid refactoring it today,
					but visually we are presenting a unified dashboard.
				*/}
			</div>

			{/* KPI Cards Section */}
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
					inverseTrend // Up is bad for expenses
				/>
				<KPICard
					title='Savings Ratio'
					value={`${kpis.savingsRate.value.toFixed(1)}%`}
					change={kpis.savingsRate.change}
					trend={kpis.savingsRate.trend}
					history={kpis.savingsRate.history}
				/>
			</div>

			{/* Analytics Lab */}
			<AnalyticsTabs
				charts={
					<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-7'>
						<div className='col-span-4'>
							<MonthlyComparisonChart data={monthlyComparison} />
						</div>
						<div className='col-span-3'>
							<CategoryBreakdownChart data={categoryBreakdown} />
						</div>
						<div className='col-span-7'>
							<BudgetPerformanceChart data={budgetPerformance} />
						</div>
					</div>
				}
				ledger={
					<FinancialStatement
						data={financialStatement}
						initialFrom={from}
						initialTo={to}
					/>
				}
			/>
		</div>
	);
}
