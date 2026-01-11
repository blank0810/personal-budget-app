'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
	Shield,
	Target,
	PiggyBank,
	AlertTriangle,
	CheckCircle,
	XCircle,
	Info,
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { FundCard, type FundMetrics } from '@/components/modules/fund/FundCard';

interface FundHealthData {
	funds: FundMetrics[];
	totalFundBalance: number;
	hasEmergencyFund: boolean;
	emergencyFundMonths: number | null;
	emergencyFundHealth: 'critical' | 'underfunded' | 'building' | 'funded' | null;
}

interface FundHealthReportProps {
	fundHealth: FundHealthData;
}

export function FundHealthReport({ fundHealth }: FundHealthReportProps) {
	const { funds, totalFundBalance, hasEmergencyFund, emergencyFundHealth } = fundHealth;

	// Calculate summary stats
	const criticalCount = funds.filter((f) => f.healthStatus === 'critical').length;
	const underfundedCount = funds.filter((f) => f.healthStatus === 'underfunded').length;
	const buildingCount = funds.filter((f) => f.healthStatus === 'building').length;
	const fundedCount = funds.filter((f) => f.healthStatus === 'funded').length;

	// Get overall health status
	const getOverallHealth = () => {
		if (criticalCount > 0) return { status: 'critical', label: 'Needs Attention', color: 'text-red-600' };
		if (underfundedCount > 0) return { status: 'warning', label: 'Building Progress', color: 'text-yellow-600' };
		if (buildingCount > 0) return { status: 'building', label: 'On Track', color: 'text-blue-600' };
		if (fundedCount > 0) return { status: 'funded', label: 'Fully Funded', color: 'text-green-600' };
		return { status: 'none', label: 'No Funds', color: 'text-muted-foreground' };
	};

	const overallHealth = getOverallHealth();

	if (funds.length === 0) {
		return (
			<Alert>
				<Info className='h-4 w-4' />
				<AlertTitle>No Fund Accounts</AlertTitle>
				<AlertDescription>
					You haven&apos;t created any fund accounts yet. Create an Emergency Fund
					or Savings Goal account to track your financial safety net and
					savings progress.
				</AlertDescription>
			</Alert>
		);
	}

	return (
		<div className='space-y-6'>
			{/* Summary Cards */}
			<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
				{/* Total Fund Balance */}
				<Card>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>
							Total Fund Balance
						</CardTitle>
						<PiggyBank className='h-4 w-4 text-muted-foreground' />
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold'>
							{formatCurrency(totalFundBalance)}
						</div>
						<p className='text-xs text-muted-foreground'>
							Across {funds.length} fund{funds.length !== 1 ? 's' : ''}
						</p>
					</CardContent>
				</Card>

				{/* Overall Health */}
				<Card>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>
							Overall Health
						</CardTitle>
						{overallHealth.status === 'critical' && (
							<XCircle className='h-4 w-4 text-red-600' />
						)}
						{overallHealth.status === 'warning' && (
							<AlertTriangle className='h-4 w-4 text-yellow-600' />
						)}
						{overallHealth.status === 'building' && (
							<Target className='h-4 w-4 text-blue-600' />
						)}
						{overallHealth.status === 'funded' && (
							<CheckCircle className='h-4 w-4 text-green-600' />
						)}
					</CardHeader>
					<CardContent>
						<div className={`text-2xl font-bold ${overallHealth.color}`}>
							{overallHealth.label}
						</div>
						<p className='text-xs text-muted-foreground'>
							Based on fund thresholds
						</p>
					</CardContent>
				</Card>

				{/* Emergency Fund Status */}
				<Card>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>
							Emergency Fund
						</CardTitle>
						<Shield className='h-4 w-4 text-blue-600' />
					</CardHeader>
					<CardContent>
						{hasEmergencyFund ? (
							<>
								<div className='text-2xl font-bold'>
									{fundHealth.emergencyFundMonths?.toFixed(1)} months
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
											: 'text-green-600 border-green-200'
									}
								>
									{emergencyFundHealth === 'critical' && 'Critical'}
									{emergencyFundHealth === 'underfunded' && 'Underfunded'}
									{emergencyFundHealth === 'building' && 'Building'}
									{emergencyFundHealth === 'funded' && 'Funded'}
								</Badge>
							</>
						) : (
							<>
								<div className='text-2xl font-bold text-muted-foreground'>
									Not Set Up
								</div>
								<p className='text-xs text-muted-foreground'>
									Create an Emergency Fund account
								</p>
							</>
						)}
					</CardContent>
				</Card>

				{/* Health Distribution */}
				<Card>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>
							Health Distribution
						</CardTitle>
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
						</div>
						<p className='text-xs text-muted-foreground mt-2'>
							{fundedCount} of {funds.length} fully funded
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Critical Funds Alert */}
			{criticalCount > 0 && (
				<Alert variant='destructive'>
					<AlertTriangle className='h-4 w-4' />
					<AlertTitle>Critical Funds Need Attention</AlertTitle>
					<AlertDescription>
						You have {criticalCount} fund{criticalCount !== 1 ? 's' : ''} in
						critical status. Consider prioritizing contributions to these funds.
					</AlertDescription>
				</Alert>
			)}

			{/* Fund Cards Grid */}
			<div>
				<h3 className='text-lg font-semibold mb-4'>All Funds</h3>
				<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
					{funds.map((fund) => (
						<FundCard key={fund.id} fund={fund} />
					))}
				</div>
			</div>
		</div>
	);
}
