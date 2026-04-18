'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import {
	ArrowDownLeft,
	ArrowUpRight,
	ArrowLeftRight,
	CreditCard,
	ChevronLeft,
	ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/lib/contexts/currency-context';
import { TransactionRowActions } from './TransactionRowActions';
import { useTableSelection } from '@/components/common/useTableSelection';
import { BulkActionBar } from '@/components/common/BulkActionBar';
import {
	bulkDeleteTransactionsAction,
	bulkCategorizeTransactionsAction,
} from '@/server/modules/transaction/transaction.controller';
import type {
	UnifiedTransaction,
	BulkTransactionItem,
} from '@/server/modules/transaction/transaction.types';

interface TransactionTableProps {
	transactions: UnifiedTransaction[];
	total: number;
	page: number;
	pageSize: number;
	categories: Array<{ id: string; name: string; type: 'INCOME' | 'EXPENSE' }>;
	enableBulk: boolean;
}

const TYPE_CONFIG = {
	income: {
		label: 'Income',
		icon: ArrowDownLeft,
		badge: 'bg-green-500/10 text-green-600 dark:text-green-400',
		amountColor: 'text-green-600 dark:text-green-400',
		prefix: '+',
	},
	expense: {
		label: 'Expense',
		icon: ArrowUpRight,
		badge: 'bg-red-500/10 text-red-600 dark:text-red-400',
		amountColor: 'text-red-600 dark:text-red-400',
		prefix: '-',
	},
	transfer: {
		label: 'Transfer',
		icon: ArrowLeftRight,
		badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
		amountColor: 'text-blue-600 dark:text-blue-400',
		prefix: '-',
	},
	payment: {
		label: 'Payment',
		icon: CreditCard,
		badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
		amountColor: 'text-orange-600 dark:text-orange-400',
		prefix: '-',
	},
} as const;

function getTypeKey(tx: UnifiedTransaction): keyof typeof TYPE_CONFIG {
	if (tx.kind === 'transfer' && tx.isPayment) return 'payment';
	return tx.kind;
}

function getSubtitle(tx: UnifiedTransaction): string {
	switch (tx.kind) {
		case 'income':
			return tx.categoryName;
		case 'expense':
			return tx.categoryName;
		case 'transfer':
			return `${tx.fromAccountName} → ${tx.toAccountName}`;
	}
}

function getAccountName(tx: UnifiedTransaction): string {
	switch (tx.kind) {
		case 'income':
		case 'expense':
			return tx.accountName ?? '--';
		case 'transfer':
			return tx.fromAccountName;
	}
}

function getCategoryName(tx: UnifiedTransaction): string | null {
	switch (tx.kind) {
		case 'income':
		case 'expense':
			return tx.categoryName;
		case 'transfer':
			return null;
	}
}

function rowKey(tx: UnifiedTransaction): string {
	// kind+id uniquely identifies a row across tables.
	return `${tx.kind}:${tx.id}`;
}

