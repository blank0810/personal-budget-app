'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/lib/contexts/currency-context';
import { format } from 'date-fns';
import {
	Target,
	Star,
	Flame,
	Heart,
	Gift,
	Home,
	Car,
	GraduationCap,
	Plane,
	PiggyBank,
	Shield,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
	target: Target,
	star: Star,
	flame: Flame,
	heart: Heart,
	gift: Gift,
	home: Home,
	car: Car,
	graduation: GraduationCap,
	plane: Plane,
	piggybank: PiggyBank,
	shield: Shield,
};

const COLOR_MAP: Record<string, string> = {
	blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
	green: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
	purple:
		'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400',
	orange:
		'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400',
	red: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
	pink: 'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-400',
};

const HEALTH_STATUS_MAP: Record<
	string,
	{ label: string; color: string; bg: string }
> = {
	critical: {
		label: 'Critical',
		color: 'text-red-700 dark:text-red-400',
		bg: 'bg-red-100 dark:bg-red-900/50',
	},
	underfunded: {
		label: 'Underfunded',
		color: 'text-yellow-700 dark:text-yellow-400',
		bg: 'bg-yellow-100 dark:bg-yellow-900/50',
	},
	building: {
		label: 'Building',
		color: 'text-blue-700 dark:text-blue-400',
		bg: 'bg-blue-100 dark:bg-blue-900/50',
	},
	funded: {
		label: 'Funded',
		color: 'text-green-700 dark:text-green-400',
		bg: 'bg-green-100 dark:bg-green-900/50',
	},
	insufficient_data: {
		label: 'No Data',
		color: 'text-muted-foreground',
		bg: 'bg-muted',
	},
};

export interface GoalCardData {
	id: string;
	name: string;
	targetAmount: number | { toNumber(): number };
	currentAmount: number | { toNumber(): number };
	deadline: string | Date | null;
	icon: string | null;
	color: string | null;
	status: string;
	goalType: string;
	isEmergencyFund: boolean;
	thresholdLow: number | null;
	thresholdMid: number | null;
	thresholdHigh: number | null;
	linkedAccount: { id: string; name: string } | null;
	_count: { contributions: number };
	// Optional health metrics passed from parent
	monthsCoverage?: number | null;
	healthStatus?: string;
}

interface GoalCardProps {
	goal: GoalCardData;
	onClick?: () => void;
	compact?: boolean;
}

export function GoalCard({ goal, onClick, compact }: GoalCardProps) {
	const { formatCurrency } = useCurrency();

	const target = Number(goal.targetAmount);
	const current = Number(goal.currentAmount);
	const isMonthsCoverage = goal.goalType === 'MONTHS_COVERAGE';

	// For FIXED_AMOUNT: progress = current/target
	// For MONTHS_COVERAGE: progress based on months vs threshold
	let percentage: number;
	if (isMonthsCoverage && goal.thresholdHigh) {
		const months = goal.monthsCoverage ?? 0;
		percentage = Math.min((months / goal.thresholdHigh) * 100, 100);
	} else {
		percentage =
			target > 0 ? Math.min((current / target) * 100, 100) : 0;
	}

	const remaining = Math.max(target - current, 0);
	const IconComponent = ICON_MAP[goal.icon || 'target'] || Target;
	const colorClass = COLOR_MAP[goal.color || 'blue'] || COLOR_MAP.blue;
	const healthInfo = goal.healthStatus
		? HEALTH_STATUS_MAP[goal.healthStatus]
		: null;

	if (compact) {
		return (
			<div
				className='flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-lg p-2 transition-colors'
				onClick={onClick}
			>
				<div
					className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClass}`}
				>
					<IconComponent className='h-4 w-4' />
				</div>
				<div className='flex-1 min-w-0'>
					<div className='flex items-center gap-1.5'>
						<p className='text-sm font-medium truncate'>
							{goal.name}
						</p>
						{goal.isEmergencyFund && (
							<Shield className='h-3 w-3 text-blue-600 shrink-0' />
						)}
					</div>
					<Progress value={percentage} className='h-1.5 mt-1' />
				</div>
				{isMonthsCoverage && goal.monthsCoverage !== undefined ? (
					<span className='text-xs text-muted-foreground whitespace-nowrap'>
						{goal.monthsCoverage === null ? '\u2014' : `${goal.monthsCoverage.toFixed(1)}mo`}
					</span>
				) : (
					<span className='text-xs text-muted-foreground whitespace-nowrap'>
						{percentage.toFixed(0)}%
					</span>
				)}
			</div>
		);
	}

	return (
		<Card
			className='cursor-pointer transition-all hover:shadow-md'
			onClick={onClick}
		>
			<CardContent className='pt-6 space-y-3'>
				<div className='flex items-start justify-between'>
					<div className='flex items-center gap-3'>
						<div
							className={`flex h-10 w-10 items-center justify-center rounded-full ${colorClass}`}
						>
							<IconComponent className='h-5 w-5' />
						</div>
						<div>
							<h3 className='font-semibold text-sm flex items-center gap-1.5'>
								{goal.name}
								{goal.isEmergencyFund && (
									<Shield className='h-3.5 w-3.5 text-blue-600' />
								)}
							</h3>
							{goal.linkedAccount && (
								<p className='text-xs text-muted-foreground'>
									Linked to {goal.linkedAccount.name}
								</p>
							)}
						</div>
					</div>
					<div className='flex items-center gap-1.5'>
						{healthInfo && (
							<Badge
								variant='outline'
								className={`text-xs ${healthInfo.color} ${healthInfo.bg} border-0`}
							>
								{healthInfo.label}
							</Badge>
						)}
						{goal.status !== 'ACTIVE' && (
							<Badge
								variant={
									goal.status === 'COMPLETED'
										? 'default'
										: 'secondary'
								}
								className='text-xs'
							>
								{goal.status}
							</Badge>
						)}
					</div>
				</div>

				<div className='space-y-1.5'>
					<div className='flex justify-between text-sm'>
						{isMonthsCoverage ? (
							<>
								<span className='text-muted-foreground'>
									{goal.monthsCoverage === null
										? 'Insufficient data'
										: goal.monthsCoverage !== undefined
										? `${goal.monthsCoverage.toFixed(1)} months`
										: formatCurrency(current)}
								</span>
								<span className='font-medium'>
									{goal.thresholdHigh
										? `of ${goal.thresholdHigh}mo target`
										: `${percentage.toFixed(0)}%`}
								</span>
							</>
						) : (
							<>
								<span className='text-muted-foreground'>
									{formatCurrency(current)} of{' '}
									{formatCurrency(target)}
								</span>
								<span className='font-medium'>
									{percentage.toFixed(0)}%
								</span>
							</>
						)}
					</div>
					<Progress value={percentage} className='h-2' />
				</div>

				<div className='flex justify-between text-xs text-muted-foreground'>
					{isMonthsCoverage ? (
						<span>
							{formatCurrency(current)} saved
						</span>
					) : (
						<span>
							{formatCurrency(remaining)} remaining
						</span>
					)}
					{goal.deadline && (
						<span>
							Due{' '}
							{format(
								new Date(goal.deadline),
								'MMM d, yyyy'
							)}
						</span>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
