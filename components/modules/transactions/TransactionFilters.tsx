'use client';

import { useState, useCallback, useRef } from 'react';
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

const ALL_VALUE = '__all__';

const SOURCE_OPTIONS = [
	{ value: ALL_VALUE, label: 'All Sources' },
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
	const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
	const handleSearchChange = useCallback(
		(value: string) => {
			setLocalSearch(value);
			if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
			searchTimeoutRef.current = setTimeout(() => {
				updateParams({ search: value || null });
			}, 300);
		},
		[updateParams]
	);

	// Filter panel state (local until Apply)
	// Use ALL_VALUE sentinel for Select components (Radix doesn't allow empty string)
	const [filterCategory, setFilterCategory] = useState(
		searchParams.get('categoryId') || ALL_VALUE
	);
	const [filterAccount, setFilterAccount] = useState(
		searchParams.get('accountId') || ALL_VALUE
	);
	const [filterSource, setFilterSource] = useState(
		searchParams.get('source') || ALL_VALUE
	);
	const [filterAmountMin, setFilterAmountMin] = useState<number | undefined>(
		searchParams.get('amountMin') ? Number(searchParams.get('amountMin')) : undefined
	);
	const [filterAmountMax, setFilterAmountMax] = useState<number | undefined>(
		searchParams.get('amountMax') ? Number(searchParams.get('amountMax')) : undefined
	);

	const applyFilters = () => {
		updateParams({
			categoryId: filterCategory === ALL_VALUE ? null : filterCategory,
			accountId: filterAccount === ALL_VALUE ? null : filterAccount,
			source: filterSource === ALL_VALUE ? null : filterSource,
			amountMin: filterAmountMin != null ? String(filterAmountMin) : null,
			amountMax: filterAmountMax != null ? String(filterAmountMax) : null,
		});
		setFilterOpen(false);
	};

	const clearFilters = () => {
		setFilterCategory(ALL_VALUE);
		setFilterAccount(ALL_VALUE);
		setFilterSource(ALL_VALUE);
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
				<SheetContent side='right' className='w-full sm:max-w-md flex flex-col gap-0 p-0'>
					<SheetHeader className='border-b px-4 py-4'>
						<SheetTitle>Filters</SheetTitle>
					</SheetHeader>
					<div className='flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4'>
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
									<SelectItem value={ALL_VALUE}>All categories</SelectItem>
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
									<SelectItem value={ALL_VALUE}>All accounts</SelectItem>
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

					<div className='border-t px-4 py-4 flex gap-2'>
						<Button variant='outline' onClick={clearFilters} className='flex-1'>
							Clear
						</Button>
						<Button onClick={applyFilters} className='flex-1'>
							Apply
						</Button>
					</div>
				</SheetContent>
			</Sheet>
		</div>
	);
}
