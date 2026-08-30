import { AccountService } from '@/server/modules/account/account.service';
import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { AccountLedger } from '@/components/modules/account/AccountLedger';
import { serialize } from '@/lib/serialization';
import { CategoryService } from '@/server/modules/category/category.service';
import { BudgetService } from '@/server/modules/budget/budget.service';

interface PageProps {
	params: Promise<{ id: string }>;
}

export default async function AccountLedgerPage({ params }: PageProps) {
	const session = await auth();
	if (!session?.user?.id) {
		redirect('/api/auth/signin');
	}

	const { id } = await params;
	const userId = session.user.id;
	const [accountData, incomeCategories, expenseCategories, budgets] =
		await Promise.all([
			AccountService.getAccountWithTransactions(userId, id),
			CategoryService.getCategories(userId, 'INCOME'),
			CategoryService.getCategories(userId, 'EXPENSE'),
			BudgetService.getBudgetOptions(userId, new Date()),
		]);

	if (!accountData) {
		notFound();
	}

	return (
		<div className='container mx-auto py-10'>
			<AccountLedger
				account={serialize(accountData)}
				transactions={serialize(accountData.transactions)}
				incomeCategories={incomeCategories.map((category) => ({
					id: category.id,
					name: category.name,
				}))}
				expenseCategories={expenseCategories.map((category) => ({
					id: category.id,
					name: category.name,
				}))}
				budgets={budgets.map(({ category, ...budget }) => ({
					...budget,
					categoryName: category.name,
				}))}
			/>
		</div>
	);
}
