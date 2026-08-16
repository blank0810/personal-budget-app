import { AccountsDebtSummary } from '@/components/modules/dashboard/AccountsDebtSummary';
import { BudgetPressure } from '@/components/modules/dashboard/BudgetPressure';
import { CashFlowTrend } from '@/components/modules/dashboard/CashFlowTrend';
import { DashboardEvidenceStrip } from '@/components/modules/dashboard/DashboardEvidenceStrip';
import { DashboardHeader } from '@/components/modules/dashboard/DashboardHeader';
import {
	DashboardEmptyState,
	DashboardErrorState,
} from '@/components/modules/dashboard/DashboardStatePanels';
import { FinancialHealthVerdict } from '@/components/modules/dashboard/FinancialHealthVerdict';
import { HealthLedger } from '@/components/modules/dashboard/HealthLedger';
import { QuickActionProvider } from '@/components/modules/dashboard/QuickActionSheet';
import { RecentActivity } from '@/components/modules/dashboard/RecentActivity';
import { getDashboardOverviewAction } from '@/server/modules/dashboard/dashboard.controller';

export default async function DashboardPage() {
	const result = await getDashboardOverviewAction();
	if ('error' in result) {
		return (
			<div className='container mx-auto py-6 md:py-10'>
				<DashboardErrorState />
			</div>
		);
	}

	const overview = result.data;
	return (
		<QuickActionProvider
			accounts={overview.quickActions.accounts}
			incomeCategories={overview.quickActions.incomeCategories}
			expenseCategories={overview.quickActions.expenseCategories}
			budgets={overview.quickActions.budgets}
		>
			<div className='container mx-auto space-y-6 py-5 md:py-6'>
				<DashboardHeader
					snapshotLabel={overview.snapshotLabel}
					availability={overview.quickActions.availability}
				/>
				{overview.dataQuality === 'empty' ? (
					<DashboardEmptyState />
				) : (
					<>
						<FinancialHealthVerdict health={overview.health} />
						<HealthLedger pillars={overview.health.pillars} />
						<DashboardEvidenceStrip
							evidence={overview.evidence}
							currency={overview.currency}
						/>
						<div className='grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.75fr)]'>
							<CashFlowTrend
								cashFlow={overview.cashFlow}
								currency={overview.currency}
							/>
							<BudgetPressure
								data={overview.budgetPressure}
								currency={overview.currency}
							/>
						</div>
						<div className='grid gap-6 lg:grid-cols-[minmax(18rem,0.75fr)_minmax(0,1.65fr)]'>
							<AccountsDebtSummary
								data={overview.accountsDebt}
								currency={overview.currency}
							/>
							<RecentActivity
								items={overview.recentActivity}
								currency={overview.currency}
							/>
						</div>
					</>
				)}
			</div>
		</QuickActionProvider>
	);
}
