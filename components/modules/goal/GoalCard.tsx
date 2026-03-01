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

export interface GoalCardData {
	id: string;
	name: string;
	targetAmount: number | { toNumber(): number };
	currentAmount: number | { toNumber(): number };
	deadline: string | Date | null;
	icon: string | null;
	color: string | null;
	status: string;
	linkedAccount: { id: string; name: string } | null;
	_count: { contributions: number };
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
	const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
	const remaining = Math.max(target - current, 0);

	const IconComponent = ICON_MAP[goal.icon || 'target'] || Target;
	const colorClass = COLOR_MAP[goal.color || 'blue'] || COLOR_MAP.blue;

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
					<p className='text-sm font-medium truncate'>{goal.name}</p>
					<Progress
						value={percentage}
						className='h-1.5 mt-1'
					/>
				</div>
				<span className='text-xs text-muted-foreground whitespace-nowrap'>
					{percentage.toFixed(0)}%
				</span>
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
							<h3 className='font-semibold text-sm'>
								{goal.name}
							</h3>
							{goal.linkedAccount && (
								<p className='text-xs text-muted-foreground'>
									Linked to {goal.linkedAccount.name}
								</p>
							)}
						</div>
					</div>
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

				<div className='space-y-1.5'>
					<div className='flex justify-between text-sm'>
						<span className='text-muted-foreground'>
							{formatCurrency(current)} of{' '}
							{formatCurrency(target)}
						</span>
						<span className='font-medium'>
							{percentage.toFixed(0)}%
						</span>
					</div>
					<Progress value={percentage} className='h-2' />
				</div>

				<div className='flex justify-between text-xs text-muted-foreground'>
					<span>
						{formatCurrency(remaining)} remaining
					</span>
					{goal.deadline && (
						<span>
							Due {format(new Date(goal.deadline), 'MMM d, yyyy')}
						</span>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
