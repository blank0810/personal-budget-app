'use client';

import Link from 'next/link';
import { AlertTriangle, FileText, Plus, Target, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/lib/contexts/currency-context';

interface DashboardTabsProps {
	kpiData: {
		netWorth: number;
		totalAssets: number;
		totalLiabilities: number;
		savingsRate: number;
		emergencyFundMonths: number | null;
		runwayMonths: number | null;
		creditUtilization: number | null;
	};
	invoiceData: {
		outstanding: number;
		overdue: number;
		drafts: number;
		overdueCount: number;
	} | null;
	goals: Array<{
		id: string;
		name: string;
		targetAmount: number;
		currentAmount: number;
		type: string;
		color: string | null;
	}>;
	budgetHealth: {
		utilizationPercent: number;
		onTrackCount: number;
		warningCount: number;
		overCount: number;
	} | null;
	defaultTab?: string;
}

// ---- helpers ----------------------------------------------------------------

function netWorthColor(value: number) {
	return value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
}

function savingsRateColor(rate: number) {
	if (rate >= 20) return 'text-green-600 dark:text-green-400';
	if (rate >= 10) return 'text-amber-500 dark:text-amber-400';
	return 'text-red-600 dark:text-red-400';
}

function emergencyFundColor(months: number | null) {
	if (months === null) return 'text-muted-foreground';
	if (months >= 6) return 'text-green-600 dark:text-green-400';
	if (months >= 3) return 'text-amber-500 dark:text-amber-400';
	return 'text-red-600 dark:text-red-400';
}

function creditUtilColor(pct: number | null) {
	if (pct === null) return 'text-muted-foreground';
	if (pct < 30) return 'text-green-600 dark:text-green-400';
	if (pct < 70) return 'text-amber-500 dark:text-amber-400';
	return 'text-red-600 dark:text-red-400';
}

function creditUtilIndicator(pct: number | null) {
	if (pct === null) return 'bg-muted';
	if (pct < 30) return 'bg-green-500';
	if (pct < 70) return 'bg-amber-500';
	return 'bg-red-500';
}

function budgetBarColor(pct: number) {
	if (pct <= 75) return 'bg-green-500';
	if (pct <= 100) return 'bg-amber-500';
	return 'bg-red-500';
}

function goalProgressPercent(goal: DashboardTabsProps['goals'][number]) {
	if (goal.targetAmount <= 0) return 0;
	return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
}

// ---- mini KPI card ----------------------------------------------------------
// Plain bordered box -- no nested Card since we're inside one already.

interface MiniKpiCardProps {
	label: string;
	value: React.ReactNode;
	sub?: React.ReactNode;
}

function MiniKpiCard({ label, value, sub }: MiniKpiCardProps) {
	return (
		<div className='flex flex-col gap-1.5 rounded-lg border bg-muted/30 p-3'>
			<p className='text-[11px] font-medium text-muted-foreground uppercase tracking-wide leading-none'>
				{label}
			</p>
			<div className='text-base font-semibold leading-tight'>{value}</div>
			{sub && <div className='mt-0.5'>{sub}</div>}
		</div>
	);
}

// ---- tab: Health ------------------------------------------------------------

interface HealthTabProps {
	kpiData: DashboardTabsProps['kpiData'];
	formatCurrency: (amount: number) => string;
}

function HealthTab({ kpiData, formatCurrency }: HealthTabProps) {
	const creditPct = kpiData.creditUtilization;
	const clampedCredit = creditPct !== null ? Math.min(creditPct, 100) : 0;

	return (
		<div className='grid grid-cols-2 gap-3'>
			{/* Net Worth */}
			<MiniKpiCard
				label='Net Worth'
				value={
					<span className={netWorthColor(kpiData.netWorth)}>
						{formatCurrency(kpiData.netWorth)}
					</span>
				}
			/>

			{/* Savings Rate */}
			<MiniKpiCard
				label='Savings Rate'
				value={
					<span className={savingsRateColor(kpiData.savingsRate)}>
						{kpiData.savingsRate.toFixed(1)}%
					</span>
				}
			/>

			{/* Emergency Fund */}
			<MiniKpiCard
				label='Emergency Fund'
				value={
					kpiData.emergencyFundMonths !== null ? (
						<span className={emergencyFundColor(kpiData.emergencyFundMonths)}>
							{kpiData.emergencyFundMonths.toFixed(1)} mo
						</span>
					) : (
						<span className='text-muted-foreground'>N/A</span>
					)
				}
			/>

			{/* Credit Utilization */}
			<MiniKpiCard
				label='Credit Usage'
				value={
					creditPct !== null ? (
						<span className={creditUtilColor(creditPct)}>
							{creditPct.toFixed(1)}%
						</span>
					) : (
						<span className='text-muted-foreground'>N/A</span>
					)
				}
				sub={
					creditPct !== null ? (
						<Progress
							value={clampedCredit}
							className='h-1.5'
							indicatorClassName={creditUtilIndicator(creditPct)}
						/>
					) : null
				}
			/>
		</div>
	);
}

// ---- tab: Invoices ----------------------------------------------------------

interface InvoicesTabProps {
	invoiceData: DashboardTabsProps['invoiceData'];
	formatCurrency: (amount: number) => string;
}

function InvoicesTab({ invoiceData, formatCurrency }: InvoicesTabProps) {
	if (!invoiceData) return null;

	return (
		<div className='flex flex-col gap-4'>
			{/* Outstanding amount */}
			<div>
				<p className='text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1'>
					Outstanding
				</p>
				<p className='text-2xl font-bold tracking-tight'>
					{formatCurrency(invoiceData.outstanding)}
				</p>
			</div>

			{/* Stats row */}
			<div className='flex flex-col gap-2'>
				{/* Overdue */}
				<div className='flex items-center justify-between'>
					<div className='flex items-center gap-1.5 text-sm text-muted-foreground'>
						<AlertTriangle className='h-3.5 w-3.5 text-red-500' />
						Overdue
					</div>
					<div className='flex items-center gap-1.5'>
						<span className='text-sm font-medium'>
							{formatCurrency(invoiceData.overdue)}
						</span>
						{invoiceData.overdueCount > 0 && (
							<Badge
								variant='destructive'
								className='px-1.5 py-0 text-[10px] h-4 rounded-full'
							>
								{invoiceData.overdueCount}
							</Badge>
						)}
					</div>
				</div>

				{/* Drafts */}
				<div className='flex items-center justify-between'>
					<div className='flex items-center gap-1.5 text-sm text-muted-foreground'>
						<FileText className='h-3.5 w-3.5' />
						Drafts
					</div>
					<span className='text-sm font-medium'>{invoiceData.drafts}</span>
				</div>
			</div>

			{/* Actions */}
			<div className='flex items-center gap-2 pt-1'>
				<Link
					href='/invoices/new'
					className={cn(
						'inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium',
						'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'
					)}
				>
					<Plus className='h-3 w-3' />
					New Invoice
				</Link>
				<Link
					href='/invoices'
					className='text-xs text-primary hover:underline'
				>
					View all →
				</Link>
			</div>
		</div>
	);
}

// ---- tab: Goals -------------------------------------------------------------

function GoalsTab({
	goals,
	budgetHealth,
}: Pick<DashboardTabsProps, 'goals' | 'budgetHealth'>) {
	const topGoals = goals.slice(0, 3);
	const totalBudgets =
		budgetHealth
			? budgetHealth.onTrackCount + budgetHealth.warningCount + budgetHealth.overCount
			: 0;

	return (
		<div className='flex flex-col gap-4'>
			{/* Goal progress rows */}
			{topGoals.length === 0 ? (
				<div className='flex flex-col items-center justify-center py-8 gap-2'>
					<Target className='h-7 w-7 text-muted-foreground/40' />
					<p className='text-sm text-muted-foreground'>No active goals</p>
					<Link href='/goals' className='text-sm text-primary hover:underline'>
						Create one →
					</Link>
				</div>
			) : (
				<div className='flex flex-col gap-3'>
					{topGoals.map((goal) => {
						const pct = goalProgressPercent(goal);
						return (
							<div key={goal.id} className='flex flex-col gap-1.5'>
								<div className='flex items-center justify-between'>
									<p className='text-sm font-medium truncate max-w-[65%]'>
										{goal.name}
									</p>
									<span className='text-xs text-muted-foreground'>
										{pct.toFixed(0)}%
									</span>
								</div>
								<Progress value={pct} className='h-2' />
							</div>
						);
					})}
				</div>
			)}

			{/* Budget utilization */}
			{budgetHealth && totalBudgets > 0 && (
				<div className='border-t pt-3 flex flex-col gap-2'>
					<div className='flex items-center justify-between'>
						<div className='flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wide'>
							<TrendingUp className='h-3.5 w-3.5' />
							Budget Used
						</div>
						<span className='text-sm font-semibold'>
							{budgetHealth.utilizationPercent.toFixed(0)}%
						</span>
					</div>
					<Progress
						value={Math.min(budgetHealth.utilizationPercent, 100)}
						className='h-2'
						indicatorClassName={budgetBarColor(budgetHealth.utilizationPercent)}
					/>
					<div className='flex items-center gap-2 text-xs text-muted-foreground'>
						{budgetHealth.onTrackCount > 0 && (
							<span className='text-green-600 dark:text-green-400'>
								{budgetHealth.onTrackCount} on track
							</span>
						)}
						{budgetHealth.warningCount > 0 && (
							<span className='text-amber-500 dark:text-amber-400'>
								{budgetHealth.warningCount} warning
							</span>
						)}
						{budgetHealth.overCount > 0 && (
							<span className='text-red-600 dark:text-red-400'>
								{budgetHealth.overCount} over
							</span>
						)}
					</div>
				</div>
			)}

			<Link href='/goals' className='text-sm text-primary hover:underline self-start'>
				View all goals →
			</Link>
		</div>
	);
}

// ---- root component ---------------------------------------------------------

export function DashboardTabs({
	kpiData,
	invoiceData,
	goals,
	budgetHealth,
	defaultTab,
}: DashboardTabsProps) {
	const { formatCurrency } = useCurrency();
	const resolvedDefault = defaultTab ?? (invoiceData ? 'invoices' : 'health');

	return (
		<Tabs defaultValue={resolvedDefault} className='flex flex-col'>
			{/* Title row */}
			<div className='flex items-center justify-between mb-2'>
				<p className='text-sm font-semibold'>Overview</p>
				<Link
					href='/reports'
					className='text-xs text-muted-foreground hover:text-primary transition-colors'
				>
					Show more →
				</Link>
			</div>

			{/* Pill tabs */}
			<TabsList className='h-8 p-0.5 gap-0.5 rounded-full bg-muted w-full mb-2'>
				<TabsTrigger
					value='health'
					className='flex-1 h-7 rounded-full px-2 text-xs font-medium data-[state=active]:shadow-sm'
				>
					Health
				</TabsTrigger>
				{invoiceData && (
					<TabsTrigger
						value='invoices'
						className='flex-1 h-7 rounded-full px-2 text-xs font-medium data-[state=active]:shadow-sm'
					>
						Invoices
					</TabsTrigger>
				)}
				<TabsTrigger
					value='goals'
					className='flex-1 h-7 rounded-full px-2 text-xs font-medium data-[state=active]:shadow-sm'
				>
					Goals
				</TabsTrigger>
			</TabsList>

			<TabsContent value='health' className='mt-0'>
				<HealthTab kpiData={kpiData} formatCurrency={formatCurrency} />
			</TabsContent>

			{invoiceData && (
				<TabsContent value='invoices' className='mt-0'>
					<InvoicesTab invoiceData={invoiceData} formatCurrency={formatCurrency} />
				</TabsContent>
			)}

			<TabsContent value='goals' className='mt-0'>
				<GoalsTab goals={goals} budgetHealth={budgetHealth} />
			</TabsContent>
		</Tabs>
	);
}
