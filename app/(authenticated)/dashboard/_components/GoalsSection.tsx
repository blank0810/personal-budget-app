import { GoalService } from '@/server/modules/goal/goal.service';
import { GoalsDashboardWidget } from '@/components/modules/goal/GoalsDashboardWidget';
import type { GoalCardData } from '@/components/modules/goal/GoalCard';
import { serialize } from '@/lib/serialization';

interface GoalsSectionProps {
	userId: string;
}

export async function GoalsSection({ userId }: GoalsSectionProps) {
	const [goals, goalHealth] = await Promise.all([
		GoalService.getAll(userId),
		GoalService.getGoalHealthMetrics(userId),
	]);

	const serializedGoals = (serialize(goals) as GoalCardData[]).map((g) => {
		const metric = goalHealth.goals.find((m) => m.id === g.id);
		return {
			...g,
			monthsCoverage: metric ? metric.monthsCoverage : undefined,
			healthStatus: metric?.healthStatus ?? undefined,
		};
	});

	return <GoalsDashboardWidget goals={serializedGoals} />;
}
