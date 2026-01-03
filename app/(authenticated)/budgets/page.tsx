import { BudgetForm } from '@/components/modules/budget/BudgetForm';
import { BudgetViews } from '@/components/modules/budget/BudgetViews';
import { BudgetService } from '@/server/modules/budget/budget.service';
import { CategoryService } from '@/server/modules/category/category.service';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { serialize } from '@/lib/serialization';
import { startOfMonth } from 'date-fns';

export default async function BudgetsPage() {
	const session = await auth();
	if (!session?.user?.id) {
		redirect('/api/auth/signin');
	}

	// Get stable current month (first day) to avoid hydration mismatch
	const currentMonth = startOfMonth(new Date());

	const [budgets, categories] = await Promise.all([
		BudgetService.getBudgets(session.user.id),
		CategoryService.getCategories(session.user.id, 'EXPENSE'),
	]);

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-8'>
			<div className='flex justify-between items-center'>
				<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>Budgets</h1>
			</div>

			<div className='grid grid-cols-1 gap-8 lg:grid-cols-[350px_1fr]'>
				<div className='min-w-0 space-y-6'>
					<Card>
						<CardHeader>
							<CardTitle>Set Budget</CardTitle>
						</CardHeader>
						<CardContent>
							<BudgetForm categories={serialize(categories)} />
						</CardContent>
					</Card>
				</div>

				<div className='min-w-0 space-y-6'>
					<BudgetViews
						budgets={serialize(budgets)}
						initialMonth={currentMonth}
					/>
				</div>
			</div>
		</div>
	);
}
