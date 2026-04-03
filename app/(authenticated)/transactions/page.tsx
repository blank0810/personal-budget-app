import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { startOfMonth, endOfMonth } from 'date-fns';
import { TransactionSource } from '@prisma/client';
import { TransactionService } from '@/server/modules/transaction/transaction.service';
import { AccountService } from '@/server/modules/account/account.service';
import { CategoryService } from '@/server/modules/category/category.service';
import { BudgetService } from '@/server/modules/budget/budget.service';
import { QuickActionProvider } from '@/components/modules/dashboard/QuickActionSheet';
import { TransactionPageContainer } from '@/components/modules/transactions/TransactionPageContainer';

export default async function TransactionsPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | undefined>>;
}) {
	const session = await auth();
	if (!session?.user?.id) {
		redirect('/api/auth/signin');
	}

	const userId = session.user.id;
	const params = await searchParams;

	// Default date range: current month
	const now = new Date();
	const startDate = params.from ? new Date(params.from) : startOfMonth(now);
	const endDate = params.to ? new Date(params.to) : endOfMonth(now);

	// Build filter object from search params
	const filters = {
		type: params.type as 'income' | 'expense' | 'transfer' | 'payment' | undefined,
		categoryId: params.categoryId,
		accountId: params.accountId,
		search: params.search,
		source: params.source as TransactionSource | undefined,
		amountMin: params.amountMin ? Number(params.amountMin) : undefined,
		amountMax: params.amountMax ? Number(params.amountMax) : undefined,
		startDate,
		endDate,
		page: params.page ? Number(params.page) : 1,
		pageSize: params.pageSize ? Number(params.pageSize) : 10,
		sortBy: (params.sortBy as 'date' | 'amount' | 'description') ?? 'date',
		sortOrder: (params.sortOrder as 'asc' | 'desc') ?? 'desc',
	};

	// Fetch all data in parallel
	const [transactionsResult, summary, accounts, incomeCategories, expenseCategories, budgets] =
		await Promise.all([
			TransactionService.getUnifiedTransactions(userId, filters),
			TransactionService.getTransactionSummary(userId, startDate, endDate),
			AccountService.getAccounts(userId),
			CategoryService.getCategories(userId, 'INCOME'),
			CategoryService.getCategories(userId, 'EXPENSE'),
			BudgetService.getBudgets(userId, { month: now }),
		]);

	// Map accounts for QuickActionProvider
	const accountOptions = accounts.map((a) => ({
		id: a.id,
		name: a.name,
		type: a.type,
		balance: Number(a.balance),
		isLiability: a.isLiability,
	}));

	const categoryOptions = [
		...incomeCategories.map((c) => ({ id: c.id, name: c.name })),
		...expenseCategories.map((c) => ({ id: c.id, name: c.name })),
	];

	// Deduplicate categories by id for the filter panel
	const uniqueCategories = Array.from(
		new Map(categoryOptions.map((c) => [c.id, c])).values()
	);

	const accountFilterOptions = accounts.map((a) => ({
		id: a.id,
		name: a.name,
	}));

	return (
		<QuickActionProvider
			accounts={accountOptions}
			incomeCategories={incomeCategories.map((c) => ({
				id: c.id,
				name: c.name,
			}))}
			expenseCategories={expenseCategories.map((c) => ({
				id: c.id,
				name: c.name,
			}))}
			budgets={budgets.map((b) => ({
				id: b.id,
				name: b.name,
				categoryId: b.categoryId,
				categoryName: b.category.name,
			}))}
		>
			<div className='container mx-auto py-6 md:py-10 space-y-6'>
				<div>
					<h1 className='text-2xl font-bold tracking-tight sm:text-3xl'>
						Transactions
					</h1>
					<p className='text-sm text-muted-foreground'>
						View and manage your transaction history
					</p>
				</div>

				<TransactionPageContainer
					initialTransactions={transactionsResult.data}
					initialTotal={transactionsResult.total}
					initialSummary={summary}
					categories={uniqueCategories}
					accounts={accountFilterOptions}
				/>
			</div>
		</QuickActionProvider>
	);
}
