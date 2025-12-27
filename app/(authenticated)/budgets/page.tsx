import { BudgetForm } from '@/components/modules/budget/BudgetForm';
import { BudgetViews } from '@/components/modules/budget/BudgetViews';
import { BudgetService } from '@/server/modules/budget/budget.service';
import { CategoryService } from '@/server/modules/category/category.service';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { serialize } from '@/lib/serialization';

export default async function BudgetsPage() {
	const session = await auth();
	if (!session?.user?.id) {
		redirect('/api/auth/signin');
	}

	const [budgets, categories] = await Promise.all([
		BudgetService.getBudgets(session.user.id),
		CategoryService.getCategories(session.user.id, 'EXPENSE'),
	]);

	return (
		<div className='container mx-auto py-10 space-y-8'>
			<div className='flex justify-between items-center'>
				<h1 className='text-3xl font-bold tracking-tight'>Budgets</h1>
			</div>

			<div className='grid gap-8 md:grid-cols-[350px_1fr]'>
				<div className='space-y-6'>
					<Card>
						<CardHeader>
							<CardTitle>Set Budget</CardTitle>
						</CardHeader>
						<CardContent>
							<BudgetForm categories={serialize(categories)} />
						</CardContent>
					</Card>
				</div>

				<div className='space-y-6'>
					<BudgetViews budgets={serialize(budgets)} />
				</div>
			</div>
		</div>
	);
}
