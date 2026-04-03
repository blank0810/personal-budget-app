import { Suspense } from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

import { UserService } from '@/server/modules/user/user.service';
import { DashboardService } from '@/server/modules/dashboard/dashboard.service';
import { InvoiceService } from '@/server/modules/invoice/invoice.service';
import { GoalService } from '@/server/modules/goal/goal.service';
import { BudgetService } from '@/server/modules/budget/budget.service';
import { CategoryService } from '@/server/modules/category/category.service';

import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { GreetingHeader } from '@/components/modules/dashboard/GreetingHeader';
import { AccountCardCarousel } from '@/components/modules/dashboard/AccountCardCarousel';
import { DashboardTabs } from '@/components/modules/dashboard/DashboardTabs';
import { QuickTransferPayment } from '@/components/modules/dashboard/QuickTransferPayment';
import { RecentTransactions } from '@/components/modules/dashboard/RecentTransactions';
import { IncomeExpenseTrend } from '@/components/modules/dashboard/IncomeExpenseTrend';
import { AiAdvisorTeaser } from '@/components/modules/dashboard/AiAdvisorTeaser';
import { QuickActionProvider } from '@/components/modules/dashboard/QuickActionSheet';
import {
	GreetingHeaderSkeleton,
	AccountCardCarouselSkeleton,
	CombinedTabsTransferSkeleton,
} from '@/components/modules/dashboard/DashboardSkeleton';

// ---------------------------------------------------------------------------
// Async section components
// ---------------------------------------------------------------------------

async function GreetingSection({ userId }: { userId: string }) {
	const { name } = await UserService.getEmailAndName(userId);
	return <GreetingHeader userName={name ?? 'there'} />;
}

