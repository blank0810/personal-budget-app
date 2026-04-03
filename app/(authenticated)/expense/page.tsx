import { ExpensePageContainer } from '@/components/modules/expense/ExpensePageContainer';
import { ExpenseService } from '@/server/modules/expense/expense.service';
import { AccountService } from '@/server/modules/account/account.service';
import { CategoryService } from '@/server/modules/category/category.service';
import { BudgetService } from '@/server/modules/budget/budget.service';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { serialize } from '@/lib/serialization';
import { startOfMonth, endOfMonth } from 'date-fns';

export default async function ExpensePage() {
	const session = await auth();
	if (!session?.user?.id) {
		redirect('/api/auth/signin');
	}

	const now = new Date();
	const monthStart = startOfMonth(now);
	const monthEnd = endOfMonth(now);

	const [initialResult, accounts, categories, budgets, monthlyTotals] =
		await Promise.all([
			ExpenseService.getPaginatedExpenses(session.user.id, {
				page: 1,
				pageSize: 20,
				sortBy: 'date',
				sortOrder: 'desc',
				startDate: monthStart,
				endDate: monthEnd,
			}),
			AccountService.getAccounts(session.user.id),
			CategoryService.getCategories(session.user.id, 'EXPENSE'),
			BudgetService.getBudgets(session.user.id),
			ExpenseService.getMonthlyTotals(session.user.id, now.getFullYear()),
		]);

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-8'>
			<div className='flex justify-between items-center'>
				<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>Expenses</h1>
			</div>

			<ExpensePageContainer
				accounts={serialize(accounts)}
				categories={serialize(categories)}
				budgets={serialize(budgets)}
				initialExpenses={serialize(initialResult.data)}
				initialTotal={initialResult.total}
				initialMonthlyTotals={monthlyTotals}
				initialYear={now.getFullYear()}
				initialMonth={now.getMonth()}
			/>
		</div>
	);
}
