'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
	Shield,
	Target,
	AlertTriangle,
	CheckCircle,
	XCircle,
	Zap,
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export interface FundMetrics {
	id: string;
	name: string;
	type: 'EMERGENCY_FUND' | 'FUND';
	balance: number;
	targetAmount: number | null;
	calculationMode: string;
	progressPercent: number;
	monthsCoverage: number | null;
	healthStatus: 'critical' | 'underfunded' | 'building' | 'funded';
	thresholds: {
		low: number;
		mid: number;
		high: number;
	};
}

interface FundCardProps {
	fund: FundMetrics;
}

const healthStyles = {
	critical: {
		badge: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
		progress: '[&>div]:bg-red-500',
		icon: XCircle,
		label: 'Critical',
	},
	underfunded: {
		badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
		progress: '[&>div]:bg-yellow-500',
		icon: AlertTriangle,
		label: 'Underfunded',
	},
	building: {
		badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
		progress: '[&>div]:bg-blue-500',
		icon: Zap,
		label: 'Building',
	},
	funded: {
		badge: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
		progress: '[&>div]:bg-green-500',
		icon: CheckCircle,
		label: 'Funded',
	},
};

export function FundCard({ fund }: FundCardProps) {
	const style = healthStyles[fund.healthStatus];
	const Icon = fund.type === 'EMERGENCY_FUND' ? Shield : Target;
	const StatusIcon = style.icon;

	return (
		<Card className='transition-all hover:shadow-md'>
			<CardHeader className='pb-2'>
				<div className='flex items-center justify-between'>
					<CardTitle className='text-sm font-medium flex items-center gap-2'>
						<Icon className='h-4 w-4 text-blue-600' />
						{fund.name}
					</CardTitle>
					<Badge className={cn('text-xs', style.badge)}>
						<StatusIcon className='h-3 w-3 mr-1' />
						{style.label}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className='space-y-3'>
				{/* Balance */}
				<div className='text-2xl font-bold'>
					{formatCurrency(fund.balance)}
				</div>

				{/* Progress Bar */}
				<div className='space-y-1'>
					<Progress
						value={fund.progressPercent}
						className={cn('h-2', style.progress)}
					/>
					<div className='flex justify-between text-xs text-muted-foreground'>
						<span>{fund.progressPercent.toFixed(0)}% complete</span>
						{fund.calculationMode === 'MONTHS_COVERAGE' ? (
							<span>{fund.monthsCoverage?.toFixed(1)} months</span>
						) : (
							<span>
								Goal: {formatCurrency(fund.targetAmount || 0)}
							</span>
						)}
					</div>
				</div>

				{/* Metric Detail */}
				<p className='text-xs text-muted-foreground'>
					{fund.calculationMode === 'MONTHS_COVERAGE'
						? `Covers ${fund.monthsCoverage?.toFixed(1) || 0} months of expenses`
						: `${formatCurrency((fund.targetAmount || 0) - fund.balance)} to go`}
				</p>
			</CardContent>
		</Card>
	);
}
