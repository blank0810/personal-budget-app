'use client';

import { useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import {
	ArrowDownLeft,
	ArrowUpRight,
	ArrowLeftRight,
	CreditCard,
	CircleDot,
	ChevronLeft,
	ChevronRight,
	MoreHorizontal,
	Trash2,
	ChevronUp,
	ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/lib/contexts/currency-context';
import { deleteIncomeAction } from '@/server/modules/income/income.controller';
import { deleteExpenseAction } from '@/server/modules/expense/expense.controller';
import { deleteTransferAction } from '@/server/modules/transfer/transfer.controller';
import type { LedgerRow, LedgerPage } from '@/server/modules/ledger/ledger.types';

// ---------------------------------------------------------------------------
// Type config (mirrors TransactionTable TYPE_CONFIG)
// ---------------------------------------------------------------------------

const TYPE_CONFIG = {
	income: {
		label: 'Income',
		icon: ArrowDownLeft,
		badge: 'bg-green-500/10 text-green-600 dark:text-green-400',
	},
	expense: {
		label: 'Expense',
		icon: ArrowUpRight,
		badge: 'bg-red-500/10 text-red-600 dark:text-red-400',
	},
	transfer: {
		label: 'Transfer',
		icon: ArrowLeftRight,
		badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
	},
	payment: {
		label: 'Payment',
		icon: CreditCard,
		badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
	},
	opening: {
		label: 'Opening',
		icon: CircleDot,
		badge: '',
	},
} as const;

// ---------------------------------------------------------------------------
// Amount color + sign helpers (mirrors AccountLedger lines 255–286)
// ---------------------------------------------------------------------------

function getAmountDisplay(
	row: LedgerRow
): { prefix: string; className: string } {
	if (row.kind === 'opening') {
		return { prefix: '', className: 'italic text-muted-foreground font-medium' };
	}

	if (row.kind === 'transfer') {
		// For the global ledger, a transfer row represents the from-account side
		// (assets moving). isPayment = paying down a liability (good).
		if (row.isPayment) {
			return { prefix: '-', className: 'text-orange-600 dark:text-orange-400 font-semibold' };
		}
		return { prefix: '-', className: 'text-blue-600 dark:text-blue-400 font-semibold' };
	}

	// income / expense rows — color based on whether account is a liability
	if (row.kind === 'income') {
		const good = !row.isLiabilityAccount;
		return {
			prefix: '+',
			className: cn(
				'font-semibold',
				good
					? 'text-green-600 dark:text-green-400'
					: 'text-red-600 dark:text-red-400'
			),
		};
	}

	// expense
	const good = row.isLiabilityAccount; // expense on liability = paying it down
	return {
		prefix: '-',
		className: cn(
			'font-semibold',
			good
				? 'text-green-600 dark:text-green-400'
				: 'text-red-600 dark:text-red-400'
		),
	};
}

// ---------------------------------------------------------------------------
// Row description
// ---------------------------------------------------------------------------

function getDescription(row: LedgerRow): React.ReactNode {
	if (row.kind === 'opening') {
		return (
			<span className='italic text-muted-foreground'>
				{row.description ?? `Opening balance — ${row.accountName}`}
			</span>
		);
	}
	return row.description ?? '—';
}

// ---------------------------------------------------------------------------
// Category / account subtitle
// ---------------------------------------------------------------------------

function getCategoryCell(row: LedgerRow): React.ReactNode {
	if (row.kind === 'income' || row.kind === 'expense') {
		return (
			<Badge variant='outline' className='text-[10px]'>
				{row.categoryName}
			</Badge>
		);
	}
	if (row.kind === 'transfer') {
		return (
			<span className='text-xs text-muted-foreground'>
				{row.fromAccountName} → {row.toAccountName}
			</span>
		);
	}
	return <span className='text-xs text-muted-foreground'>—</span>;
}

// ---------------------------------------------------------------------------
// Account cell
// ---------------------------------------------------------------------------

function getAccountCell(row: LedgerRow): React.ReactNode {
	if (row.kind === 'transfer') {
		const name = row.fromAccountName ?? '—';
		return <span className='text-sm text-muted-foreground'>{name}</span>;
	}
	if (!row.accountName) {
		return <span className='text-sm text-muted-foreground'>—</span>;
	}
	return (
		<span className='flex items-center gap-1.5 text-sm text-muted-foreground'>
			{row.accountName}
			{row.accountIsArchived && (
				<Badge variant='outline' className='text-xs'>
					archived
				</Badge>
			)}
		</span>
	);
}

// ---------------------------------------------------------------------------
// Type badge
// ---------------------------------------------------------------------------

function TypeBadge({ row }: { row: LedgerRow }) {
	if (row.kind === 'opening') {
		return (
			<Badge variant='outline' className='italic text-muted-foreground border-dashed text-[10px]'>
				OPENING
			</Badge>
		);
	}

	const key =
		row.kind === 'transfer' && row.isPayment ? 'payment' : row.kind;
	const config = TYPE_CONFIG[key];
	const Icon = config.icon;

	return (
		<div className='flex items-center gap-1.5'>
			<Badge
				variant='secondary'
				className={cn('text-[10px] font-medium', config.badge)}
			>
				<Icon className='mr-1 h-3 w-3' />
				{config.label}
			</Badge>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Row delete action
// ---------------------------------------------------------------------------

function LedgerRowDelete({ row }: { row: LedgerRow }) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	// Opening rows are synthetic — no delete action
	if (row.kind === 'opening') return null;

	const handleDelete = () => {
		startTransition(async () => {
			let result: { error?: string } | undefined;

			switch (row.kind) {
				case 'income':
					result = await deleteIncomeAction(row.id);
					break;
				case 'expense':
					result = await deleteExpenseAction(row.id);
					break;
				case 'transfer':
					result = await deleteTransferAction(row.id);
					break;
			}

			if (result?.error) {
				toast.error(result.error);
			} else {
				toast.success('Transaction deleted');
				router.refresh();
			}
		});
	};

	return (
		<AlertDialog>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant='ghost' size='icon' className='h-8 w-8'>
						<MoreHorizontal className='h-4 w-4' />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align='end'>
					<AlertDialogTrigger asChild>
						<DropdownMenuItem className='text-destructive'>
							<Trash2 className='mr-2 h-3.5 w-3.5' />
							Delete
						</DropdownMenuItem>
					</AlertDialogTrigger>
				</DropdownMenuContent>
			</DropdownMenu>

			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete transaction?</AlertDialogTitle>
					<AlertDialogDescription>
						This will reverse the balance changes. This action cannot be undone.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleDelete}
						disabled={isPending}
						className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
					>
						{isPending ? 'Deleting...' : 'Delete'}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

// ---------------------------------------------------------------------------
// Main table
// ---------------------------------------------------------------------------

interface LedgerTableProps {
	ledgerPage: LedgerPage;
}

export function LedgerTable({ ledgerPage }: LedgerTableProps) {
	const { formatCurrency } = useCurrency();
	const router = useRouter();
	const searchParams = useSearchParams();

	const { rows, total, page, pageSize } = ledgerPage;
	const totalPages = Math.ceil(total / pageSize);

	const goToPage = (p: number) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set('page', String(p));
		router.replace(`?${params.toString()}`, { scroll: false });
	};

	const changePageSize = (size: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set('pageSize', size);
		params.delete('page');
		router.replace(`?${params.toString()}`, { scroll: false });
	};

	if (rows.length === 0) {
		return (
			<div className='flex flex-col items-center justify-center py-16 text-center'>
				<p className='text-sm text-muted-foreground'>No transactions in this window.</p>
				<p className='mt-1 text-xs text-muted-foreground'>
					Try adjusting your date range or filters.
				</p>
			</div>
		);
	}

	return (
		<TooltipProvider>
			<div>
				<div className='overflow-x-auto rounded-md border'>
					<table className='w-full text-sm'>
						<thead>
							<tr className='border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground'>
								{/* Date — always visible */}
								<th className='px-4 py-3 whitespace-nowrap'>Date</th>
								{/* Type — hidden below sm */}
								<th className='px-4 py-3 hidden sm:table-cell'>Type</th>
								{/* Description — always visible */}
								<th className='px-4 py-3'>Description</th>
								{/* Account — hidden below md */}
								<th className='px-4 py-3 hidden md:table-cell'>Account</th>
								{/* Category — hidden below lg */}
								<th className='px-4 py-3 hidden lg:table-cell'>Category</th>
								{/* Amount — always visible */}
								<th className='px-4 py-3 text-right'>Amount</th>
								{/* Assets — hidden below lg */}
								<th className='px-4 py-3 text-right hidden lg:table-cell whitespace-nowrap'>
									Assets ↑
								</th>
								{/* Liabilities — hidden below lg */}
								<th className='px-4 py-3 text-right hidden lg:table-cell whitespace-nowrap'>
									Liabilities ↑
								</th>
								{/* Net Worth — hidden below sm, tooltip on larger */}
								<th className='px-4 py-3 text-right hidden sm:table-cell whitespace-nowrap'>
									<Tooltip>
										<TooltipTrigger asChild>
											<span className='cursor-default underline decoration-dotted'>
												Net Worth ↑
											</span>
										</TooltipTrigger>
										<TooltipContent side='top' className='max-w-[220px] text-center text-xs'>
											Reflects all transactions, not just filtered.
										</TooltipContent>
									</Tooltip>
								</th>
								{/* Actions */}
								<th className='px-4 py-3 w-10' />
							</tr>
						</thead>
						<tbody className='divide-y'>
							{rows.map((row) => {
								const { prefix, className: amountClass } = getAmountDisplay(row);
								const isOpening = row.kind === 'opening';

								// Net worth delta indicator
								const nwDelta = row.deltaAssets - row.deltaLiabilities;
								const NwIcon = nwDelta > 0 ? ChevronUp : nwDelta < 0 ? ChevronDown : null;

								return (
									<tr
										key={`${row.kind}:${row.id}`}
										className={cn(
											'group hover:bg-muted/30 transition-colors',
											isOpening && 'bg-muted/20'
										)}
									>
										{/* Date */}
										<td className='px-4 py-3 text-muted-foreground whitespace-nowrap text-xs'>
											{format(new Date(row.date), 'MMM d, yyyy')}
										</td>

										{/* Type */}
										<td className='px-4 py-3 hidden sm:table-cell'>
											<TypeBadge row={row} />
										</td>

										{/* Description */}
										<td className='px-4 py-3 max-w-[200px]'>
											<p className='truncate text-sm'>
												{getDescription(row)}
											</p>
										</td>

										{/* Account */}
										<td className='px-4 py-3 hidden md:table-cell'>
											{getAccountCell(row)}
										</td>

										{/* Category */}
										<td className='px-4 py-3 hidden lg:table-cell'>
											{getCategoryCell(row)}
										</td>

										{/* Amount */}
										<td className={cn('px-4 py-3 text-right tabular-nums', amountClass)}>
											{prefix}{formatCurrency(row.amount)}
										</td>

										{/* Assets running total */}
										<td className='px-4 py-3 text-right tabular-nums text-xs text-muted-foreground hidden lg:table-cell'>
											{formatCurrency(row.runningAssets)}
										</td>

										{/* Liabilities running total */}
										<td className='px-4 py-3 text-right tabular-nums text-xs text-muted-foreground hidden lg:table-cell'>
											{formatCurrency(row.runningLiabilities)}
										</td>

										{/* Net Worth running total */}
										<td className='px-4 py-3 text-right tabular-nums text-xs hidden sm:table-cell'>
											<span className={cn(
												'flex items-center justify-end gap-0.5',
												nwDelta > 0
													? 'text-green-600 dark:text-green-400'
													: nwDelta < 0
														? 'text-red-600 dark:text-red-400'
														: 'text-muted-foreground'
											)}>
												{NwIcon && <NwIcon className='h-3 w-3 shrink-0' />}
												{formatCurrency(row.runningNetWorth)}
											</span>
										</td>

										{/* Actions */}
										<td className='px-4 py-3'>
											<LedgerRowDelete row={row} />
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
						Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of{' '}
						{total} entries
					</p>
					<div className='flex items-center gap-2'>
						<Select value={String(pageSize)} onValueChange={changePageSize}>
							<SelectTrigger className='h-8 w-[75px] text-xs'>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='25'>25</SelectItem>
								<SelectItem value='50'>50</SelectItem>
								<SelectItem value='100'>100</SelectItem>
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
			</div>
		</TooltipProvider>
	);
}
