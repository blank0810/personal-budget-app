# Unified Transactions Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a single `/transactions` page that unifies Income, Expenses, Transfers, and Payments into one filterable, paginated view with KPI summary cards.

**Architecture:** New `transaction` module (types, service, controller) queries the 3 existing tables (incomes, expenses, transfers) in parallel, merges results into a discriminated union, and paginates in memory. Frontend uses URL search params for all filter state. QuickActionSheet is reused for creating transactions.

**Tech Stack:** Next.js 15 App Router, React 19, Prisma ORM, Zod, shadcn/ui, Tailwind CSS 4, date-fns, lucide-react

**Design doc:** `docs/plans/2026-04-04-unified-transactions-page-design.md`

---

## Task 1: Backend Types

**Files:**
- Create: `server/modules/transaction/transaction.types.ts`

**Step 1: Create the types file**

This file defines the `UnifiedTransaction` discriminated union, filter schema, and summary types. Follow the pattern from `server/modules/income/income.types.ts`.

```ts
import { z } from 'zod';
import { TransactionSource } from '@prisma/client';

// ---------------------------------------------------------------------------
// Unified Transaction — discriminated union returned by the service
// ---------------------------------------------------------------------------

export type UnifiedTransaction =
	| {
			kind: 'income';
			id: string;
			amount: number;
			date: string; // ISO string (serialized)
			description: string | null;
			accountName: string | null;
			categoryName: string;
			source: TransactionSource;
	  }
	| {
			kind: 'expense';
			id: string;
			amount: number;
			date: string;
			description: string | null;
			accountName: string | null;
			categoryName: string;
			budgetName: string | null;
			source: TransactionSource;
	  }
	| {
			kind: 'transfer';
			id: string;
			amount: number;
			date: string;
			description: string | null;
			fromAccountName: string;
			toAccountName: string;
			fee: number;
			isPayment: boolean;
	  };

// ---------------------------------------------------------------------------
// Filter / pagination input — validated in the controller
// ---------------------------------------------------------------------------

export const transactionFilterSchema = z.object({
	type: z.enum(['income', 'expense', 'transfer', 'payment']).optional(),
	categoryId: z.string().optional(),
	accountId: z.string().optional(),
	search: z.string().optional(),
	source: z.nativeEnum(TransactionSource).optional(),
	amountMin: z.coerce.number().optional(),
	amountMax: z.coerce.number().optional(),
	startDate: z.coerce.date().optional(),
	endDate: z.coerce.date().optional(),
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(100).default(10),
	sortBy: z.enum(['date', 'amount', 'description']).default('date'),
	sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type TransactionFilterInput = z.infer<typeof transactionFilterSchema>;

// ---------------------------------------------------------------------------
// Summary — KPI card data
// ---------------------------------------------------------------------------

export interface TransactionSummary {
	totalIncome: number;
	totalExpenses: number;
	netFlow: number;
	averageAmount: number;
	transactionCount: number;
}

// ---------------------------------------------------------------------------
// Paginated response
// ---------------------------------------------------------------------------

export interface PaginatedTransactions {
	data: UnifiedTransaction[];
	total: number;
	page: number;
	pageSize: number;
}
```

**Step 2: Commit**

```bash
git add server/modules/transaction/transaction.types.ts
git commit -m "feat(transactions): add unified transaction types and filter schema"
```

---

## Task 2: Backend Service

**Files:**
- Create: `server/modules/transaction/transaction.service.ts`

**Step 1: Create the service file**

Follow the merge pattern from `server/modules/dashboard/dashboard.service.ts:167-191` (parallel queries, tag with type, merge, sort, slice). Follow the pagination pattern from `server/modules/expense/expense.service.ts` (conditional where clauses, `$transaction` for count).

