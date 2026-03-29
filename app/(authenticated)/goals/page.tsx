import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { requireFeature } from '@/lib/feature-gate';
import { GoalService } from '@/server/modules/goal/goal.service';
import { AccountService } from '@/server/modules/account/account.service';
import { GoalForm } from '@/components/modules/goal/GoalForm';
import { GoalList } from '@/components/modules/goal/GoalList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { serialize } from '@/lib/serialization';
import type { GoalCardData } from '@/components/modules/goal/GoalCard';

export default async function GoalsPage() {
	await requireFeature('goals');
	const session = await auth();
	if (!session?.user?.id) redirect('/login');

	// Sync linked account balances before displaying
	await GoalService.syncLinkedAccounts(session.user.id);

	const [goals, accounts, goalHealth] = await Promise.all([
		GoalService.getAll(session.user.id),
		AccountService.getAccounts(session.user.id),
		GoalService.getGoalHealthMetrics(session.user.id),
	]);

	const hasEmergencyFund = goals.some(
		(g) => g.isEmergencyFund && g.status === 'ACTIVE'
	);

	// Enrich goals with health metrics
	const enrichedGoals = (serialize(goals) as GoalCardData[]).map((g) => {
		const metric = goalHealth.goals.find((m) => m.id === g.id);
		return {
			...g,
			monthsCoverage: metric ? metric.monthsCoverage : undefined,
			healthStatus: metric?.healthStatus ?? undefined,
		};
	});

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-8'>
			<div className='flex justify-between items-center'>
				<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
					Savings Goals
				</h1>
			</div>

			<div className='grid grid-cols-1 gap-8 lg:grid-cols-[350px_1fr]'>
				<div className='min-w-0 space-y-6'>
					<Card>
						<CardHeader>
							<CardTitle>New Goal</CardTitle>
						</CardHeader>
						<CardContent>
							<GoalForm
								accounts={serialize(accounts).map(
									(a: { id: string; name: string }) => ({
										id: a.id,
										name: a.name,
									})
								)}
								hasEmergencyFund={hasEmergencyFund}
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
							<GoalList goals={enrichedGoals} />
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
