'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
	CheckCircle,
	AlertTriangle,
	XCircle,
	Wallet,
} from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { BudgetHealthSummary as BudgetHealthSummaryType } from '@/server/modules/budget/budget.types';

interface BudgetHealthSummaryProps {
	health: BudgetHealthSummaryType;
	month: Date;
}

export function BudgetHealthSummary({
	health,
	month,
}: BudgetHealthSummaryProps) {
	// Determine overall health status
	const getHealthStatus = () => {
		if (health.totalBudgets === 0) return 'empty';
		if (health.over > 0) return 'danger';
		if (health.warning > 0) return 'warning';
		return 'healthy';
	};

	const healthStatus = getHealthStatus();

	// Health status styling
	const statusStyles = {
		empty: {
			bg: 'bg-muted',
			border: 'border-muted',
			icon: Wallet,
			iconColor: 'text-muted-foreground',
			iconBg: 'bg-muted',
		},
		healthy: {
			bg: 'bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950 dark:to-background',
			border: 'border-emerald-200 dark:border-emerald-900',
			icon: CheckCircle,
			iconColor: 'text-emerald-600 dark:text-emerald-400',
			iconBg: 'bg-emerald-100 dark:bg-emerald-900',
		},
		warning: {
			bg: 'bg-gradient-to-br from-amber-50 to-white dark:from-amber-950 dark:to-background',
			border: 'border-amber-200 dark:border-amber-900',
			icon: AlertTriangle,
			iconColor: 'text-amber-600 dark:text-amber-400',
			iconBg: 'bg-amber-100 dark:bg-amber-900',
		},
		danger: {
			bg: 'bg-gradient-to-br from-red-50 to-white dark:from-red-950 dark:to-background',
			border: 'border-red-200 dark:border-red-900',
			icon: XCircle,
			iconColor: 'text-red-600 dark:text-red-400',
			iconBg: 'bg-red-100 dark:bg-red-900',
		},
	};

	const style = statusStyles[healthStatus];
	const Icon = style.icon;

	// Calculate utilization percentage
	const utilizationPercent =
		health.totalBudgeted > 0
			? (health.totalSpent / health.totalBudgeted) * 100
			: 0;
	const remaining = health.totalBudgeted - health.totalSpent;

	// Empty state
	if (health.totalBudgets === 0) {
		return (
			<Card className={cn('transition-all', style.bg, style.border)}>
				<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
					<CardTitle className='text-sm font-medium text-muted-foreground'>
						Budget Health
					</CardTitle>
					<div
						className={cn(
							'h-8 w-8 rounded-full flex items-center justify-center',
							style.iconBg
						)}
					>
						<Icon className={cn('h-4 w-4', style.iconColor)} />
					</div>
				</CardHeader>
				<CardContent>
					<p className='text-sm text-muted-foreground'>
						No budgets set for {format(month, 'MMMM yyyy')}
					</p>
					<p className='text-xs text-muted-foreground mt-1'>
						Create a budget to start tracking your spending
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card
			className={cn('transition-all hover:shadow-md', style.bg, style.border)}
		>
			<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
				<div className='space-y-1'>
					<CardTitle className='text-sm font-medium'>Budget Health</CardTitle>
					<p className='text-xs text-muted-foreground'>
						{format(month, 'MMMM yyyy')}
					</p>
				</div>
				<div
					className={cn(
						'h-8 w-8 rounded-full flex items-center justify-center',
						style.iconBg
					)}
				>
					<Icon className={cn('h-4 w-4', style.iconColor)} />
				</div>
			</CardHeader>
			<CardContent className='space-y-4'>
				{/* Status Summary */}
				<div className='flex items-center gap-3'>
					<div className='flex items-center gap-1.5'>
						<div className='h-2 w-2 rounded-full bg-emerald-500' />
						<span className='text-sm font-medium'>{health.onTrack}</span>
						<span className='text-xs text-muted-foreground'>on track</span>
					</div>
					{health.warning > 0 && (
						<div className='flex items-center gap-1.5'>
							<div className='h-2 w-2 rounded-full bg-amber-500' />
							<span className='text-sm font-medium'>{health.warning}</span>
							<span className='text-xs text-muted-foreground'>warning</span>
						</div>
					)}
					{health.over > 0 && (
						<div className='flex items-center gap-1.5'>
							<div className='h-2 w-2 rounded-full bg-red-500' />
							<span className='text-sm font-medium'>{health.over}</span>
							<span className='text-xs text-muted-foreground'>over</span>
						</div>
					)}
				</div>

				{/* Utilization Progress */}
				<div className='space-y-2'>
					<div className='flex justify-between text-sm'>
						<span className='text-muted-foreground'>
							{formatCurrency(health.totalSpent)} of{' '}
							{formatCurrency(health.totalBudgeted)}
						</span>
						<span
							className={cn(
								'font-medium',
								utilizationPercent > 100
									? 'text-red-600'
									: utilizationPercent > 80
									? 'text-amber-600'
									: 'text-emerald-600'
							)}
						>
							{utilizationPercent.toFixed(0)}%
						</span>
					</div>
					<Progress
						value={Math.min(utilizationPercent, 100)}
						className={cn(
							'h-2',
							utilizationPercent > 100
								? '[&>div]:bg-red-500'
								: utilizationPercent > 80
								? '[&>div]:bg-amber-500'
								: '[&>div]:bg-emerald-500'
						)}
					/>
					<p className='text-xs text-muted-foreground'>
						{remaining >= 0
							? `${formatCurrency(remaining)} remaining this month`
							: `${formatCurrency(Math.abs(remaining))} over budget`}
					</p>
				</div>

				{/* Problem Categories */}
				{health.problemCategories.length > 0 && (
					<div className='space-y-2 pt-2 border-t'>
						<p className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
							Needs Attention
						</p>
						<div className='flex flex-wrap gap-2'>
							{health.problemCategories.slice(0, 3).map((cat) => (
								<Badge
									key={cat.categoryId}
									variant={cat.status === 'over' ? 'destructive' : 'secondary'}
									className='text-xs'
								>
									{cat.status === 'over' ? (
										<XCircle className='h-3 w-3 mr-1' />
									) : (
										<AlertTriangle className='h-3 w-3 mr-1' />
									)}
									{cat.name} - {cat.detail}
								</Badge>
							))}
							{health.problemCategories.length > 3 && (
								<Badge variant='outline' className='text-xs'>
									+{health.problemCategories.length - 3} more
								</Badge>
							)}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
