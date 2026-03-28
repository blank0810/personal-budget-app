'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
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
	batchImportAction,
	detectDuplicatesAction,
	undoImportAction,
} from '@/server/modules/import/import.controller';
import { useCurrency } from '@/lib/contexts/currency-context';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Loader2, AlertTriangle, CheckCircle2, Undo2 } from 'lucide-react';
import type { MappedTransaction } from './ImportWizard';

interface ReviewStepProps {
	transactions: MappedTransaction[];
	accountId: string;
	categories: Array<{ id: string; name: string; type: string }>;
	onBack: () => void;
	onReset: () => void;
}

export function ReviewStep({
	transactions,
	accountId,
	categories,
	onBack,
	onReset,
}: ReviewStepProps) {
	const { formatCurrency } = useCurrency();
	const [selected, setSelected] = useState<Set<number>>(
		() => new Set(transactions.map((_, i) => i))
	);
	const [duplicates, setDuplicates] = useState<Set<number>>(new Set());
	const [loading, setLoading] = useState(false);
	const [checking, setChecking] = useState(true);
	const [importResult, setImportResult] = useState<{
		imported: number;
		importBatchId: string;
	} | null>(null);
	const [undoing, setUndoing] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);

	// Detect duplicates on mount
	useEffect(() => {
		async function check() {
			setChecking(true);
			const result = await detectDuplicatesAction(
				accountId,
				transactions
			);
			const dupes = result.data?.duplicates ?? [];
			setDuplicates(new Set(dupes));
			// Auto-deselect duplicates
			setSelected((prev) => {
				const next = new Set(prev);
				for (const idx of dupes) {
					next.delete(idx);
				}
				return next;
			});
			setChecking(false);
		}
		check();
	}, [accountId, transactions]);

	function toggleRow(index: number) {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(index)) {
				next.delete(index);
			} else {
				next.add(index);
			}
			return next;
		});
	}

	function toggleAll() {
		if (selected.size === transactions.length) {
			setSelected(new Set());
		} else {
			setSelected(new Set(transactions.map((_, i) => i)));
		}
	}

	async function handleImport() {
		setShowConfirm(false);
		setLoading(true);

		const selectedTransactions = transactions.filter((_, i) =>
			selected.has(i)
		);

		const result = await batchImportAction(accountId, selectedTransactions);
		setLoading(false);

		if ('error' in result) {
			toast.error(result.error || 'Import failed');
		} else {
			const { imported, importBatchId } = result.data as { imported: number; importBatchId: string };
			setImportResult({ imported, importBatchId });
			toast.success(`Successfully imported ${imported} transactions`);
		}
	}

	async function handleUndo() {
		if (!importResult) return;
		setUndoing(true);

		const result = await undoImportAction(importResult.importBatchId);
		setUndoing(false);

		if ('error' in result) {
			toast.error(result.error || 'Undo failed');
		} else {
			const { deleted } = result.data as { deleted: number };
			toast.success(`Undone: ${deleted} transactions removed`);
			setImportResult(null);
			onReset();
		}
	}

	const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
	const selectedCount = selected.size;
	const totalIncome = transactions
		.filter((_, i) => selected.has(i) && transactions[i].type === 'INCOME')
		.reduce((s, t) => s + t.amount, 0);
	const totalExpense = transactions
		.filter((_, i) => selected.has(i) && transactions[i].type === 'EXPENSE')
		.reduce((s, t) => s + t.amount, 0);

	if (importResult) {
		return (
			<Card>
				<CardContent className='flex flex-col items-center py-12 text-center space-y-4'>
					<CheckCircle2 className='h-12 w-12 text-green-500' />
					<h3 className='text-lg font-semibold'>Import Complete</h3>
					<p className='text-sm text-muted-foreground'>
						{importResult.imported} transactions imported
						successfully.
					</p>
					<div className='flex gap-3'>
						<Button variant='outline' onClick={handleUndo} disabled={undoing}>
							{undoing ? (
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							) : (
								<Undo2 className='mr-2 h-4 w-4' />
							)}
							Undo Import
						</Button>
						<Button onClick={onReset}>Import More</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className='space-y-4'>
			<Card>
				<CardHeader>
					<div className='flex items-center justify-between'>
						<CardTitle className='text-base'>
							Review Transactions
						</CardTitle>
						<div className='flex items-center gap-3 text-sm'>
							<span className='text-muted-foreground'>
								{selectedCount} of {transactions.length}{' '}
								selected
							</span>
							{duplicates.size > 0 && (
								<Badge variant='secondary'>
									<AlertTriangle className='h-3 w-3 mr-1' />
									{duplicates.size} possible duplicates
								</Badge>
							)}
						</div>
					</div>
				</CardHeader>
				<CardContent className='space-y-4'>
					{checking && (
						<div className='flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground'>
							<Loader2 className='h-4 w-4 animate-spin' />
							Checking for duplicates...
						</div>
					)}

					<div className='overflow-x-auto rounded border'>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className='w-10'>
										<Checkbox
											checked={
												selected.size ===
												transactions.length
											}
											onCheckedChange={toggleAll}
										/>
									</TableHead>
									<TableHead>Date</TableHead>
									<TableHead>Description</TableHead>
									<TableHead>Type</TableHead>
									<TableHead className='text-right'>
										Amount
									</TableHead>
									<TableHead className='hidden md:table-cell'>
										Category
									</TableHead>
									<TableHead className='w-10'></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{transactions.map((t, i) => (
									<TableRow
										key={i}
										className={
											!selected.has(i) ? 'opacity-40' : ''
										}
									>
										<TableCell>
											<Checkbox
												checked={selected.has(i)}
												onCheckedChange={() =>
													toggleRow(i)
												}
											/>
										</TableCell>
										<TableCell className='text-sm whitespace-nowrap'>
											{format(t.date, 'MMM d, yyyy')}
										</TableCell>
										<TableCell className='text-sm max-w-[200px] truncate'>
											{t.description || '-'}
										</TableCell>
										<TableCell>
											<Badge
												variant={
													t.type === 'INCOME'
														? 'default'
														: 'destructive'
												}
												className='text-xs'
											>
												{t.type}
											</Badge>
										</TableCell>
										<TableCell className='text-right text-sm'>
											{formatCurrency(t.amount)}
										</TableCell>
										<TableCell className='hidden md:table-cell text-sm'>
											{categoryMap.get(t.categoryId) ||
												'-'}
										</TableCell>
										<TableCell>
											{duplicates.has(i) && (
												<AlertTriangle className='h-4 w-4 text-yellow-500' />
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					{transactions.length > 0 && (
						<div className='flex justify-between text-sm border-t pt-3'>
							<span className='text-muted-foreground'>
								Selected totals:
							</span>
							<div className='flex gap-4'>
								<span className='text-green-600'>
									Income: {formatCurrency(totalIncome)}
								</span>
								<span className='text-red-600'>
									Expense: {formatCurrency(totalExpense)}
								</span>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			<div className='flex gap-3'>
				<Button variant='outline' onClick={onBack}>
					Back
				</Button>
				<Button
					className='flex-1'
					disabled={loading || selectedCount === 0 || checking}
					onClick={() => setShowConfirm(true)}
				>
					{loading && (
						<Loader2 className='mr-2 h-4 w-4 animate-spin' />
					)}
					Import {selectedCount} Transactions
				</Button>
			</div>

			<AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Confirm Import
						</AlertDialogTitle>
						<AlertDialogDescription>
							You are about to import {selectedCount}{' '}
							transactions. This will update your account balance.
							You can undo this import afterwards if needed.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleImport}>
							Import
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