```ts
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
	type TransactionFilterInput,
	type UnifiedTransaction,
	type TransactionSummary,
	type PaginatedTransactions,
} from './transaction.types';

export const TransactionService = {
	/**
	 * Fetch unified transactions across Income, Expense, and Transfer tables.
	 * Type filter optimization: only queries the relevant table(s).
	 * Payment = transfer where toAccount.isLiability === true.
	 */
	async getUnifiedTransactions(
		userId: string,
		filters: TransactionFilterInput
	): Promise<PaginatedTransactions> {
		const {
			type,
			categoryId,
			accountId,
			search,
			source,
			amountMin,
			amountMax,
			startDate,
			endDate,
			page,
			pageSize,
			sortBy,
			sortOrder,
		} = filters;

		const dateFilter = {
			...(startDate && { gte: startDate }),
			...(endDate && { lte: endDate }),
		};
		const hasDateFilter = startDate || endDate;

		const amountFilter: Prisma.DecimalFilter | undefined =
			amountMin !== undefined || amountMax !== undefined
				? {
						...(amountMin !== undefined && { gte: amountMin }),
						...(amountMax !== undefined && { lte: amountMax }),
					}
				: undefined;

		const searchFilter = search
			? { contains: search, mode: 'insensitive' as const }
			: undefined;

		// ---------------------------------------------------------------
		// Determine which tables to query based on type filter
		// ---------------------------------------------------------------
		const queryIncome = !type || type === 'income';
		const queryExpense = !type || type === 'expense';
		const queryTransfer = !type || type === 'transfer' || type === 'payment';

		// ---------------------------------------------------------------
		// Build queries in parallel
		// ---------------------------------------------------------------
		const [incomes, expenses, transfers] = await Promise.all([
			queryIncome
				? prisma.income.findMany({
						where: {
							userId,
							...(hasDateFilter && { date: dateFilter }),
							...(categoryId && { categoryId }),
							...(accountId && { accountId }),
							...(searchFilter && { description: searchFilter }),
							...(source && { source }),
							...(amountFilter && { amount: amountFilter }),
						},
						include: { category: true, account: true },
						orderBy: { date: 'desc' },
					})
				: [],
			queryExpense
				? prisma.expense.findMany({
						where: {
							userId,
							...(hasDateFilter && { date: dateFilter }),
							...(categoryId && { categoryId }),
							...(accountId && { accountId }),
							...(searchFilter && { description: searchFilter }),
							...(source && { source }),
							...(amountFilter && { amount: amountFilter }),
						},
						include: { category: true, account: true, budget: true },
						orderBy: { date: 'desc' },
					})
				: [],
			queryTransfer
				? prisma.transfer.findMany({
						where: {
							userId,
							...(hasDateFilter && { date: dateFilter }),
							...(accountId && {
								OR: [
									{ fromAccountId: accountId },
									{ toAccountId: accountId },
								],
							}),
							...(searchFilter && { description: searchFilter }),
							...(amountFilter && { amount: amountFilter }),
							// Payment filter: only transfers to liability accounts
							...(type === 'payment' && {
								toAccount: { isLiability: true },
							}),
						},
						include: { fromAccount: true, toAccount: true },
						orderBy: { date: 'desc' },
					})
				: [],
		]);

		// ---------------------------------------------------------------
		// Map to UnifiedTransaction
		// ---------------------------------------------------------------
		const unified: UnifiedTransaction[] = [];

		for (const i of incomes) {
			unified.push({
				kind: 'income',
				id: i.id,
				amount: Number(i.amount),
				date: i.date.toISOString(),
				description: i.description,
				accountName: i.account?.name ?? null,
				categoryName: i.category.name,
				source: i.source,
			});
		}

		for (const e of expenses) {
			unified.push({
				kind: 'expense',
				id: e.id,
				amount: Number(e.amount),
				date: e.date.toISOString(),
				description: e.description,
				accountName: e.account?.name ?? null,
				categoryName: e.category.name,
				budgetName: e.budget?.name ?? null,
				source: e.source,
			});
		}

		for (const t of transfers) {
			const isPayment = t.toAccount.isLiability;
			// If filtering by 'transfer' only (not 'payment'), skip payments
			if (type === 'transfer' && isPayment) continue;
			unified.push({
				kind: 'transfer',
				id: t.id,
				amount: Number(t.amount),
				date: t.date.toISOString(),
				description: t.description,
				fromAccountName: t.fromAccount.name,
				toAccountName: t.toAccount.name,
				fee: Number(t.fee),
				isPayment,
			});
		}

		// ---------------------------------------------------------------
		// Sort
		// ---------------------------------------------------------------
		const multiplier = sortOrder === 'asc' ? 1 : -1;
		unified.sort((a, b) => {
			if (sortBy === 'date') {
				return multiplier * (new Date(a.date).getTime() - new Date(b.date).getTime());
			}
			if (sortBy === 'amount') {
				return multiplier * (a.amount - b.amount);
			}
			// description
			const aDesc = a.description ?? '';
			const bDesc = b.description ?? '';
			return multiplier * aDesc.localeCompare(bDesc);
		});

		// ---------------------------------------------------------------
		// Paginate (over-fetch-and-slice)
		// ---------------------------------------------------------------
		const total = unified.length;
		const start = (page - 1) * pageSize;
		const data = unified.slice(start, start + pageSize);

		return { data, total, page, pageSize };
	},

	/**
	 * Aggregate KPI summary for the date range.
	 * Ignores type/category filters — always shows full picture.
	 */
	async getTransactionSummary(
		userId: string,
		startDate?: Date,
		endDate?: Date
	): Promise<TransactionSummary> {
		const dateFilter = {
			...(startDate && { gte: startDate }),
			...(endDate && { lte: endDate }),
		};
		const hasDateFilter = startDate || endDate;

		const [incomeAgg, expenseAgg, incomeCount, expenseCount, transferCount] =
			await Promise.all([
				prisma.income.aggregate({
					where: { userId, ...(hasDateFilter && { date: dateFilter }) },
					_sum: { amount: true },
				}),
				prisma.expense.aggregate({
					where: { userId, ...(hasDateFilter && { date: dateFilter }) },
					_sum: { amount: true },
				}),
				prisma.income.count({
					where: { userId, ...(hasDateFilter && { date: dateFilter }) },
				}),
				prisma.expense.count({
					where: { userId, ...(hasDateFilter && { date: dateFilter }) },
				}),
				prisma.transfer.count({
					where: { userId, ...(hasDateFilter && { date: dateFilter }) },
				}),
			]);

		const totalIncome = Number(incomeAgg._sum.amount ?? 0);
		const totalExpenses = Number(expenseAgg._sum.amount ?? 0);
		const netFlow = totalIncome - totalExpenses;
		const transactionCount = incomeCount + expenseCount + transferCount;
		const averageAmount =
			transactionCount > 0 ? (totalIncome + totalExpenses) / transactionCount : 0;

		return { totalIncome, totalExpenses, netFlow, averageAmount, transactionCount };
	},
};
```

