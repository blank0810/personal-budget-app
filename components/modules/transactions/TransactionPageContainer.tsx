'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TransactionKPICards } from './TransactionKPICards';
import { TransactionFilters } from './TransactionFilters';
import { TransactionTable } from './TransactionTable';
import {
	getUnifiedTransactionsAction,
	getTransactionSummaryAction,
} from '@/server/modules/transaction/transaction.controller';
import type {
	UnifiedTransaction,
	TransactionSummary,
} from '@/server/modules/transaction/transaction.types';

interface TransactionPageContainerProps {
	initialTransactions: UnifiedTransaction[];
	initialTotal: number;
	initialSummary: TransactionSummary;
	categories: Array<{ id: string; name: string }>;
	accounts: Array<{ id: string; name: string }>;
}

export function TransactionPageContainer({
	initialTransactions,
	initialTotal,
	initialSummary,
	categories,
	accounts,
}: TransactionPageContainerProps) {
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const [transactions, setTransactions] =
		useState<UnifiedTransaction[]>(initialTransactions);
	const [total, setTotal] = useState(initialTotal);
	const [summary, setSummary] = useState(initialSummary);

	// Sync state when server re-renders with fresh data (e.g. after router.refresh())
	useEffect(() => {
		setTransactions(initialTransactions);
		setTotal(initialTotal);
		setSummary(initialSummary);
	}, [initialTransactions, initialTotal, initialSummary]);

	// Current filter/page state from URL
	const page = Number(searchParams.get('page') ?? '1');
	const pageSize = Number(searchParams.get('pageSize') ?? '10');
	const activeType = searchParams.get('type') ?? undefined;

	// Re-fetch transactions when URL params change
	const fetchTransactions = useCallback(() => {
		const filters: Record<string, string | undefined> = {
			type: searchParams.get('type') ?? undefined,
			categoryId: searchParams.get('categoryId') ?? undefined,
			accountId: searchParams.get('accountId') ?? undefined,
			search: searchParams.get('search') ?? undefined,
			source: searchParams.get('source') ?? undefined,
			amountMin: searchParams.get('amountMin') ?? undefined,
			amountMax: searchParams.get('amountMax') ?? undefined,
			startDate: searchParams.get('from') ?? undefined,
			endDate: searchParams.get('to') ?? undefined,
			page: searchParams.get('page') ?? '1',
			pageSize: searchParams.get('pageSize') ?? '10',
			sortBy: searchParams.get('sortBy') ?? 'date',
			sortOrder: searchParams.get('sortOrder') ?? 'desc',
		};

		// Remove undefined values
		const cleanFilters = Object.fromEntries(
			Object.entries(filters).filter(([, v]) => v !== undefined)
		);

		startTransition(async () => {
			const [result, summaryResult] = await Promise.all([
				getUnifiedTransactionsAction(cleanFilters),
				getTransactionSummaryAction({
					startDate: searchParams.get('from') ?? undefined,
					endDate: searchParams.get('to') ?? undefined,
				}),
			]);
			if (result.success) {
				setTransactions(result.data.data);
				setTotal(result.data.total);
			}
			if (summaryResult.success) {
				setSummary(summaryResult.data);
			}
		});
	}, [searchParams]);

	// Trigger re-fetch when search params change (skip initial render)
	const [isInitial, setIsInitial] = useState(true);
	useEffect(() => {
		if (isInitial) {
			setIsInitial(false);
			return;
		}
		fetchTransactions();
	}, [searchParams, fetchTransactions, isInitial]);

	return (
		<div className='space-y-6'>
			{/* KPI Cards */}
			<TransactionKPICards
				totalIncome={summary.totalIncome}
				totalExpenses={summary.totalExpenses}
				netFlow={summary.netFlow}
				averageAmount={summary.averageAmount}
				activeType={activeType}
			/>

			{/* Transaction History */}
			<Card>
				<CardHeader className='pb-3'>
					<CardTitle className='text-lg'>Transaction History</CardTitle>
					<p className='text-sm text-muted-foreground'>
						View, search, and filter all your transactions
					</p>
				</CardHeader>
				<CardContent className={isPending ? 'opacity-60 transition-opacity' : ''}>
					<TransactionFilters
						categories={categories}
						accounts={accounts}
					/>
					<div className='mt-4'>
						<TransactionTable
							transactions={transactions}
							total={total}
							page={page}
							pageSize={pageSize}
						/>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
