'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RecurringForm } from './RecurringForm';
import { RecurringList } from './RecurringList';

interface Budget {
	id: string;
	name: string;
	categoryId: string;
	amount: number;
}

interface RecurringItem {
	id: string;
	name: string;
	type: string;
	amount: number | { toNumber(): number };
	description?: string | null;
	frequency: string;
	startDate: string | Date;
	endDate?: string | Date | null;
	categoryId: string;
	accountId: string;
	budgetId?: string | null;
	nextRunDate: string | Date;
	lastRunDate: string | Date | null;
	isActive: boolean;
	category: { name: string };
	account: { name: string } | null;
}

interface RecurringPageContainerProps {
	items: RecurringItem[];
	categories: Array<{ id: string; name: string; type: string }>;
	accounts: Array<{ id: string; name: string; type: string }>;
	budgets: Budget[];
}

export function RecurringPageContainer({
	items,
	categories,
	accounts,
	budgets,
}: RecurringPageContainerProps) {
	const router = useRouter();

	const handleSuccess = useCallback(() => {
		router.refresh();
	}, [router]);

	return (
		<div className='grid grid-cols-1 gap-8 lg:grid-cols-[350px_1fr]'>
			<div className='min-w-0 space-y-6'>
				<Card>
					<CardHeader>
						<CardTitle>New Recurring</CardTitle>
					</CardHeader>
					<CardContent>
						<RecurringForm
							categories={categories}
							accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
							budgets={budgets}
							onSuccess={handleSuccess}
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
							items={items}
							categories={categories}
							accounts={accounts}
							budgets={budgets}
						/>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