**Step 2: Commit**

```bash
git add server/modules/transaction/transaction.service.ts
git commit -m "feat(transactions): add unified transaction service with merge and KPI aggregation"
```

---

## Task 3: Backend Controller

**Files:**
- Create: `server/modules/transaction/transaction.controller.ts`

**Step 1: Create the controller file**

Follow the pattern from `server/modules/income/income.controller.ts`: `'use server'` → `getAuthenticatedUser()` → Zod safeParse → service call → return result.

```ts
'use server';

import { getAuthenticatedUser } from '@/server/lib/auth-guard';
import { TransactionService } from './transaction.service';
import { transactionFilterSchema } from './transaction.types';

/**
 * Server Action: Get unified paginated transactions
 */
export async function getUnifiedTransactionsAction(filters: unknown) {
	const userId = await getAuthenticatedUser();

	const parsed = transactionFilterSchema.safeParse(filters);
	if (!parsed.success) {
		return { error: parsed.error.issues[0]?.message || 'Invalid filters' };
	}

	try {
		const result = await TransactionService.getUnifiedTransactions(
			userId,
			parsed.data
		);
		return { success: true as const, data: result };
	} catch (error) {
		console.error('Failed to fetch transactions:', error);
		return { error: 'Failed to fetch transactions' };
	}
}

/**
 * Server Action: Get transaction summary (KPI data)
 */
export async function getTransactionSummaryAction(filters?: {
	startDate?: string;
	endDate?: string;
}) {
	const userId = await getAuthenticatedUser();

	try {
		const startDate = filters?.startDate
			? new Date(filters.startDate)
			: undefined;
		const endDate = filters?.endDate ? new Date(filters.endDate) : undefined;

		const summary = await TransactionService.getTransactionSummary(
			userId,
			startDate,
			endDate
		);
		return { success: true as const, data: summary };
	} catch (error) {
		console.error('Failed to fetch transaction summary:', error);
		return { error: 'Failed to fetch transaction summary' };
	}
}
```

**Step 2: Add TRANSACTIONS cache tag**

In `server/lib/cache-tags.ts`, add `TRANSACTIONS: 'transactions'` to the `CACHE_TAGS` object (after the existing `TRANSFERS` entry).

**Step 3: Commit**

