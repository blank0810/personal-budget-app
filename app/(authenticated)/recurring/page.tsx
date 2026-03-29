import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { requireFeature } from '@/lib/feature-gate';
import { RecurringService } from '@/server/modules/recurring/recurring.service';
import { AccountService } from '@/server/modules/account/account.service';
import { CategoryService } from '@/server/modules/category/category.service';
import { BudgetService } from '@/server/modules/budget/budget.service';
import { RecurringForm } from '@/components/modules/recurring/RecurringForm';
import { RecurringList } from '@/components/modules/recurring/RecurringList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { serialize } from '@/lib/serialization';
import { startOfMonth } from 'date-fns';

export default async function RecurringPage() {
	await requireFeature('recurring_transactions');
	const session = await auth();
	if (!session?.user?.id) redirect('/login');

	const [recurring, accounts, incomeCategories, expenseCategories, budgets] =
		await Promise.all([
			RecurringService.getAll(session.user.id),
			AccountService.getAccounts(session.user.id),
			CategoryService.getCategories(session.user.id, 'INCOME'),
			CategoryService.getCategories(session.user.id, 'EXPENSE'),
			BudgetService.getBudgets(session.user.id, {
				month: startOfMonth(new Date()),
			}),
		]);

	const allCategories = [
		...incomeCategories.map((c) => ({
			id: c.id,
			name: c.name,
			type: 'INCOME',
		})),
		...expenseCategories.map((c) => ({
			id: c.id,
			name: c.name,
			type: 'EXPENSE',
		})),
	];

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const serializedBudgets = serialize(budgets).map((b: any) => ({
		id: b.id as string,
		name: b.name as string,
		categoryId: b.categoryId as string,
		amount: b.amount as number,
	}));

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-8'>
			<div className='flex justify-between items-center'>
				<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
					Recurring Transactions
				</h1>
			</div>

			<div className='grid grid-cols-1 gap-8 lg:grid-cols-[350px_1fr]'>
				<div className='min-w-0 space-y-6'>
					<Card>
						<CardHeader>
							<CardTitle>New Recurring</CardTitle>
						</CardHeader>
						<CardContent>
							<RecurringForm
								categories={allCategories}
								accounts={serialize(accounts).map(
									(a: { id: string; name: string }) => ({
										id: a.id,
										name: a.name,
									})
								)}
								budgets={serializedBudgets}
							/>
						</CardContent>
					</Card>
				</div>
				<div className='min-w-0'>
					<Card>
						<CardHeader>
							<CardTitle>All Recurring Transactions</CardTitle>
						</CardHeader>
						<CardContent>
							<RecurringList
							items={serialize(recurring)}
							categories={allCategories}
							accounts={serialize(accounts).map(
								(a: {
									id: string;
									name: string;
									type: string;
								}) => ({
									id: a.id,
									name: a.name,
									type: a.type,
								})
							)}
							budgets={serializedBudgets}
						/>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
