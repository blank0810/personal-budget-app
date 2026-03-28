import { ExpenseForm } from '@/components/modules/expense/ExpenseForm';
import { ExpenseViews } from '@/components/modules/expense/ExpenseViews';
import { ExpenseService } from '@/server/modules/expense/expense.service';
import { AccountService } from '@/server/modules/account/account.service';
import { CategoryService } from '@/server/modules/category/category.service';
import { BudgetService } from '@/server/modules/budget/budget.service';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

			<div className='grid grid-cols-1 gap-8 lg:grid-cols-[350px_1fr]'>
				<div className='min-w-0 space-y-6'>
					<Card>
						<CardHeader>
							<CardTitle>Add Expense</CardTitle>
						</CardHeader>
						<CardContent>
							<ExpenseForm
								accounts={serialize(accounts)}
								categories={serialize(categories)}
								budgets={serialize(budgets)}
							/>
						</CardContent>
					</Card>
				</div>

				<div className='min-w-0 space-y-6'>
					<ExpenseViews
						initialExpenses={serialize(initialResult.data)}
						initialTotal={initialResult.total}
						initialMonthlyTotals={monthlyTotals}
						initialYear={now.getFullYear()}
						initialMonth={now.getMonth()}
					/>
				</div>
			</div>
		</div>
	);
}
