'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GoalCard, type GoalCardData } from './GoalCard';
import { Target } from 'lucide-react';
import Link from 'next/link';

interface GoalsDashboardWidgetProps {
	goals: GoalCardData[];
}

export function GoalsDashboardWidget({ goals }: GoalsDashboardWidgetProps) {
	const activeGoals = goals.filter((g) => g.status === 'ACTIVE');

	if (activeGoals.length === 0) return null;

	// Show top 3 active goals
	const topGoals = activeGoals.slice(0, 3);

	return (
		<Card>
			<CardHeader className='flex flex-row items-center justify-between'>
				<CardTitle className='flex items-center gap-2'>
					<Target className='h-5 w-5 text-primary' />
					Savings Goals
				</CardTitle>
				<Link
					href='/goals'
					className='text-xs text-primary hover:underline'
				>
					View all ({activeGoals.length}) →
				</Link>
			</CardHeader>
			<CardContent>
				<div className='space-y-1'>
					{topGoals.map((goal) => (
						<GoalCard key={goal.id} goal={goal} compact />
					))}
				</div>
			</CardContent>
		</Card>
	);
}
