'use client';

import { useState, useMemo, useTransition, useCallback } from 'react';
import { format, isSameMonth } from 'date-fns';
import { Copy, Calendar, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { CurrencyInput } from '@/components/ui/currency-input';
import { RecommendationBadge } from './RecommendationBadge';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

import {
	getBudgetsForReplicationAction,
	replicateBudgetsAction,
} from '@/server/modules/budget/budget.controller';
import type { BudgetReplicationItem } from '@/server/modules/budget/budget.types';

interface ReplicateBudgetDialogProps {
	trigger: React.ReactNode;
	availableMonths: Date[];
	onSuccess?: () => void;
}

export function ReplicateBudgetDialog({
	trigger,
	availableMonths,
	onSuccess,
}: ReplicateBudgetDialogProps) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const [isLoading, setIsLoading] = useState(false);

	// Helper to create UTC date for 1st of month
	const createUTCMonth = useCallback((year: number, month: number) => {
		return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
	}, []);

	// State
	const [sourceMonth, setSourceMonth] = useState<Date | null>(null);
	const [targetMonth, setTargetMonth] = useState<Date>(() => {
		const now = new Date();
		return createUTCMonth(now.getFullYear(), now.getMonth() + 1);
	});
	const [budgetItems, setBudgetItems] = useState<BudgetReplicationItem[]>([]);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [amounts, setAmounts] = useState<Record<string, number>>({});

	// Generate target month options (current month + next 12 months) in UTC
	const targetMonthOptions = useMemo(() => {
		const options: Date[] = [];
		const now = new Date();
		for (let i = 0; i < 13; i++) {
			const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
			options.push(createUTCMonth(targetDate.getFullYear(), targetDate.getMonth()));
		}
		return options;
	}, [createUTCMonth]);

	// Fetch budgets for a given source month
	const fetchBudgetsForMonth = useCallback(async (month: Date) => {
		setIsLoading(true);
		try {
			const result = await getBudgetsForReplicationAction(month);
			if ('error' in result) {
				toast.error(result.error);
				setBudgetItems([]);
				setSelectedIds(new Set());
				setAmounts({});
			} else {
				setBudgetItems(result);
				setSelectedIds(new Set(result.map((b) => b.id)));
				setAmounts(
					result.reduce(
						(acc, b) => ({ ...acc, [b.id]: b.amount }),
						{}
					)
				);
			}
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Handle source month change
	const handleSourceMonthChange = useCallback((monthIso: string) => {
		const month = new Date(monthIso);
		setSourceMonth(month);
		fetchBudgetsForMonth(month);
	}, [fetchBudgetsForMonth]);

	// Computed values
	const selectedBudgets = budgetItems.filter((b) => selectedIds.has(b.id));
	const totalAmount = selectedBudgets.reduce(
		(sum, b) => sum + (amounts[b.id] ?? b.amount),
		0
	);
	const hasChanges = selectedBudgets.some(
		(b) => amounts[b.id] !== b.amount
	);

	// Handlers
	const handleSelectAll = (checked: boolean) => {
		if (checked) {
			setSelectedIds(new Set(budgetItems.map((b) => b.id)));
		} else {
			setSelectedIds(new Set());
		}
	};

	const handleToggle = (id: string) => {
		const newSelected = new Set(selectedIds);
		if (newSelected.has(id)) {
			newSelected.delete(id);
		} else {
			newSelected.add(id);
		}
		setSelectedIds(newSelected);
	};

	const handleAmountChange = (id: string, value: number | undefined) => {
		setAmounts((prev) => ({
			...prev,
			[id]: value ?? 0,
		}));
	};

	const handleApplyRecommendation = (id: string, amount: number) => {
		setAmounts((prev) => ({ ...prev, [id]: amount }));
	};

	const handleApplyAllRecommendations = () => {
		const newAmounts = { ...amounts };
		for (const budget of budgetItems) {
			if (budget.suggestedAmount !== null && selectedIds.has(budget.id)) {
				newAmounts[budget.id] = budget.suggestedAmount;
			}
		}
		setAmounts(newAmounts);
	};

	const hasRecommendations = budgetItems.some(
		(b) => b.suggestedAmount !== null && selectedIds.has(b.id)
	);

	const handleReplicate = () => {
		if (!sourceMonth || selectedBudgets.length === 0) return;

		startTransition(async () => {
			const result = await replicateBudgetsAction({
				sourceMonth,
				targetMonth,
				budgetItems: selectedBudgets.map((b) => ({
					sourceBudgetId: b.id,
					name: b.name,
					amount: amounts[b.id] ?? b.amount,
					categoryId: b.categoryId,
				})),
			});

			if ('error' in result) {
				toast.error(result.error);
			} else {
				const { created, skipped } = result;
				if (skipped.length > 0) {
					toast.success(
						`${created} budget${created !== 1 ? 's' : ''} created. Skipped: ${skipped.join(', ')} (already exist)`
					);
				} else {
					toast.success(
						`${created} budget${created !== 1 ? 's' : ''} replicated to ${format(targetMonth, 'MMMM yyyy')}`
					);
				}
				setOpen(false);
				router.refresh();
				onSuccess?.();
			}
		});
	};

	const handleOpenChange = useCallback((newOpen: boolean) => {
		setOpen(newOpen);
		if (newOpen && availableMonths.length > 0) {
			// Auto-select most recent month when opening
			const defaultMonth = availableMonths[0];
			setSourceMonth(defaultMonth);
			fetchBudgetsForMonth(defaultMonth);
		} else if (!newOpen) {
			// Reset state on close
			setSourceMonth(null);
			setBudgetItems([]);
			setSelectedIds(new Set());
			setAmounts({});
		}
	}, [availableMonths, fetchBudgetsForMonth]);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Copy className="h-5 w-5 text-primary" />
						Replicate Budgets
					</DialogTitle>
					<DialogDescription>
						Copy budgets from a previous month to quickly set up your new
						budget period.
					</DialogDescription>
				</DialogHeader>

				{/* Month Selection Row */}
				<div className="flex items-center gap-3 py-2">
					<div className="flex-1">
						<label className="text-xs font-medium text-muted-foreground mb-1.5 block">
							From
						</label>
						<Select
							value={sourceMonth?.toISOString()}
							onValueChange={handleSourceMonthChange}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Select source month">
									{sourceMonth && (
										<span className="flex items-center gap-2">
											<Calendar className="h-4 w-4 text-muted-foreground" />
											{format(sourceMonth, 'MMMM yyyy')}
										</span>
									)}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{availableMonths.length === 0 ? (
									<div className="py-6 text-center text-sm text-muted-foreground">
										No months with budgets found
									</div>
								) : (
									availableMonths.map((month) => (
										<SelectItem
											key={month.toISOString()}
											value={month.toISOString()}
										>
											{format(month, 'MMMM yyyy')}
										</SelectItem>
									))
								)}
							</SelectContent>
						</Select>
					</div>

					<ArrowRight className="h-4 w-4 text-muted-foreground mt-5" />

					<div className="flex-1">
						<label className="text-xs font-medium text-muted-foreground mb-1.5 block">
							To
						</label>
						<Select
							value={targetMonth.toISOString()}
							onValueChange={(val) => setTargetMonth(new Date(val))}
						>
							<SelectTrigger className="w-full">
								<SelectValue>
									<span className="flex items-center gap-2">
										<Calendar className="h-4 w-4 text-muted-foreground" />
										{format(targetMonth, 'MMMM yyyy')}
									</span>
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{targetMonthOptions.map((month) => (
									<SelectItem
										key={month.toISOString()}
										value={month.toISOString()}
										disabled={
											sourceMonth
												? isSameMonth(month, sourceMonth)
												: false
										}
									>
										{format(month, 'MMMM yyyy')}
										{isSameMonth(month, new Date()) && (
											<span className="ml-2 text-xs text-muted-foreground">
												(current)
											</span>
										)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				{/* Budget List */}
				<div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
					{isLoading ? (
						<div className="p-4 space-y-3">
							{[1, 2, 3, 4].map((i) => (
								<div key={i} className="flex items-center gap-3">
									<Skeleton className="h-4 w-4" />
									<Skeleton className="h-4 flex-1" />
									<Skeleton className="h-8 w-24" />
								</div>
							))}
						</div>
					) : budgetItems.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<Calendar className="h-10 w-10 text-muted-foreground/50 mb-3" />
							<p className="text-sm text-muted-foreground">
								{sourceMonth
									? 'No budgets found for this month'
									: 'Select a source month to see budgets'}
							</p>
						</div>
					) : (
						<ScrollArea className="h-[280px]">
							{/* Header */}
							<div className="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm border-b px-4 py-2 flex items-center gap-3">
								<Checkbox
									checked={
										selectedIds.size === budgetItems.length &&
										budgetItems.length > 0
									}
									onCheckedChange={handleSelectAll}
								/>
								<span className="text-xs font-medium text-muted-foreground flex-1">
									{selectedIds.size} of {budgetItems.length} selected
								</span>
								{hasRecommendations && (
									<Button
										variant="ghost"
										size="sm"
										className="h-7 text-xs gap-1.5"
										onClick={handleApplyAllRecommendations}
									>
										<Sparkles className="h-3 w-3" />
										Apply All Suggestions
									</Button>
								)}
							</div>

							{/* Budget Rows */}
							<div className="divide-y">
								{budgetItems.map((budget) => (
									<div
										key={budget.id}
										className={cn(
											'px-4 py-3 flex items-center gap-3 transition-colors',
											!selectedIds.has(budget.id) && 'opacity-50'
										)}
									>
										<Checkbox
											checked={selectedIds.has(budget.id)}
											onCheckedChange={() => handleToggle(budget.id)}
										/>

										<div className="flex-1 min-w-0">
											<div className="font-medium text-sm truncate">
												{budget.name}
											</div>
											<div className="text-xs text-muted-foreground">
												{budget.categoryName}
											</div>
										</div>

										<RecommendationBadge
											recommendation={budget.recommendation}
											suggestedAmount={budget.suggestedAmount}
											currentAmount={amounts[budget.id] ?? budget.amount}
											trend={budget.trend}
											onApply={(amount) =>
												handleApplyRecommendation(budget.id, amount)
											}
										/>

										<div className="w-28">
											<CurrencyInput
												value={amounts[budget.id]}
												onChange={(val) =>
													handleAmountChange(budget.id, val)
												}
												className="h-8 text-sm text-right"
												disabled={!selectedIds.has(budget.id)}
											/>
										</div>
									</div>
								))}
							</div>
						</ScrollArea>
					)}
				</div>

				{/* Summary Footer */}
				<div className="flex items-center justify-between pt-2 border-t">
					<div className="text-sm">
						<span className="text-muted-foreground">
							{selectedBudgets.length} budget
							{selectedBudgets.length !== 1 ? 's' : ''} selected
						</span>
						{hasChanges && (
							<span className="ml-2 text-xs text-amber-600">
								(amounts modified)
							</span>
						)}
					</div>
					<div className="text-sm font-semibold">
						Total: {formatCurrency(totalAmount)}
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => setOpen(false)}
						disabled={isPending}
					>
						Cancel
					</Button>
					<Button
						onClick={handleReplicate}
						disabled={isPending || selectedBudgets.length === 0}
					>
						{isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Replicating...
							</>
						) : (
							<>
								<Copy className="mr-2 h-4 w-4" />
								Replicate {selectedBudgets.length} Budget
								{selectedBudgets.length !== 1 ? 's' : ''}
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
