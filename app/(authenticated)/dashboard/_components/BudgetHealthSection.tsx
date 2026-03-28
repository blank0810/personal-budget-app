import { BudgetService } from '@/server/modules/budget/budget.service';
import { BudgetHealthSummary } from '@/components/modules/budget/BudgetHealthSummary';
import { startOfMonth } from 'date-fns';

interface BudgetHealthSectionProps {
	userId: string;
}

export async function BudgetHealthSection({ userId }: BudgetHealthSectionProps) {
	const currentMonth = startOfMonth(new Date());
	const budgetHealth = await BudgetService.getBudgetHealthSummary(userId, currentMonth);

	return <BudgetHealthSummary health={budgetHealth} month={currentMonth} />;
}