```bash
git add server/modules/transaction/transaction.controller.ts server/lib/cache-tags.ts
git commit -m "feat(transactions): add transaction controller and cache tag"
```

---

## Task 4: KPI Cards Component

**Files:**
- Create: `components/modules/transactions/TransactionKPICards.tsx`

**Step 1: Create the KPI cards component**

4 cards: Total Income, Total Expenses, Net Flow, Average Amount. The `activeType` prop highlights the corresponding card. Follow the card styling from `components/modules/dashboard/DashboardTabs.tsx` (MiniKpiCard pattern).

```tsx
'use client';

import { ArrowDownLeft, ArrowUpRight, TrendingUp, Calculator } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/lib/contexts/currency-context';

interface TransactionKPICardsProps {
	totalIncome: number;
	totalExpenses: number;
	netFlow: number;
	averageAmount: number;
	activeType?: string | null;
}

const CARDS = [
	{
		key: 'income',
		label: 'Total Income',
		icon: ArrowDownLeft,
		color: 'text-green-500',
		bgActive: 'ring-2 ring-green-500/50 bg-green-500/5',
		getValue: (p: TransactionKPICardsProps) => p.totalIncome,
		prefix: '+',
	},
	{
		key: 'expense',
		label: 'Total Expenses',
		icon: ArrowUpRight,
		color: 'text-red-500',
		bgActive: 'ring-2 ring-red-500/50 bg-red-500/5',
		getValue: (p: TransactionKPICardsProps) => p.totalExpenses,
		prefix: '-',
	},
	{
		key: 'netflow',
		label: 'Net Flow',
		icon: TrendingUp,
		color: 'text-blue-500',
		bgActive: 'ring-2 ring-blue-500/50 bg-blue-500/5',
		getValue: (p: TransactionKPICardsProps) => p.netFlow,
		// Maps to both transfer + payment types
		matchTypes: ['transfer', 'payment'],
	},
	{
		key: 'average',
		label: 'Average Amount',
		icon: Calculator,
		color: 'text-zinc-500',
		bgActive: 'ring-2 ring-zinc-500/50 bg-zinc-500/5',
		getValue: (p: TransactionKPICardsProps) => p.averageAmount,
	},
] as const;

export function TransactionKPICards(props: TransactionKPICardsProps) {
	const { formatCurrency } = useCurrency();
	const { activeType } = props;

	return (
		<div className='grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4'>
			{CARDS.map((card) => {
				const value = card.getValue(props);
				const isActive =
					activeType &&
					(('matchTypes' in card && card.matchTypes?.includes(activeType)) ||
						card.key === activeType);
				const Icon = card.icon;

				return (
					<Card
						key={card.key}
						className={cn(
							'flex flex-col gap-2 p-4 transition-all',
							isActive && card.bgActive
						)}
					>
						<div className='flex items-center justify-between'>
							<span className='text-xs font-medium text-muted-foreground'>
								{card.label}
							</span>
							<Icon className={cn('h-4 w-4', card.color)} />
						</div>
						<p className='text-xl font-bold tabular-nums sm:text-2xl'>
							{'prefix' in card && card.prefix && value > 0
								? card.prefix
								: ''}
							{formatCurrency(Math.abs(value))}
						</p>
					</Card>
				);
			})}
		</div>
	);
}
```

**Step 2: Commit**

```bash
git add components/modules/transactions/TransactionKPICards.tsx
git commit -m "feat(transactions): add KPI cards component"
```

---

## Task 5: Filters Component

**Files:**
- Create: `components/modules/transactions/TransactionFilters.tsx`

**Step 1: Create the filters component**

Contains: quick filter type chips, search bar, date range picker, Filter panel (Sheet), Export button, "+ Add Transaction" button. All filter state is read/written via URL search params.

Reference:
- `components/modules/dashboard/DashboardTabs.tsx` for chip/pill styling
- `components/modules/dashboard/QuickActionSheet.tsx` for the `useQuickAction` hook

