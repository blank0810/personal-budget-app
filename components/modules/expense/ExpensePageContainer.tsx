'use client';

import { useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExpenseForm } from './ExpenseForm';
import { ExpenseViews } from './ExpenseViews';
import { Account, Category, Budget, Expense } from '@prisma/client';

interface MonthlyTotal {
	month: number;
	total: number;
	count: number;
}

type BudgetWithCategory = Budget & {
	category: Category;
	spent: number;
	remaining: number;
	percentage: number;
};

type ExpenseWithRelations = Expense & {
	category: Category;
	account: Account | null;
	budget: Budget | null;
};

interface ExpensePageContainerProps {
	accounts: Account[];
	categories: Category[];
	budgets: BudgetWithCategory[];
	initialExpenses: ExpenseWithRelations[];
	initialTotal: number;
	initialMonthlyTotals: MonthlyTotal[];
	initialYear: number;
	initialMonth: number;
}

export function ExpensePageContainer({
	accounts,
	categories,
	budgets,
	initialExpenses,
	initialTotal,
	initialMonthlyTotals,
	initialYear,
	initialMonth,
}: ExpensePageContainerProps) {
	const refreshRef = useRef<(() => void) | null>(null);

	const handleRefreshReady = useCallback((refresh: () => void) => {
		refreshRef.current = refresh;
	}, []);

	const handleSuccess = useCallback(() => {
		refreshRef.current?.();
	}, []);

	return (
		<div className='grid grid-cols-1 gap-8 lg:grid-cols-[350px_1fr]'>
			<div className='min-w-0 space-y-6'>
				<Card>
					<CardHeader>
						<CardTitle>Add Expense</CardTitle>
					</CardHeader>
					<CardContent>
						<ExpenseForm
							accounts={accounts}
							categories={categories}
							budgets={budgets}
							onSuccess={handleSuccess}
						/>
					</CardContent>
				</Card>
			</div>

			<div className='min-w-0 space-y-6'>
				<ExpenseViews
					initialExpenses={initialExpenses}
					initialTotal={initialTotal}
					initialMonthlyTotals={initialMonthlyTotals}
					initialYear={initialYear}
					initialMonth={initialMonth}
					onRefreshReady={handleRefreshReady}
				/>
			</div>
		</div>
	);
}
