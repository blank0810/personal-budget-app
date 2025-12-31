import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { BudgetService } from '@/server/modules/budget/budget.service';
import { CategoryService } from '@/server/modules/category/category.service';
import { BudgetLedger, BudgetWithName } from '@/components/modules/budget/BudgetLedger';
import { serialize } from '@/lib/serialization';

export default async function BudgetDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const session = await auth();
	if (!session?.user?.id) {
		redirect('/api/auth/signin');
	}

	const { id } = await params;
	const userId = session.user.id;

	const data = await BudgetService.getBudgetWithExpenses(userId, id);
	if (!data) {
		notFound();
	}

	const categories = await CategoryService.getCategories(userId, 'EXPENSE');

	return (
		<div className='container mx-auto py-10'>
			<BudgetLedger
				budget={serialize(data.budget) as BudgetWithName}
				expenses={serialize(data.expenses)}
				metrics={data.metrics}
				categories={serialize(categories)}
			/>
		</div>
	);
}