```tsx
'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import {
	Search,
	SlidersHorizontal,
	Download,
	Plus,
	CalendarIcon,
	X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetFooter,
} from '@/components/ui/sheet';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { cn } from '@/lib/utils';
import { useQuickAction, type QuickAction } from '@/components/modules/dashboard/QuickActionSheet';

const TYPE_CHIPS = [
	{ value: null, label: 'All' },
	{ value: 'income', label: 'Income' },
	{ value: 'expense', label: 'Expense' },
	{ value: 'transfer', label: 'Transfer' },
	{ value: 'payment', label: 'Payment' },
] as const;

const SOURCE_OPTIONS = [
	{ value: '', label: 'All Sources' },
	{ value: 'MANUAL', label: 'Manual' },
	{ value: 'IMPORT', label: 'Imported' },
	{ value: 'RECURRING', label: 'Recurring' },
] as const;

interface TransactionFiltersProps {
	categories: Array<{ id: string; name: string }>;
	accounts: Array<{ id: string; name: string }>;
}

export function TransactionFilters({
	categories,
	accounts,
}: TransactionFiltersProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { openSheet } = useQuickAction();

	const [filterOpen, setFilterOpen] = useState(false);
	const [addOpen, setAddOpen] = useState(false);

	// Read current filter state from URL
	const activeType = searchParams.get('type') ?? null;
	const searchQuery = searchParams.get('search') ?? '';
	const startDate = searchParams.get('from') ?? '';
	const endDate = searchParams.get('to') ?? '';

	// Push filter changes to URL
	const updateParams = useCallback(
		(updates: Record<string, string | null>) => {
			const params = new URLSearchParams(searchParams.toString());
			for (const [key, value] of Object.entries(updates)) {
				if (value === null || value === '') {
					params.delete(key);
				} else {
					params.set(key, value);
				}
			}
			// Reset to page 1 on filter change
			params.delete('page');
			router.push(`?${params.toString()}`, { scroll: false });
		},
		[router, searchParams]
	);

	// Debounced search
	const [localSearch, setLocalSearch] = useState(searchQuery);
	const handleSearchChange = useCallback(
		(value: string) => {
			setLocalSearch(value);
			const timeout = setTimeout(() => {
				updateParams({ search: value || null });
			}, 300);
			return () => clearTimeout(timeout);
		},
		[updateParams]
	);

	// Filter panel state (local until Apply)
	const [filterCategory, setFilterCategory] = useState(
		searchParams.get('categoryId') ?? ''
	);
	const [filterAccount, setFilterAccount] = useState(
		searchParams.get('accountId') ?? ''
	);
	const [filterSource, setFilterSource] = useState(
		searchParams.get('source') ?? ''
	);
	const [filterAmountMin, setFilterAmountMin] = useState<number | undefined>(
		searchParams.get('amountMin') ? Number(searchParams.get('amountMin')) : undefined
	);
	const [filterAmountMax, setFilterAmountMax] = useState<number | undefined>(
		searchParams.get('amountMax') ? Number(searchParams.get('amountMax')) : undefined
	);

	const applyFilters = () => {
		updateParams({
			categoryId: filterCategory || null,
			accountId: filterAccount || null,
			source: filterSource || null,
			amountMin: filterAmountMin != null ? String(filterAmountMin) : null,
			amountMax: filterAmountMax != null ? String(filterAmountMax) : null,
		});
		setFilterOpen(false);
	};

	const clearFilters = () => {
		setFilterCategory('');
		setFilterAccount('');
		setFilterSource('');
		setFilterAmountMin(undefined);
		setFilterAmountMax(undefined);
		updateParams({
			categoryId: null,
			accountId: null,
			source: null,
			amountMin: null,
			amountMax: null,
		});
		setFilterOpen(false);
	};

	const hasAdvancedFilters =
		searchParams.has('categoryId') ||
		searchParams.has('accountId') ||
		searchParams.has('source') ||
		searchParams.has('amountMin') ||
		searchParams.has('amountMax');

	// Date range display
	const dateLabel =
		startDate && endDate
			? `${format(new Date(startDate), 'MMM d')} - ${format(new Date(endDate), 'MMM d, yyyy')}`
			: startDate
				? `From ${format(new Date(startDate), 'MMM d, yyyy')}`
				: endDate
					? `Until ${format(new Date(endDate), 'MMM d, yyyy')}`
					: 'Select date range';

	// Add transaction options
	const ADD_OPTIONS: Array<{ label: string; action: QuickAction }> = [
		{ label: 'Income', action: 'income' },
		{ label: 'Expense', action: 'expense' },
		{ label: 'Transfer', action: 'transfer' },
	];

	return (
		<div className='space-y-3'>
			{/* Top bar: date range, filter, export, add */}
			<div className='flex flex-wrap items-center gap-2'>
				{/* Date range picker */}
				<Popover>
					<PopoverTrigger asChild>
						<Button variant='outline' size='sm' className='gap-2 text-xs'>
							<CalendarIcon className='h-3.5 w-3.5' />
							{dateLabel}
						</Button>
					</PopoverTrigger>
					<PopoverContent className='w-auto p-0' align='start'>
						<Calendar
							mode='range'
							selected={{
								from: startDate ? new Date(startDate) : undefined,
								to: endDate ? new Date(endDate) : undefined,
							}}
							onSelect={(range) => {
								updateParams({
									from: range?.from
										? range.from.toISOString()
										: null,
									to: range?.to
										? range.to.toISOString()
										: null,
								});
							}}
							numberOfMonths={2}
						/>
					</PopoverContent>
				</Popover>

				<div className='ml-auto flex items-center gap-2'>
					{/* Filter button */}
					<Button
						variant='outline'
						size='sm'
						className={cn('gap-2 text-xs', hasAdvancedFilters && 'border-primary')}
						onClick={() => setFilterOpen(true)}
					>
						<SlidersHorizontal className='h-3.5 w-3.5' />
						Filter
						{hasAdvancedFilters && (
							<Badge variant='secondary' className='ml-1 h-4 px-1 text-[10px]'>
								!
							</Badge>
						)}
					</Button>

					{/* Export button */}
					<Button variant='outline' size='sm' className='gap-2 text-xs'>
						<Download className='h-3.5 w-3.5' />
						Export
					</Button>

					{/* Add Transaction */}
					<Popover open={addOpen} onOpenChange={setAddOpen}>
						<PopoverTrigger asChild>
							<Button size='sm' className='gap-2 text-xs'>
								<Plus className='h-3.5 w-3.5' />
								Add Transaction
							</Button>
						</PopoverTrigger>
						<PopoverContent className='w-40 p-1' align='end'>
							{ADD_OPTIONS.map(({ label, action }) => (
								<button
									key={action}
									type='button'
									className='w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent'
									onClick={() => {
										setAddOpen(false);
										openSheet(action);
									}}
								>
									{label}
								</button>
							))}
						</PopoverContent>
					</Popover>
				</div>
			</div>

			{/* Quick filter chips */}
			<div className='flex items-center gap-2'>
				{TYPE_CHIPS.map((chip) => (
					<button
						key={chip.label}
						type='button'
						onClick={() => updateParams({ type: chip.value })}
						className={cn(
							'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
							activeType === chip.value ||
								(chip.value === null && activeType === null)
								? 'border-primary bg-primary text-primary-foreground'
								: 'border-border bg-background text-muted-foreground hover:bg-accent'
						)}
					>
						{chip.label}
					</button>
				))}
			</div>

			{/* Search bar */}
			<div className='relative'>
				<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
				<Input
					placeholder='Search...'
					value={localSearch}
					onChange={(e) => handleSearchChange(e.target.value)}
					className='pl-9 h-9 text-sm'
				/>
				{localSearch && (
					<button
						type='button'
						onClick={() => handleSearchChange('')}
						className='absolute right-3 top-1/2 -translate-y-1/2'
					>
						<X className='h-3.5 w-3.5 text-muted-foreground' />
					</button>
				)}
			</div>

			{/* Advanced Filter Panel (Sheet) */}
			<Sheet open={filterOpen} onOpenChange={setFilterOpen}>
				<SheetContent side='right' className='w-full sm:max-w-sm'>
					<SheetHeader>
						<SheetTitle>Filters</SheetTitle>
					</SheetHeader>
					<div className='flex flex-col gap-4 py-4'>
						{/* Category */}
						<div className='space-y-2'>
							<Label>Category</Label>
							<Select
								value={filterCategory}
								onValueChange={setFilterCategory}
								disabled={activeType === 'transfer' || activeType === 'payment'}
							>
								<SelectTrigger>
									<SelectValue placeholder='All categories' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value=''>All categories</SelectItem>
									{categories.map((c) => (
										<SelectItem key={c.id} value={c.id}>
											{c.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Account */}
						<div className='space-y-2'>
							<Label>Account</Label>
							<Select
								value={filterAccount}
								onValueChange={setFilterAccount}
							>
								<SelectTrigger>
									<SelectValue placeholder='All accounts' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value=''>All accounts</SelectItem>
									{accounts.map((a) => (
										<SelectItem key={a.id} value={a.id}>
											{a.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Source */}
						<div className='space-y-2'>
							<Label>Source</Label>
							<Select
								value={filterSource}
								onValueChange={setFilterSource}
							>
								<SelectTrigger>
									<SelectValue placeholder='All sources' />
								</SelectTrigger>
								<SelectContent>
									{SOURCE_OPTIONS.map((s) => (
										<SelectItem key={s.value} value={s.value}>
											{s.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Amount range */}
						<div className='space-y-2'>
							<Label>Amount Range</Label>
							<div className='flex gap-2'>
								<CurrencyInput
									placeholder='Min'
									value={filterAmountMin}
									onChange={setFilterAmountMin}
								/>
								<CurrencyInput
									placeholder='Max'
									value={filterAmountMax}
									onChange={setFilterAmountMax}
								/>
							</div>
						</div>
					</div>

					<SheetFooter className='flex gap-2'>
						<Button variant='outline' onClick={clearFilters} className='flex-1'>
							Clear
						</Button>
						<Button onClick={applyFilters} className='flex-1'>
							Apply
						</Button>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		</div>
	);
}
```

