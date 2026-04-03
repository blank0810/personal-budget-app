'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GoalForm } from './GoalForm';
import { GoalList } from './GoalList';
import type { GoalCardData } from './GoalCard';

interface GoalPageContainerProps {
	goals: GoalCardData[];
	accounts: Array<{ id: string; name: string }>;
	hasEmergencyFund: boolean;
}

export function GoalPageContainer({
	goals,
	accounts,
	hasEmergencyFund,
}: GoalPageContainerProps) {
	const router = useRouter();

	const handleSuccess = useCallback(() => {
		router.refresh();
	}, [router]);

	return (
		<div className='grid grid-cols-1 gap-8 lg:grid-cols-[350px_1fr]'>
			<div className='min-w-0 space-y-6'>
				<Card>
					<CardHeader>
						<CardTitle>New Goal</CardTitle>
					</CardHeader>
					<CardContent>
						<GoalForm
							accounts={accounts}
							hasEmergencyFund={hasEmergencyFund}
							onSuccess={handleSuccess}
						/>
					</CardContent>
				</Card>
			</div>
			<div className='min-w-0'>
				<Card>
					<CardHeader>
						<CardTitle>Your Goals</CardTitle>
					</CardHeader>
					<CardContent>
						<GoalList goals={goals} />
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
