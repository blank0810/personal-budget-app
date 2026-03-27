'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
	Shield,
	Target,
	PiggyBank,
	AlertTriangle,
	CheckCircle,
	XCircle,
	Info,
} from 'lucide-react';
import { useCurrency } from '@/lib/contexts/currency-context';
import type { GoalHealthSummary, GoalHealthMetric } from '@/server/modules/goal/goal.types';

interface GoalHealthReportProps {
	goalHealth: GoalHealthSummary;
}

export function GoalHealthReport({ goalHealth }: GoalHealthReportProps) {
	const { formatCurrency } = useCurrency();
	const { goals, totalGoalBalance, hasEmergencyFund, emergencyFundHealth } = goalHealth;

	const criticalCount = goals.filter((g) => g.healthStatus === 'critical').length;
	const underfundedCount = goals.filter((g) => g.healthStatus === 'underfunded').length;
	const buildingCount = goals.filter((g) => g.healthStatus === 'building').length;
	const fundedCount = goals.filter((g) => g.healthStatus === 'funded').length;
	const insufficientDataCount = goals.filter((g) => g.healthStatus === 'insufficient_data').length;

	const getOverallHealth = () => {
		if (criticalCount > 0) return { status: 'critical', label: 'Needs Attention', color: 'text-red-600' };
		if (underfundedCount > 0) return { status: 'warning', label: 'Building Progress', color: 'text-yellow-600' };
		if (buildingCount > 0) return { status: 'building', label: 'On Track', color: 'text-blue-600' };
		if (fundedCount > 0) return { status: 'funded', label: 'Fully Funded', color: 'text-green-600' };
		if (insufficientDataCount > 0) return { status: 'insufficient_data', label: 'Insufficient Data', color: 'text-muted-foreground' };
		return { status: 'none', label: 'No Goals', color: 'text-muted-foreground' };
	};

	const overallHealth = getOverallHealth();

	if (goals.length === 0) {
		return (
			<Alert>
				<Info className='h-4 w-4' />
				<AlertTitle>No Goals</AlertTitle>
				<AlertDescription>
					You haven&apos;t created any savings goals yet. Create an Emergency Fund
					or savings goal to track your financial safety net and progress.
				</AlertDescription>
			</Alert>
		);
	}

	return (
		<div className='space-y-6'>
			<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
				<Card>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>Total Goal Balance</CardTitle>
						<PiggyBank className='h-4 w-4 text-muted-foreground' />
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold'>{formatCurrency(totalGoalBalance)}</div>
						<p className='text-xs text-muted-foreground'>
							Across {goals.length} goal{goals.length !== 1 ? 's' : ''}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>Overall Health</CardTitle>
						{overallHealth.status === 'critical' && <XCircle className='h-4 w-4 text-red-600' />}
						{overallHealth.status === 'warning' && <AlertTriangle className='h-4 w-4 text-yellow-600' />}
						{overallHealth.status === 'building' && <Target className='h-4 w-4 text-blue-600' />}
						{overallHealth.status === 'funded' && <CheckCircle className='h-4 w-4 text-green-600' />}
						{overallHealth.status === 'insufficient_data' && <Info className='h-4 w-4 text-muted-foreground' />}
					</CardHeader>
					<CardContent>
						<div className={`text-2xl font-bold ${overallHealth.color}`}>{overallHealth.label}</div>
						<p className='text-xs text-muted-foreground'>Based on goal thresholds</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>Emergency Fund</CardTitle>
						<Shield className='h-4 w-4 text-blue-600' />
					</CardHeader>
					<CardContent>
						{hasEmergencyFund ? (
							<>
								<div className='text-2xl font-bold'>
									{goalHealth.emergencyFundMonths === null
									? 'Insufficient data'
									: `${goalHealth.emergencyFundMonths?.toFixed(1)} months`}
								</div>
								<Badge
									variant='outline'
									className={
										emergencyFundHealth === 'critical'
											? 'text-red-600 border-red-200'
											: emergencyFundHealth === 'underfunded'
											? 'text-yellow-600 border-yellow-200'
											: emergencyFundHealth === 'building'
											? 'text-blue-600 border-blue-200'
											: emergencyFundHealth === 'insufficient_data'
											? 'text-muted-foreground border-border'
											: 'text-green-600 border-green-200'
									}
								>
									{emergencyFundHealth === 'critical' && 'Critical'}
									{emergencyFundHealth === 'underfunded' && 'Underfunded'}
									{emergencyFundHealth === 'building' && 'Building'}
									{emergencyFundHealth === 'funded' && 'Funded'}
									{emergencyFundHealth === 'insufficient_data' && 'No Data'}
								</Badge>
							</>
						) : (
							<>
								<div className='text-2xl font-bold text-muted-foreground'>Not Set Up</div>
								<p className='text-xs text-muted-foreground'>Create an Emergency Fund goal</p>
							</>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>Health Distribution</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='flex gap-2 flex-wrap'>
							{criticalCount > 0 && (
								<Badge variant='outline' className='text-red-600 border-red-200'>
									{criticalCount} Critical
								</Badge>
							)}
							{underfundedCount > 0 && (
								<Badge variant='outline' className='text-yellow-600 border-yellow-200'>
									{underfundedCount} Underfunded
								</Badge>
							)}
							{buildingCount > 0 && (
								<Badge variant='outline' className='text-blue-600 border-blue-200'>
									{buildingCount} Building
								</Badge>
							)}
							{fundedCount > 0 && (
								<Badge variant='outline' className='text-green-600 border-green-200'>
									{fundedCount} Funded
								</Badge>
							)}
							{insufficientDataCount > 0 && (
								<Badge variant='outline' className='text-muted-foreground border-border'>
									{insufficientDataCount} No Data
								</Badge>
							)}
						</div>
						<p className='text-xs text-muted-foreground mt-2'>
							{fundedCount} of {goals.length} fully funded
						</p>
					</CardContent>
				</Card>
			</div>

			{criticalCount > 0 && (
				<Alert variant='destructive'>
					<AlertTriangle className='h-4 w-4' />
					<AlertTitle>Critical Goals Need Attention</AlertTitle>
					<AlertDescription>
						You have {criticalCount} goal{criticalCount !== 1 ? 's' : ''} in
						critical status. Consider prioritizing contributions.
					</AlertDescription>
				</Alert>
			)}

			<div>
				<h3 className='text-lg font-semibold mb-4'>All Goals</h3>
				<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
					{goals.map((goal) => (
						<GoalMetricCard key={goal.id} goal={goal} />
					))}
				</div>
			</div>
		</div>
	);
}

function GoalMetricCard({ goal }: { goal: GoalHealthMetric }) {
	const { formatCurrency } = useCurrency();
	const isMonthsCoverage = goal.goalType === 'MONTHS_COVERAGE';

	const statusColors: Record<string, string> = {
		critical: 'border-red-200 dark:border-red-800',
		underfunded: 'border-yellow-200 dark:border-yellow-800',
		building: 'border-blue-200 dark:border-blue-800',
		funded: 'border-green-200 dark:border-green-800',
		insufficient_data: 'border-border',
	};

	const statusBadge: Record<string, { label: string; className: string }> = {
		critical: { label: 'Critical', className: 'text-red-600 bg-red-50 dark:bg-red-950/30' },
		underfunded: { label: 'Underfunded', className: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30' },
		building: { label: 'Building', className: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30' },
		funded: { label: 'Funded', className: 'text-green-600 bg-green-50 dark:bg-green-950/30' },
		insufficient_data: { label: 'No Data', className: 'text-muted-foreground bg-muted' },
	};

	const badge = statusBadge[goal.healthStatus];

	return (
		<Card className={statusColors[goal.healthStatus]}>
			<CardContent className='pt-4 space-y-3'>
				<div className='flex items-center justify-between'>
					<h4 className='font-semibold text-sm flex items-center gap-1.5'>
						{goal.isEmergencyFund && <Shield className='h-3.5 w-3.5 text-blue-600' />}
						{goal.name}
					</h4>
					{badge && (
						<Badge variant='outline' className={`text-xs border-0 ${badge.className}`}>
							{badge.label}
						</Badge>
					)}
				</div>

				<Progress value={goal.progressPercent} className='h-2' />

				<div className='flex justify-between text-xs text-muted-foreground'>
					{isMonthsCoverage && goal.monthsCoverage != null ? (
						<>
							<span>{goal.monthsCoverage.toFixed(1)} months coverage</span>
							<span>{formatCurrency(goal.balance)}</span>
						</>
					) : isMonthsCoverage && goal.monthsCoverage === null ? (
						<>
							<span>Insufficient expense data</span>
							<span>{formatCurrency(goal.balance)}</span>
						</>
					) : (
						<>
							<span>{formatCurrency(goal.balance)}</span>
							{goal.targetAmount && <span>of {formatCurrency(goal.targetAmount)}</span>}
						</>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
