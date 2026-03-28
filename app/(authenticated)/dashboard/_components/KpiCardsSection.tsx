import { DashboardService } from '@/server/modules/dashboard/dashboard.service';
import { GoalService } from '@/server/modules/goal/goal.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
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
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

// ---------------------------------------------------------------------------
// Sub-components for each KPI card's content
// ---------------------------------------------------------------------------

function SavingsRateContent({
	savingsRate,
	ytdIncome,
}: {
	savingsRate: number;
	ytdIncome: number;
}) {
	const noIncome = ytdIncome === 0;

	let displayValue: string;
	let statusText: string;
	let StatusIcon: typeof BarChart3;
	let colorClass: string;

	if (noIncome) {
		displayValue = '\u2014';
		statusText = 'Add income to track';
		StatusIcon = BarChart3;
		colorClass = 'text-muted-foreground';
	} else if (savingsRate >= 20) {
		displayValue = savingsRate.toFixed(1) + '%';
		statusText = 'Building wealth';
		StatusIcon = CheckCircle;
		colorClass = 'text-green-600 dark:text-green-400';
	} else if (savingsRate >= 10) {
		displayValue = savingsRate.toFixed(1) + '%';
		statusText = 'Making progress';
		StatusIcon = TrendingUp;
		colorClass = 'text-yellow-600 dark:text-yellow-400';
	} else if (savingsRate > 0) {
		displayValue = savingsRate.toFixed(1) + '%';
		statusText = 'Barely saving';
		StatusIcon = AlertTriangle;
		colorClass = 'text-yellow-600 dark:text-yellow-400';
	} else if (savingsRate === 0) {
		displayValue = '0%';
		statusText = 'Living paycheck to paycheck';
		StatusIcon = Flame;
		colorClass = 'text-orange-600 dark:text-orange-400';
	} else if (savingsRate >= -20) {
		displayValue = savingsRate.toFixed(1) + '%';
		statusText = 'Spending more than earning';
		StatusIcon = Flame;
		colorClass = 'text-red-600 dark:text-red-400';
	} else {
		displayValue = savingsRate.toFixed(1) + '%';
		statusText = 'Bleeding money';
		StatusIcon = XCircle;
		colorClass = 'text-red-600 dark:text-red-400';
	}

	return (
		<>
			<div className={`text-2xl font-bold ${colorClass}`}>{displayValue}</div>
			<p className='text-xs text-muted-foreground mt-1 flex items-center gap-1'>
				<StatusIcon className='h-3 w-3' />
				{statusText}
			</p>
		</>
	);
}

function EmergencyFundContent({
	emergencyFundMonths,
	emergencyFundHealth,
	emergencyFundExpenseSource,
}: {
	emergencyFundMonths: number | null;
	emergencyFundHealth: string | null;
	emergencyFundExpenseSource: string | null;
}) {
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

	type HealthKey = keyof typeof statusConfig;
	const config = statusConfig[(emergencyFundHealth as HealthKey) ?? 'critical'] ?? statusConfig.critical;
	const StatusIcon = config.icon;
	const months = emergencyFundMonths;

	return (
		<>
			<div className={`text-2xl font-bold ${config.color}`}>
				{months === null ? '\u2014' : months >= 12 ? '12+' : months.toFixed(1)}{' '}
				{months !== null && 'mo'}
			</div>
			<p className='text-xs text-muted-foreground mt-1 flex items-center gap-1'>
				<StatusIcon className='h-3 w-3' />
				{config.text}
			</p>
			<p className='text-xs text-muted-foreground mt-1'>
				{emergencyFundExpenseSource === 'actual'
					? 'Based on actual spending'
					: emergencyFundExpenseSource === 'budget'
					? 'Based on monthly budget'
					: 'No expense data'}
			</p>
		</>
	);
}