export function TransactionTable({
	transactions,
	total,
	page,
	pageSize,
	categories,
	enableBulk,
}: TransactionTableProps) {
	const { formatCurrency } = useCurrency();
	const router = useRouter();
	const searchParams = useSearchParams();
	const selection = useTableSelection();
	const [isPending, startTransition] = useTransition();

	const [deleteOpen, setDeleteOpen] = useState(false);
	const [categorizeOpen, setCategorizeOpen] = useState(false);
	const [targetCategoryId, setTargetCategoryId] = useState<string>('');

	const totalPages = Math.ceil(total / pageSize);
	const visibleKeys = useMemo(
		() => transactions.map(rowKey),
		[transactions]
	);
	const selectedItems: BulkTransactionItem[] = useMemo(() => {
		const items: BulkTransactionItem[] = [];
		for (const tx of transactions) {
			if (!selection.isSelected(rowKey(tx))) continue;
			// `payment` shares the `transfer` Prisma table.
			const kind: BulkTransactionItem['kind'] =
				tx.kind === 'transfer' ? 'transfer' : tx.kind;
			items.push({ kind, id: tx.id });
		}
		return items;
	}, [transactions, selection]);

	const headerState = enableBulk ? selection.visibleState(visibleKeys) : 'none';

	const goToPage = (p: number) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set('page', String(p));
		router.push(`?${params.toString()}`, { scroll: false });
	};

	const changePageSize = (size: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set('pageSize', size);
		params.delete('page');
		router.push(`?${params.toString()}`, { scroll: false });
	};

	const handleBulkDelete = () => {
		if (selectedItems.length === 0) return;
		startTransition(async () => {
			const result = await bulkDeleteTransactionsAction({
				items: selectedItems,
			});
			setDeleteOpen(false);
			if ('error' in result && result.error) {
				toast.error(result.error);
				return;
			}
			if ('data' in result && result.data) {
				const { processedCount, skippedCount } = result.data;
				if (processedCount > 0) {
					toast.success(
						`Deleted ${processedCount} transaction${processedCount === 1 ? '' : 's'}` +
							(skippedCount > 0
								? ` (${skippedCount} skipped)`
								: '')
					);
				} else if (skippedCount > 0) {
					toast.warning(
						`All ${skippedCount} items were skipped — delete individually`
					);
				}
			}
			selection.clear();
			router.refresh();
		});
	};

	const handleBulkCategorize = () => {
		if (selectedItems.length === 0 || !targetCategoryId) return;
		startTransition(async () => {
			const result = await bulkCategorizeTransactionsAction({
				items: selectedItems,
				categoryId: targetCategoryId,
			});
			setCategorizeOpen(false);
			if ('error' in result && result.error) {
				toast.error(result.error);
				return;
			}
			if ('data' in result && result.data) {
				const { processedCount, skippedCount } = result.data;
				if (processedCount > 0) {
					toast.success(
						`Recategorized ${processedCount} transaction${processedCount === 1 ? '' : 's'}` +
							(skippedCount > 0
								? ` (${skippedCount} skipped)`
								: '')
					);
				} else if (skippedCount > 0) {
					toast.warning(
						`No eligible items — transfers have no category`
					);
				}
			}
			setTargetCategoryId('');
			selection.clear();
			router.refresh();
		});
	};

	// Count how many selected rows would be skipped by the defense filters
	// (tithe/EF incomes, fee-bearing transfers). Shown as an inline banner in
	// the action bar so users know before they click Delete.
	const skippedPreviewCount = useMemo(() => {
		let count = 0;
		for (const tx of transactions) {
			if (!selection.isSelected(rowKey(tx))) continue;
			if (tx.kind === 'transfer' && tx.fee > 0) count++;
			// Income with tithe/EF isn't discoverable from the unified row
			// payload today; server will report the accurate skipped count.
		}
		return count;
	}, [transactions, selection]);

	if (transactions.length === 0) {
		return (
			<div className='flex flex-col items-center justify-center py-16 text-center'>
				<p className='text-sm text-muted-foreground'>No transactions found</p>
				<p className='mt-1 text-xs text-muted-foreground'>
					Try adjusting your filters or add a new transaction.
				</p>
			</div>
		);
	}

	return (
		<div>
			{/* Table */}
			<div className='overflow-x-auto'>
				<table className='w-full'>
					<thead>
						<tr className='border-b text-left text-xs font-medium text-muted-foreground'>
							{enableBulk && (
								<th className='hidden pb-3 pr-2 sm:table-cell w-8'>
									<Checkbox
										aria-label='Select all visible'
										checked={
											headerState === 'all'
												? true
												: headerState === 'some'
													? 'indeterminate'
													: false
										}
										onCheckedChange={() =>
											selection.toggleAllVisible(visibleKeys)
										}
									/>
								</th>
							)}
							<th className='pb-3 pr-4'>Description</th>
							<th className='pb-3 pr-4'>Type</th>
							<th className='pb-3 pr-4 text-right'>Amount</th>
							<th className='pb-3 pr-4 hidden sm:table-cell'>Account</th>
							<th className='pb-3 pr-4 hidden md:table-cell'>Category</th>
							<th className='pb-3 pr-4 hidden lg:table-cell'>Date</th>
							<th className='pb-3 w-10'></th>
						</tr>
					</thead>
					<tbody className='divide-y'>
						{transactions.map((tx) => {
							const typeKey = getTypeKey(tx);
							const config = TYPE_CONFIG[typeKey];
							const Icon = config.icon;
							const subtitle = getSubtitle(tx);
							const account = getAccountName(tx);
							const category = getCategoryName(tx);
							const rk = rowKey(tx);
							const checked = selection.isSelected(rk);

							return (
								<tr
									key={rk}
									className={cn(
										'group',
										checked &&
											'bg-primary/5 dark:bg-primary/10'
									)}
								>
									{enableBulk && (
										<td className='hidden py-3 pr-2 sm:table-cell'>
											<Checkbox
												aria-label={`Select ${tx.description ?? config.label}`}
												checked={checked}
												onCheckedChange={() =>
													selection.toggle(rk)
												}
											/>
										</td>
									)}

									{/* Description */}
									<td className='py-3 pr-4'>
										<div className='flex items-center gap-3'>
											<span
												className={cn(
													'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
													typeKey === 'income'
														? 'bg-green-500/10'
														: typeKey === 'expense'
															? 'bg-red-500/10'
															: typeKey === 'payment'
																? 'bg-orange-500/10'
																: 'bg-blue-500/10'
												)}
											>
												<Icon
													className={cn('h-4 w-4', config.amountColor)}
												/>
											</span>
											<div className='min-w-0'>
												<p className='truncate text-sm font-medium'>
													{tx.description || config.label}
												</p>
												<p className='truncate text-xs text-muted-foreground'>
													{subtitle}
												</p>
											</div>
										</div>
									</td>

									{/* Type badge */}
									<td className='py-3 pr-4'>
										<Badge
											variant='secondary'
											className={cn('text-[10px] font-medium', config.badge)}
										>
											{config.label}
										</Badge>
									</td>

									{/* Amount */}
									<td
										className={cn(
											'py-3 pr-4 text-right text-sm font-semibold tabular-nums',
											config.amountColor
										)}
									>
										{config.prefix}
										{formatCurrency(tx.amount)}
									</td>

									{/* Account */}
									<td className='py-3 pr-4 text-sm text-muted-foreground hidden sm:table-cell'>
										{account}
									</td>

									{/* Category */}
									<td className='py-3 pr-4 hidden md:table-cell'>
										{category ? (
											<Badge variant='outline' className='text-[10px]'>
												{category}
											</Badge>
										) : (
											<span className='text-xs text-muted-foreground'>
												--
											</span>
										)}
									</td>

									{/* Date */}
									<td className='py-3 pr-4 text-sm text-muted-foreground hidden lg:table-cell'>
										{format(new Date(tx.date), 'MMM d, yyyy')}
									</td>

									{/* Actions */}
									<td className='py-3'>
										<TransactionRowActions transaction={tx} />
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{/* Pagination */}
			<div className='flex items-center justify-between border-t pt-4 mt-2'>
				<p className='text-xs text-muted-foreground'>
					Showing {(page - 1) * pageSize + 1} to{' '}
					{Math.min(page * pageSize, total)} of {total} transactions
				</p>
				<div className='flex items-center gap-2'>
					<Select
						value={String(pageSize)}
						onValueChange={changePageSize}
					>
						<SelectTrigger className='h-8 w-[70px] text-xs'>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='10'>10</SelectItem>
							<SelectItem value='25'>25</SelectItem>
							<SelectItem value='50'>50</SelectItem>
						</SelectContent>
					</Select>
					<div className='flex items-center gap-1'>
						<Button
							variant='outline'
							size='icon'
							className='h-8 w-8'
							onClick={() => goToPage(page - 1)}
							disabled={page <= 1}
						>
							<ChevronLeft className='h-4 w-4' />
						</Button>
						{Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
							const p = i + 1;
							return (
								<Button
									key={p}
									variant={p === page ? 'default' : 'outline'}
									size='icon'
									className='h-8 w-8 text-xs'
									onClick={() => goToPage(p)}
								>
									{p}
								</Button>
							);
						})}
						<Button
							variant='outline'
							size='icon'
							className='h-8 w-8'
							onClick={() => goToPage(page + 1)}
							disabled={page >= totalPages}
						>
							<ChevronRight className='h-4 w-4' />
						</Button>
					</div>
				</div>
			</div>

			{enableBulk && (
				<BulkActionBar
					count={selection.count}
					onClear={selection.clear}
					statusText={
						skippedPreviewCount > 0
							? `${skippedPreviewCount} fee-bearing transfer${skippedPreviewCount === 1 ? '' : 's'} will be skipped`
							: null
					}
					actions={[
						{
							label: 'Categorize',
							variant: 'outline',
							onClick: () => setCategorizeOpen(true),
							disabled: isPending,
						},
						{
							label: 'Delete',
							variant: 'destructive',
							onClick: () => setDeleteOpen(true),
							disabled: isPending,
						},
					]}
				/>
			)}

			<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Delete {selection.count} transaction
							{selection.count === 1 ? '' : 's'}?
						</AlertDialogTitle>
						<AlertDialogDescription>
							This will reverse all associated balance changes and
							cannot be undone. Rows linked to tithe / emergency-fund
							allocations and transfers with fees will be skipped —
							delete those individually.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isPending}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								handleBulkDelete();
							}}
							disabled={isPending}
							className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
						>
							{isPending ? 'Deleting...' : 'Delete'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<Dialog open={categorizeOpen} onOpenChange={setCategorizeOpen}>
				<DialogContent className='sm:max-w-[400px]'>
					<DialogHeader>
						<DialogTitle>
							Recategorize {selection.count} transaction
							{selection.count === 1 ? '' : 's'}
						</DialogTitle>
						<DialogDescription>
							Pick a new category. The category type must match the
							selected rows — mixing Income and Expense categories is
							not allowed. Transfers will be skipped.
						</DialogDescription>
					</DialogHeader>
					<div className='space-y-2 py-2'>
						<Select
							value={targetCategoryId}
							onValueChange={setTargetCategoryId}
						>
							<SelectTrigger>
								<SelectValue placeholder='Select a category' />
							</SelectTrigger>
							<SelectContent>
								{categories.map((c) => (
									<SelectItem key={c.id} value={c.id}>
										{c.name}
										<span className='ml-2 text-xs text-muted-foreground'>
											{c.type === 'INCOME' ? 'Income' : 'Expense'}
										</span>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<DialogFooter>
						<Button
							variant='ghost'
							onClick={() => setCategorizeOpen(false)}
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button
							onClick={handleBulkCategorize}
							disabled={isPending || !targetCategoryId}
						>
							{isPending ? 'Applying...' : 'Apply'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