async function Row2Section({ userId }: { userId: string }) {
	const [dashboardData, invoiceSummary, allGoals, budgetHealth, goalHealth, userCurrency] =
		await Promise.all([
			DashboardService.getDashboardData(userId),
			InvoiceService.getSummary(userId),
			GoalService.getAll(userId),
			BudgetService.getBudgetHealthSummary(userId),
			GoalService.getGoalHealthMetrics(userId),
			UserService.getCurrency(userId),
		]);

	// ---- Accounts (shared by carousel + quick transfer) ----
	const accounts = dashboardData.accounts.map((a) => ({
		id: a.id,
		name: a.name,
		type: a.type,
		balance: Number(a.balance),
		color: a.color,
		isLiability: a.isLiability,
		creditLimit: a.creditLimit ? Number(a.creditLimit) : null,
		currency: a.currency,
	}));

	// Total balance across all non-tithe accounts (assets - liabilities)
	const totalBalance = dashboardData.netWorth;

	// ---- KPI data for DashboardTabs ----
	const kpiData = {
		netWorth: dashboardData.netWorth,
		totalAssets: dashboardData.assets,
		totalLiabilities: dashboardData.liabilities,
		savingsRate: dashboardData.savingsRate,
		emergencyFundMonths: goalHealth.emergencyFundMonths,
		runwayMonths: dashboardData.runwayMonths,
		creditUtilization:
			dashboardData.totalCreditLimit > 0
				? dashboardData.creditUtilization
				: null,
	};

	// ---- Invoice data for DashboardTabs ----
	const hasInvoiceActivity =
		Object.keys(invoiceSummary.outstanding).length > 0 ||
		Object.keys(invoiceSummary.paid).length > 0 ||
		invoiceSummary.draftCount > 0 ||
		invoiceSummary.overdueCount > 0;

	// NOTE: InvoiceSummary.outstanding combines SENT + OVERDUE by currency.
	// The overdue dollar amount isn't broken out separately, so we pass 0.
	// The overdueCount badge still signals urgency.
	const invoiceData = hasInvoiceActivity
		? {
				outstanding: Object.values(invoiceSummary.outstanding).reduce(
					(sum, v) => sum + v,
					0
				),
				overdue: 0,
				drafts: invoiceSummary.draftCount,
				overdueCount: invoiceSummary.overdueCount,
			}
		: null;

	// ---- Goals for DashboardTabs ----
	const goals = allGoals
		.filter((g) => g.status === 'ACTIVE')
		.map((g) => ({
			id: g.id,
			name: g.name,
			targetAmount: Number(g.targetAmount),
			currentAmount: Number(g.currentAmount),
			type: g.goalType,
			color: g.color,
		}));

	// ---- Budget health for DashboardTabs ----
	const budgetHealthData =
		budgetHealth.totalBudgets > 0
			? {
					utilizationPercent:
						budgetHealth.totalBudgeted > 0
							? (budgetHealth.totalSpent / budgetHealth.totalBudgeted) * 100
							: 0,
					onTrackCount: budgetHealth.onTrack,
					warningCount: budgetHealth.warning,
					overCount: budgetHealth.over,
				}
			: null;

	// ---- Quick transfer accounts ----
	const transferAccounts = accounts.map((a) => ({
		id: a.id,
		name: a.name,
		type: a.type,
		balance: a.balance,
		isLiability: a.isLiability,
	}));

	// Fetch transactions + trend data alongside the rest
	const [rawTransactions, trendData] = await Promise.all([
		DashboardService.getRecentTransactions(userId, 8),
		DashboardService.getIncomeExpenseTrend(userId),
	]);

	const transactions = rawTransactions.map((t) => ({
		id: t.id,
		type: t.type,
		description: t.description ?? '',
		amount: Number(t.amount),
		category: t.category.name,
		date: t.date.toISOString(),
		accountName: t.account?.name ?? 'Unknown',
	}));

	return (
		<div className='grid grid-cols-1 gap-6 lg:grid-cols-[1fr_0.54fr] lg:grid-rows-[auto_1fr_auto]'>
			{/* Row 1 Left: Card Carousel */}
			<div className='lg:row-start-1 lg:col-start-1'>
				<AccountCardCarousel accounts={accounts} totalBalance={totalBalance} />
			</div>

			{/* Row 1 Right: Overview Tabs + Quick Transfer */}
			<div className='lg:row-start-1 lg:row-end-3 lg:col-start-2'>
				<Card className='animate-fade-up flex flex-col py-0 gap-0 h-full'>
					<CardContent className='p-0 flex flex-col flex-1'>
						<div className='p-3 sm:p-4'>
							<DashboardTabs
								kpiData={kpiData}
								invoiceData={invoiceData}
								goals={goals}
								budgetHealth={budgetHealthData}
							/>
						</div>
						<Separator />
						<div className='p-3 sm:p-4'>
							<QuickTransferPayment accounts={transferAccounts} />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Row 2 Left: Transactions (stretches to align with overview bottom) */}
			<div className='animate-fade-up lg:row-start-2 lg:col-start-1' style={{ animationDelay: '200ms' }}>
				<RecentTransactions transactions={transactions} />
			</div>

			{/* Row 3 Left: AI Advisor */}
			<div className='animate-fade-up lg:row-start-3 lg:col-start-1' style={{ animationDelay: '300ms' }}>
				<AiAdvisorTeaser />
			</div>

			{/* Row 3 Right: Income vs Expenses (same row as AI Advisor = same height) */}
			<div className='animate-fade-up lg:row-start-3 lg:col-start-2' style={{ animationDelay: '300ms' }}>
				<IncomeExpenseTrend data={trendData} />
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Row 2 Skeleton (mirrors the 65/35 grid layout)
// ---------------------------------------------------------------------------

function Row2Skeleton() {
	return (
		<div className='grid grid-cols-1 gap-6 lg:grid-cols-[1fr_0.54fr]'>
			<AccountCardCarouselSkeleton />
			<CombinedTabsTransferSkeleton />
		</div>
	);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function DashboardPage() {
	const session = await auth();
	if (!session?.user?.id) {
		redirect('/api/auth/signin');
	}

	const userId = session.user.id;

	// Fetch data needed for the QuickActionProvider upfront (runs in parallel
	// with everything else because Row2Section also fetches accounts).
	const [accounts, incomeCategories, expenseCategories, currentBudgets] = await Promise.all([
		DashboardService.getDashboardData(userId).then((d) =>
			d.accounts.map((a) => ({
				id: a.id,
				name: a.name,
				type: a.type,
				balance: Number(a.balance),
				isLiability: a.isLiability,
			}))
		),
		CategoryService.getCategories(userId, 'INCOME').then((cats) =>
			cats.map((c) => ({ id: c.id, name: c.name }))
		),
		CategoryService.getCategories(userId, 'EXPENSE').then((cats) =>
			cats.map((c) => ({ id: c.id, name: c.name }))
		),
		BudgetService.getBudgets(userId, { month: new Date() }).then((budgets) =>
			budgets.map((b) => ({
				id: b.id,
				name: b.name,
				categoryId: b.categoryId,
				categoryName: b.category.name,
			}))
		),
	]);

	return (
		<QuickActionProvider
			accounts={accounts}
			incomeCategories={incomeCategories}
			expenseCategories={expenseCategories}
			budgets={currentBudgets}
		>
			<div className='dark:bg-[oklch(0.07_0_0)] -m-4 p-4 md:-m-8 md:p-8 min-h-[calc(100vh-4rem)]'>
				<div className='container mx-auto space-y-6 py-4 md:py-6'>
					<Suspense fallback={<GreetingHeaderSkeleton />}>
						<GreetingSection userId={userId} />
					</Suspense>

					<Suspense fallback={<Row2Skeleton />}>
						<Row2Section userId={userId} />
					</Suspense>
				</div>
			</div>
		</QuickActionProvider>
	);
}
