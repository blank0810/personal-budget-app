'use client';

import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/lib/contexts/currency-context';

interface Transaction {
	id: string;
	type: 'INCOME' | 'EXPENSE';
	description: string;
	amount: number;
	category: string;
	date: string;
	accountName: string;
}

interface RecentTransactionsProps {
	transactions: Transaction[];
}

function getDateLabel(dateStr: string): string {
	const date = new Date(dateStr);
	const today = new Date();
	const yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);

	if (date.toDateString() === today.toDateString()) return 'Today';
	if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupByDate(transactions: Transaction[]): Map<string, Transaction[]> {
	const groups = new Map<string, Transaction[]>();
	for (const tx of transactions) {
		const label = getDateLabel(tx.date);
		const existing = groups.get(label) ?? [];
		existing.push(tx);
		groups.set(label, existing);
	}
	return groups;
}

export function RecentTransactions({
	transactions,
}: RecentTransactionsProps) {
	const { formatCurrency } = useCurrency();
	const grouped = groupByDate(transactions);

	return (
		<Card className='animate-fade-up h-full'>
			<CardHeader className='flex flex-row items-center justify-between pb-3'>
				<CardTitle className='text-base font-semibold'>Transactions</CardTitle>
				<Link
					href='/expense'
					className='text-xs text-muted-foreground hover:text-primary transition-colors'
				>
					Show more
				</Link>
			</CardHeader>
			<CardContent className='px-4 pb-4'>
				{transactions.length === 0 ? (
					<p className='py-8 text-center text-sm text-muted-foreground'>
						No recent transactions
					</p>
				) : (
					<div className='space-y-5'>
						{Array.from(grouped.entries()).map(([dateLabel, txs]) => (
							<div key={dateLabel}>
								<p className='mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider'>
									{dateLabel}
								</p>
								<div className='space-y-3'>
									{txs.map((tx) => {
										const isIncome = tx.type === 'INCOME';
										return (
											<div
												key={tx.id}
												className='flex items-center gap-3'
											>
												<div
													className={cn(
														'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
														isIncome
															? 'bg-green-100 dark:bg-green-950'
															: 'bg-red-100 dark:bg-red-950'
													)}
												>
													{isIncome ? (
														<ArrowDownLeft className='h-4 w-4 text-green-600 dark:text-green-400' />
													) : (
														<ArrowUpRight className='h-4 w-4 text-red-600 dark:text-red-400' />
													)}
												</div>
												<div className='min-w-0 flex-1'>
													<p className='truncate text-sm font-medium leading-none'>
														{tx.description || tx.category}
													</p>
													<p className='mt-0.5 truncate text-xs text-muted-foreground'>
														{tx.category} &bull; {tx.accountName}
													</p>
												</div>
												<span
													className={cn(
														'shrink-0 text-sm font-semibold tabular-nums',
														isIncome
															? 'text-green-600 dark:text-green-400'
															: 'text-red-600 dark:text-red-400'
													)}
												>
													{isIncome ? '+' : '-'}
													{formatCurrency(tx.amount)}
												</span>
											</div>
										);
									})}
								</div>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
