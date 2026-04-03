'use client';

import { useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IncomeForm } from './IncomeForm';
import { IncomeViews } from './IncomeViews';
import { Account, Category, Income } from '@prisma/client';

interface MonthlyTotal {
	month: number;
	total: number;
	count: number;
}

type IncomeWithRelations = Income & {
	category: Category;
	account: Account | null;
};

interface IncomePageContainerProps {
	accounts: Account[];
	categories: Category[];
	hasEmergencyFundGoal: boolean;
	initialIncomes: IncomeWithRelations[];
	initialTotal: number;
	initialMonthlyTotals: MonthlyTotal[];
	initialYear: number;
	initialMonth: number;
}

export function IncomePageContainer({
	accounts,
	categories,
	hasEmergencyFundGoal,
	initialIncomes,
	initialTotal,
	initialMonthlyTotals,
	initialYear,
	initialMonth,
}: IncomePageContainerProps) {
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
						<CardTitle>Add Income</CardTitle>
					</CardHeader>
					<CardContent>
						<IncomeForm
							accounts={accounts}
							categories={categories}
							hasEmergencyFundGoal={hasEmergencyFundGoal}
							onSuccess={handleSuccess}
						/>
					</CardContent>
				</Card>
			</div>

			<div className='min-w-0 space-y-6'>
				<IncomeViews
					initialIncomes={initialIncomes}
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