**Step 2: Commit**

```bash
git add components/modules/transactions/TransactionFilters.tsx
git commit -m "feat(transactions): add filters component with chips, search, and filter panel"
```

---

## Task 6: Transaction Table and Row Actions

**Files:**
- Create: `components/modules/transactions/TransactionTable.tsx`
- Create: `components/modules/transactions/TransactionRowActions.tsx`

**Step 1: Create the row actions component**

The "..." dropdown menu that routes Edit/Delete to the correct existing server action based on `kind`.

```tsx
'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { deleteIncomeAction } from '@/server/modules/income/income.controller';
import { deleteExpenseAction } from '@/server/modules/expense/expense.controller';
import { deleteTransferAction } from '@/server/modules/transfer/transfer.controller';
import type { UnifiedTransaction } from '@/server/modules/transaction/transaction.types';

interface TransactionRowActionsProps {
	transaction: UnifiedTransaction;
}

export function TransactionRowActions({ transaction }: TransactionRowActionsProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	const handleDelete = () => {
		startTransition(async () => {
			let result: { error?: string } | undefined;

			switch (transaction.kind) {
				case 'income':
					result = await deleteIncomeAction(transaction.id);
					break;
				case 'expense':
					result = await deleteExpenseAction(transaction.id);
					break;
				case 'transfer':
					result = await deleteTransferAction(transaction.id);
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

	// Determine the edit route based on kind
	const editRoute =
		transaction.kind === 'income'
			? '/income'
			: transaction.kind === 'expense'
				? '/expense'
				: '/transfers';

	return (
		<AlertDialog>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant='ghost' size='icon' className='h-8 w-8'>
						<MoreHorizontal className='h-4 w-4' />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align='end'>
					<DropdownMenuItem onClick={() => router.push(editRoute)}>
						<Pencil className='mr-2 h-3.5 w-3.5' />
						Edit
					</DropdownMenuItem>
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
```

