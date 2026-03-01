'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GoalCard, type GoalCardData } from './GoalCard';
import { GoalDetailDialog } from './GoalDetailDialog';

interface GoalListProps {
	goals: GoalCardData[];
}

export function GoalList({ goals }: GoalListProps) {
	const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

	const active = goals.filter((g) => g.status === 'ACTIVE');
	const completed = goals.filter((g) => g.status === 'COMPLETED');
	const archived = goals.filter((g) => g.status === 'ARCHIVED');

	const selectedGoal = goals.find((g) => g.id === selectedGoalId) || null;

	function renderGoals(items: GoalCardData[], emptyMessage: string) {
		if (items.length === 0) {
			return (
				<p className='text-muted-foreground text-center py-8'>
					{emptyMessage}
				</p>
			);
		}
		return (
			<div className='grid gap-4 sm:grid-cols-2'>
				{items.map((goal) => (
					<GoalCard
						key={goal.id}
						goal={goal}
						onClick={() => setSelectedGoalId(goal.id)}
					/>
				))}
			</div>
		);
	}

	return (
		<>
			<Tabs defaultValue='active'>
				<TabsList>
					<TabsTrigger value='active'>
						Active ({active.length})
					</TabsTrigger>
					<TabsTrigger value='completed'>
						Completed ({completed.length})
					</TabsTrigger>
					<TabsTrigger value='archived'>
						Archived ({archived.length})
					</TabsTrigger>
				</TabsList>
				<TabsContent value='active' className='mt-4'>
					{renderGoals(active, 'No active goals. Create one to get started.')}
				</TabsContent>
				<TabsContent value='completed' className='mt-4'>
					{renderGoals(completed, 'No completed goals yet.')}
				</TabsContent>
				<TabsContent value='archived' className='mt-4'>
					{renderGoals(archived, 'No archived goals.')}
				</TabsContent>
			</Tabs>

			<GoalDetailDialog
				goal={selectedGoal}
				onClose={() => setSelectedGoalId(null)}
			/>
		</>
	);
}
