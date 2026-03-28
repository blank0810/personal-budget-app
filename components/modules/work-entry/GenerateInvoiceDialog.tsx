'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
	format,
	parseISO,
	addDays,
	startOfMonth,
	subMonths,
	endOfMonth,
	startOfWeek,
} from 'date-fns';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatCurrency as formatCurrencyUtil } from '@/lib/formatters';
import { generateInvoiceFromEntriesAction } from '@/server/modules/invoice/invoice.controller';

interface EntryForInvoice {
	id: string;
	date: string | Date;
	description: string;
	quantity: number;
	unitPrice: number;
	amount: number;
}

interface GenerateInvoiceDialogProps {
	clientId: string;
	clientName: string;
	clientCurrency?: string;
	entries: EntryForInvoice[];
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

function getTodayString(): string {
	return new Date().toISOString().slice(0, 10);
}

function getDefaultDueDateString(): string {
	return addDays(new Date(), 30).toISOString().slice(0, 10);
}

function getThisMonthStart(): string {
	return startOfMonth(new Date()).toISOString().slice(0, 10);
}

function getLastMonthStart(): string {
	return startOfMonth(subMonths(new Date(), 1)).toISOString().slice(0, 10);
}

function getLastMonthEnd(): string {
	return endOfMonth(subMonths(new Date(), 1)).toISOString().slice(0, 10);
}

function formatEntryDate(date: string | Date): string {
	const d = typeof date === 'string' ? parseISO(date) : date;
	return format(d, 'MMM d');
}

/**
 * Normalize an entry date to a local "yyyy-MM-dd" string.
 *
 * After serialize() runs JSON.stringify on a Prisma Date, dates become full
 * UTC ISO strings like "2026-03-15T00:00:00.000Z". Parsing that with parseISO
 * gives a UTC-anchored instant; in timezones behind UTC (e.g. UTC-5) the local
 * representation falls on the *previous* day, breaking date-range comparisons
 * against the "yyyy-MM-dd" strings used for fromDate/toDate filter state.
 *
 * We always extract only the date portion so that all comparisons stay in
 * local-date space and timezone offsets cannot shift an entry out of range.
 */
function toEntryDateKey(date: string | Date): string {
	if (typeof date === 'string') {
		// If already a plain date string ("yyyy-MM-dd") return as-is.
		if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
		// Full ISO string: take only the date part before "T".
		return date.slice(0, 10);
	}
	return format(date, 'yyyy-MM-dd');
}

function toEntryDate(date: string | Date): Date {
	// Parse via the normalized date key so the result is local midnight,
	// consistent with how fromDate/toDate are parsed.
	return parseISO(toEntryDateKey(date));
}

export function GenerateInvoiceDialog({
	clientId,
	clientName,
	clientCurrency,
	entries,
	open,
	onOpenChange,
}: GenerateInvoiceDialogProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	// Format amounts using the client's billing currency
	const formatCurrency = useMemo(() => {
		const currency = clientCurrency || 'USD';
		return (value: number) => formatCurrencyUtil(value, { currency });
	}, [clientCurrency]);

	// Date range filter — default to "this month"
	const [fromDate, setFromDate] = useState(getThisMonthStart);
	const [toDate, setToDate] = useState(getTodayString);

	// Pre-select only the entries that fall within the default "this month"
	// filter so that the footer total matches what is visible on first open.
	const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
		const defaultFrom = getThisMonthStart();
		const defaultTo = getTodayString();
		return new Set(
			entries
				.filter((e) => {
					const key = toEntryDateKey(e.date);
					return key >= defaultFrom && key <= defaultTo;
				})
				.map((e) => e.id)
		);
	});
	const [issueDate, setIssueDate] = useState(getTodayString);
	const [dueDate, setDueDate] = useState(getDefaultDueDateString);
	const [taxRate, setTaxRate] = useState('');
	const [notes, setNotes] = useState('');

	function setQuickRange(range: 'thisMonth' | 'lastMonth' | 'all') {
		if (range === 'thisMonth') {
			setFromDate(getThisMonthStart());
			setToDate(getTodayString());
		} else if (range === 'lastMonth') {
			setFromDate(getLastMonthStart());
			setToDate(getLastMonthEnd());
		} else {
			setFromDate('');
			setToDate('');
		}
	}

	// Filtered entries based on date range.
	// Compare as "yyyy-MM-dd" strings — all values are already in that format
	// after toEntryDateKey(), so no Date objects or timezone conversion needed.
	const filteredEntries = useMemo(() => {
		if (!fromDate && !toDate) return entries;
		return entries.filter((entry) => {
			const key = toEntryDateKey(entry.date);
			if (fromDate && key < fromDate) return false;
			if (toDate && key > toDate) return false;
			return true;
		});
	}, [entries, fromDate, toDate]);

	// Group filtered entries by week (Mon-based, newest first)
	const groupedByWeek = useMemo(() => {
		const groups: Map<string, typeof filteredEntries> = new Map();
		for (const entry of filteredEntries) {
			const weekStart = startOfWeek(toEntryDate(entry.date), {
				weekStartsOn: 1,
			});
			const key = weekStart.toISOString();
			if (!groups.has(key)) groups.set(key, []);
			groups.get(key)!.push(entry);
		}
		return Array.from(groups.entries()).sort((a, b) =>
			b[0].localeCompare(a[0])
		);
	}, [filteredEntries]);

	const noneSelected = selectedIds.size === 0;

	// "Select all" for filtered entries only
	const filteredIds = useMemo(
		() => new Set(filteredEntries.map((e) => e.id)),
		[filteredEntries]
	);
	const allFilteredSelected =
		filteredEntries.length > 0 &&
		filteredEntries.every((e) => selectedIds.has(e.id));

	const selectedTotal = useMemo(() => {
		return entries
			.filter((e) => selectedIds.has(e.id))
			.reduce((sum, e) => sum + e.amount, 0);
	}, [entries, selectedIds]);

	const taxAmount = taxRate ? selectedTotal * (parseFloat(taxRate) / 100) : 0;
	const grandTotal = selectedTotal + taxAmount;

	function toggleEntry(id: string) {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}

	function toggleAll() {
		if (allFilteredSelected) {
			setSelectedIds((prev) => {
				const next = new Set(prev);
				for (const id of filteredIds) next.delete(id);
				return next;
			});
		} else {
			setSelectedIds((prev) => {
				const next = new Set(prev);
				for (const id of filteredIds) next.add(id);
				return next;
			});
		}
	}

	function toggleWeek(weekEntryIds: string[]) {
		const weekSet = new Set(weekEntryIds);
		const allWeekSelected = weekEntryIds.every((id) => selectedIds.has(id));
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (allWeekSelected) {
				for (const id of weekSet) next.delete(id);
			} else {
				for (const id of weekSet) next.add(id);
			}
			return next;
		});
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (noneSelected) return;

		// Build billing period note
		const effectiveFrom =
			fromDate ||
			(filteredEntries.length > 0
				? format(
						toEntryDate(
							filteredEntries[filteredEntries.length - 1].date
						),
						'yyyy-MM-dd'
					)
				: issueDate);
		const effectiveTo = toDate || issueDate;

		const billingPeriod = `Services rendered: ${format(parseISO(effectiveFrom), 'MMM d')} \u2013 ${format(parseISO(effectiveTo), 'MMM d, yyyy')}`;
		const notesWithPeriod = notes
			? `${notes}\n\n${billingPeriod}`
			: billingPeriod;

		startTransition(async () => {
			const result = await generateInvoiceFromEntriesAction({
				clientId,
				workEntryIds: Array.from(selectedIds),
				issueDate: new Date(issueDate),
				dueDate: new Date(dueDate),
				taxRate: taxRate ? parseFloat(taxRate) : undefined,
				notes: notesWithPeriod,
			});

			if (result?.error) {
				toast.error(result.error);
			} else if (result?.invoiceId) {
				toast.success('Invoice generated');
				onOpenChange(false);
				router.push(`/invoices/${result.invoiceId}`);
			}
		});
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='max-w-lg max-h-[90vh] flex flex-col'>
				<DialogHeader>
					<div className='flex items-center gap-2'>
						<DialogTitle>Generate Invoice for {clientName}</DialogTitle>
						{clientCurrency && (
							<Badge variant='secondary' className='text-xs font-mono'>
								{clientCurrency}
							</Badge>
						)}
					</div>
				</DialogHeader>

				<form onSubmit={handleSubmit} className='flex flex-col flex-1 min-h-0'>
					{/* Scrollable body */}
					<div className='flex-1 overflow-y-auto space-y-4 pr-1'>
						{/* Date range filter */}
						<div className='flex flex-wrap items-center gap-2'>
							<div className='flex items-center gap-1.5'>
								<label className='text-xs text-muted-foreground whitespace-nowrap'>
									From
								</label>
								<Input
									type='date'
									value={fromDate}
									onChange={(e) => setFromDate(e.target.value)}
									className='h-7 text-xs w-36 px-2'
								/>
							</div>
							<div className='flex items-center gap-1.5'>
								<label className='text-xs text-muted-foreground whitespace-nowrap'>
									To
								</label>
								<Input
									type='date'
									value={toDate}
									onChange={(e) => setToDate(e.target.value)}
									className='h-7 text-xs w-36 px-2'
								/>
							</div>
							<div className='flex gap-1'>
								<Button
									type='button'
									variant='outline'
									size='sm'
									className='h-7 text-xs px-2'
									onClick={() => setQuickRange('thisMonth')}
								>
									This month
								</Button>
								<Button
									type='button'
									variant='outline'
									size='sm'
									className='h-7 text-xs px-2'
									onClick={() => setQuickRange('lastMonth')}
								>
									Last month
								</Button>
								<Button
									type='button'
									variant='outline'
									size='sm'
									className='h-7 text-xs px-2'
									onClick={() => setQuickRange('all')}
								>
									All
								</Button>
							</div>
						</div>

						<Separator />

						{/* Entry selection */}
						<div className='flex flex-col gap-2'>
							<div className='flex items-center justify-between'>
								<span className='text-sm font-medium'>
									{filteredEntries.length < entries.length
										? `${filteredEntries.length} of ${entries.length} unbilled entries`
										: `Entries (${entries.length})`}
								</span>
								<Button
									type='button'
									variant='ghost'
									size='sm'
									onClick={toggleAll}
									className='h-7 text-xs'
									disabled={filteredEntries.length === 0}
								>
									{allFilteredSelected ? 'Deselect all' : 'Select all'}
								</Button>
							</div>

							<div className='max-h-[300px] overflow-y-auto border rounded-md'>
								{filteredEntries.length === 0 ? (
									<p className='text-sm text-muted-foreground text-center py-6'>
										No entries in this date range.
									</p>
								) : (
									<div>
										{groupedByWeek.map(([weekKey, weekEntries]) => {
											const weekStart = new Date(weekKey);
											const weekLabel = format(weekStart, 'MMM d');
											const weekIds = weekEntries.map((e) => e.id);
											const allWeekSelected = weekIds.every((id) =>
												selectedIds.has(id)
											);
											const someWeekSelected =
												!allWeekSelected &&
												weekIds.some((id) => selectedIds.has(id));
											const weekTotal = weekEntries
												.filter((e) => selectedIds.has(e.id))
												.reduce((sum, e) => sum + e.amount, 0);

											return (
												<div key={weekKey}>
													{/* Week header */}
													<div className='flex items-center gap-2 bg-muted/50 rounded px-3 py-2 sticky top-0 z-10'>
														<Checkbox
															id={`week-${weekKey}`}
															checked={
																someWeekSelected
																	? 'indeterminate'
																	: allWeekSelected
															}
															onCheckedChange={() => toggleWeek(weekIds)}
														/>
														<label
															htmlFor={`week-${weekKey}`}
															className='flex flex-1 items-center justify-between cursor-pointer'
														>
															<span className='text-sm font-semibold'>
																Week of {weekLabel}
															</span>
															<span className='ml-auto text-xs text-muted-foreground tabular-nums'>
																{formatCurrency(weekTotal)}
															</span>
														</label>
													</div>
													{/* Week entries */}
													<div className='divide-y'>
														{weekEntries.map((entry) => {
															const checked = selectedIds.has(entry.id);
															return (
																<label
																	key={entry.id}
																	htmlFor={`entry-${entry.id}`}
																	className='flex items-start gap-2 px-3 py-2 pl-8 hover:bg-muted/30 cursor-pointer rounded'
																>
																	<Checkbox
																		id={`entry-${entry.id}`}
																		checked={checked}
																		onCheckedChange={() =>
																			toggleEntry(entry.id)
																		}
																		className='mt-0.5'
																	/>
																	<div className='flex-1 min-w-0'>
																		<p className='text-sm whitespace-pre-line break-words'>
																			{entry.description}
																		</p>
																		<p className='text-xs text-muted-foreground'>
																			{formatEntryDate(entry.date)} &middot;{' '}
																			{entry.quantity} &times;{' '}
																			{formatCurrency(entry.unitPrice)}
																		</p>
																	</div>
																	<span className='text-sm font-medium tabular-nums shrink-0'>
																		{formatCurrency(entry.amount)}
																	</span>
																</label>
															);
														})}
													</div>
												</div>
											);
										})}
									</div>
								)}
							</div>
						</div>

						<Separator />

						{/* Dates */}
						<div className='grid grid-cols-2 gap-3'>
							<div className='space-y-1.5'>
								<Label htmlFor='gen-issue-date' className='text-xs'>
									Issue Date
								</Label>
								<Input
									id='gen-issue-date'
									type='date'
									value={issueDate}
									onChange={(e) => setIssueDate(e.target.value)}
									required
								/>
							</div>
							<div className='space-y-1.5'>
								<Label htmlFor='gen-due-date' className='text-xs'>
									Due Date
								</Label>
								<Input
									id='gen-due-date'
									type='date'
									value={dueDate}
									onChange={(e) => setDueDate(e.target.value)}
									required
								/>
								<p className='text-xs text-muted-foreground'>
									Defaults to 30 days from issue date
								</p>
							</div>
						</div>

						{/* Tax rate */}
						<div className='space-y-1.5'>
							<Label htmlFor='gen-tax-rate' className='text-xs'>
								Tax Rate (optional)
							</Label>
							<div className='flex items-center gap-2'>
								<Input
									id='gen-tax-rate'
									type='number'
									min='0'
									max='100'
									step='any'
									placeholder='0'
									value={taxRate}
									onChange={(e) => setTaxRate(e.target.value)}
									className='w-24'
								/>
								<span className='text-sm text-muted-foreground'>%</span>
							</div>
						</div>

						{/* Notes */}
						<div className='space-y-1.5'>
							<Label htmlFor='gen-notes' className='text-xs'>
								Notes (optional)
							</Label>
							<Textarea
								id='gen-notes'
								placeholder='Payment terms, bank details...'
								rows={2}
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
							/>
						</div>
					</div>

					<Separator className='my-4' />

					<DialogFooter className='flex-col sm:flex-row items-stretch sm:items-center gap-3'>
						<div className='flex-1 text-sm text-muted-foreground'>
							<span className='font-medium text-foreground'>
								{selectedIds.size}
							</span>{' '}
							{selectedIds.size === 1 ? 'entry' : 'entries'} selected &middot;{' '}
							<span className='font-semibold text-foreground tabular-nums'>
								{formatCurrency(grandTotal)}
							</span>
							{taxRate && parseFloat(taxRate) > 0 && (
								<span className='text-xs'>
									{' '}
									(incl. {taxRate}% tax)
								</span>
							)}
							{clientCurrency && (
								<span className='text-xs'> {clientCurrency}</span>
							)}
						</div>
						<Button
							type='submit'
							disabled={noneSelected || isPending}
						>
							{isPending && (
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							)}
							Generate Draft Invoice
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