**Step 2: Create the unified table component**

Renders the polymorphic data table. Each row switches on `kind` for description subtitle, amount sign/color, and category display.

```tsx
'use client';

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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/lib/contexts/currency-context';
import { TransactionRowActions } from './TransactionRowActions';
import type { UnifiedTransaction } from '@/server/modules/transaction/transaction.types';

interface TransactionTableProps {
	transactions: UnifiedTransaction[];
	total: number;
	page: number;
	pageSize: number;
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

export function TransactionTable({
	transactions,
	total,
	page,
	pageSize,
}: TransactionTableProps) {
	const { formatCurrency } = useCurrency();
	const router = useRouter();
	const searchParams = useSearchParams();

	const totalPages = Math.ceil(total / pageSize);

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

							return (
								<tr key={`${tx.kind}-${tx.id}`} className='group'>
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
		</div>
	);
}
```

**Step 3: Commit**

```bash
git add components/modules/transactions/TransactionTable.tsx components/modules/transactions/TransactionRowActions.tsx
git commit -m "feat(transactions): add unified table and row actions components"
```

---

## Task 7: Page Container

**Files:**
- Create: `components/modules/transactions/TransactionPageContainer.tsx`

**Step 1: Create the page container**

Client component that wraps all child components. Receives serialized data from the server page. Handles client-side re-fetching when URL params change.