function RunwayContent({ runwayMonths }: { runwayMonths: number | null }) {
	const noExpenses = runwayMonths === null;

	let displayValue: string;
	let statusText: string;
	let StatusIcon: typeof BarChart3;
	let colorClass: string;

	if (noExpenses) {
		displayValue = '\u2014';
		statusText = 'Add expenses to track';
		StatusIcon = BarChart3;
		colorClass = 'text-muted-foreground';
	} else if (runwayMonths >= 12) {
		displayValue = '12+';
		statusText = 'Living the dream';
		StatusIcon = CheckCircle;
		colorClass = 'text-green-600 dark:text-green-400';
	} else if (runwayMonths >= 6) {
		displayValue = runwayMonths.toFixed(1);
		statusText = 'Healthy cushion';
		StatusIcon = CheckCircle;
		colorClass = 'text-green-600 dark:text-green-400';
	} else if (runwayMonths >= 3) {
		displayValue = runwayMonths.toFixed(1);
		statusText = 'Getting thin...';
		StatusIcon = AlertTriangle;
		colorClass = 'text-yellow-600 dark:text-yellow-400';
	} else if (runwayMonths >= 1) {
		displayValue = runwayMonths.toFixed(1);
		statusText = 'Danger zone';
		StatusIcon = Flame;
		colorClass = 'text-orange-600 dark:text-orange-400';
	} else if (runwayMonths > 0) {
		displayValue = runwayMonths.toFixed(1);
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
			<div className={`text-2xl font-bold ${colorClass}`}>
				{displayValue} {!noExpenses && 'mo'}
			</div>
			<p className='text-xs text-muted-foreground mt-1 flex items-center gap-1'>
				<StatusIcon className='h-3 w-3' />
				{statusText}
			</p>
		</>
	);
}

// ---------------------------------------------------------------------------
// Main section component
// ---------------------------------------------------------------------------

interface KpiCardsSectionProps {
	userId: string;
	currency: string;
}

export async function KpiCardsSection({ userId, currency }: KpiCardsSectionProps) {
	const [dashboardData, goalHealth] = await Promise.all([
		DashboardService.getDashboardData(userId),
		GoalService.getGoalHealthMetrics(userId),
	]);

	return (
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
					<CardTitle className='text-sm font-medium'>Savings Rate</CardTitle>
					<div className='h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center'>
						<ArrowUpRight className='h-4 w-4 text-emerald-600 dark:text-emerald-400' />
					</div>
				</CardHeader>
				<CardContent>
					<SavingsRateContent
						savingsRate={dashboardData.savingsRate}
						ytdIncome={dashboardData.ytdIncome}
					/>
				</CardContent>
			</Card>

			{/* 3. Runway OR Emergency Fund */}
			<Card className='transition-all hover:shadow-md'>
				<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
					<CardTitle className='text-sm font-medium'>
						{goalHealth.hasEmergencyFund ? 'Emergency Fund' : 'Runway'}
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
						<EmergencyFundContent
							emergencyFundMonths={goalHealth.emergencyFundMonths}
							emergencyFundHealth={goalHealth.emergencyFundHealth}
							emergencyFundExpenseSource={goalHealth.emergencyFundExpenseSource}
						/>
					) : (
						<RunwayContent runwayMonths={dashboardData.runwayMonths} />
					)}
				</CardContent>
			</Card>

			{/* 4. Debt Overview */}
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
										<span>
											Credit:{' '}
											{dashboardData.creditUtilization.toFixed(0)}% used
										</span>
										<span className='text-green-600 dark:text-green-400'>
											Avail:{' '}
											{formatCurrency(dashboardData.availableCredit, {
												currency,
											})}
										</span>
									</div>
									<div className='h-1.5 bg-secondary rounded-full overflow-hidden'>
										<div
											className={`h-full rounded-full ${
												dashboardData.creditUtilization >= 70
													? 'bg-red-500'
													: dashboardData.creditUtilization >= 30
													? 'bg-yellow-500'
													: 'bg-green-500'
											}`}
											style={{
												width: `${Math.min(
													dashboardData.creditUtilization,
													100
												)}%`,
											}}
										/>
									</div>
								</div>
							)}
							<div className='text-xs text-muted-foreground pt-2 border-t flex justify-between'>
								<span>
									Paid this month:{' '}
									{formatCurrency(dashboardData.debtPaydown, { currency })}
								</span>
								<span>
									{dashboardData.monthsToPayoff === -1
										? 'No payments made'
										: dashboardData.monthsToPayoff <= 12
										? `~${dashboardData.monthsToPayoff} mo to payoff`
										: `~${Math.round(
												dashboardData.monthsToPayoff / 12
											)} yr to payoff`}
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
	);
}
