import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { requireFeature } from '@/lib/feature-gate';
import { GoalService } from '@/server/modules/goal/goal.service';
import { AccountService } from '@/server/modules/account/account.service';
import { GoalPageContainer } from '@/components/modules/goal/GoalPageContainer';
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

	const serializedAccounts = serialize(accounts).map(
		(a: { id: string; name: string }) => ({
			id: a.id,
			name: a.name,
		})
	);

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-8'>
			<div className='flex justify-between items-center'>
				<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
					Savings Goals
				</h1>
			</div>

			<GoalPageContainer
				goals={enrichedGoals}
				accounts={serializedAccounts}
				hasEmergencyFund={hasEmergencyFund}
			/>
		</div>
	);
}