```tsx
'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TransactionKPICards } from './TransactionKPICards';
import { TransactionFilters } from './TransactionFilters';
import { TransactionTable } from './TransactionTable';
import { getUnifiedTransactionsAction } from '@/server/modules/transaction/transaction.controller';
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
	const [summary] = useState(initialSummary);

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
			const result = await getUnifiedTransactionsAction(cleanFilters);
			if (result.success) {
				setTransactions(result.data.data);
				setTotal(result.data.total);
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
```

**Step 2: Commit**

```bash
git add components/modules/transactions/TransactionPageContainer.tsx
git commit -m "feat(transactions): add page container with re-fetching on filter change"
```

---

## Task 8: Server Page

**Files:**
- Create: `app/(authenticated)/transactions/page.tsx`

**Step 1: Create the server page**

Follow the pattern from `app/(authenticated)/expense/page.tsx` and `app/(authenticated)/dashboard/page.tsx`. Auth check, parallel data fetching, serialize, wrap with QuickActionProvider, render container.

```tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { startOfMonth, endOfMonth } from 'date-fns';
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
		source: params.source,
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
```

**Step 2: Commit**

```bash
git add app/\(authenticated\)/transactions/page.tsx
git commit -m "feat(transactions): add unified transactions server page"
```

---

## Task 9: Sidebar Update

**Files:**
- Modify: `components/common/app-sidebar.tsx`

**Step 1: Update the navItems array**

Replace the collapsible "Transactions" group with a single "Transactions" link. Keep "Recurring" as a separate item.

In the `navItems` array, change the Transactions entry from:

```ts
{
    title: 'Transactions',
    url: '#',
    icon: ArrowRightLeft,
    items: [
        { title: 'Income', url: '/income' },
        { title: 'Expenses', url: '/expense' },
        { title: 'Transfers', url: '/transfers' },
        { title: 'Payments', url: '/payments' },
        { title: 'Recurring', url: '/recurring' },
    ],
},
```

To:

```ts
{
    title: 'Transactions',
    url: '/transactions',
    icon: ArrowRightLeft,
},
{
    title: 'Recurring',
    url: '/recurring',
    icon: RefreshCw,
},
```

Add `RefreshCw` to the lucide-react imports.

**Step 2: Commit**

```bash
git add components/common/app-sidebar.tsx
git commit -m "feat(transactions): update sidebar to single Transactions link"
```

---

## Task 10: Build Verification

**Step 1: Type check**

Run `npx tsc --noEmit` locally to verify no type errors across all new files.

**Step 2: Lint check**

Run `docker compose exec app npm run lint` or equivalent to verify no lint errors.

**Step 3: Manual verification**

1. Navigate to `/transactions` — verify the page loads with KPI cards, filter bar, and table
2. Click type chips — verify table filters and KPI card highlights
3. Use the search bar — verify debounced filtering works
4. Open the Filter panel — verify category/account/source/amount filters
5. Click "+ Add Transaction" — verify the 3-option popover opens the QuickActionSheet
6. Test pagination — verify page controls work
7. Test the "..." menu — verify Edit routes to the right page, Delete removes the transaction
8. Verify the sidebar shows "Transactions" as a single link and "Recurring" separately

**Step 4: Final commit**

Fix any issues found during verification and commit.

---

## Summary

| Task | Files | Description |
|------|-------|-------------|
| 1 | `server/modules/transaction/transaction.types.ts` | Types, Zod schema, interfaces |
| 2 | `server/modules/transaction/transaction.service.ts` | Unified query + KPI aggregation |
| 3 | `server/modules/transaction/transaction.controller.ts` + cache tag | Server actions |
| 4 | `components/modules/transactions/TransactionKPICards.tsx` | 4 KPI summary cards |
| 5 | `components/modules/transactions/TransactionFilters.tsx` | Chips, search, filter panel, date range |
| 6 | `components/modules/transactions/TransactionTable.tsx` + `TransactionRowActions.tsx` | Unified table + actions menu |
| 7 | `components/modules/transactions/TransactionPageContainer.tsx` | Client wrapper with re-fetching |
| 8 | `app/(authenticated)/transactions/page.tsx` | Server page with auth + data fetching |
| 9 | `components/common/app-sidebar.tsx` | Sidebar simplification |
| 10 | -- | Build verification + manual testing |
