'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO, addDays } from 'date-fns';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useCurrency } from '@/lib/contexts/currency-context';
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

function formatEntryDate(date: string | Date): string {
	const d = typeof date === 'string' ? parseISO(date) : date;
	return format(d, 'MMM d');
}

export function GenerateInvoiceDialog({
	clientId,
	clientName,
	entries,
	open,
	onOpenChange,
}: GenerateInvoiceDialogProps) {
	const router = useRouter();
	const { formatCurrency } = useCurrency();
	const [isPending, startTransition] = useTransition();

	const [selectedIds, setSelectedIds] = useState<Set<string>>(
		() => new Set(entries.map((e) => e.id))
	);
	const [issueDate, setIssueDate] = useState(getTodayString);
	const [dueDate, setDueDate] = useState(getDefaultDueDateString);
	const [taxRate, setTaxRate] = useState('');
	const [notes, setNotes] = useState('');

	const allSelected = selectedIds.size === entries.length;
	const noneSelected = selectedIds.size === 0;

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
		if (allSelected) {
			setSelectedIds(new Set());
		} else {
			setSelectedIds(new Set(entries.map((e) => e.id)));
		}
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (noneSelected) return;

		startTransition(async () => {
			const result = await generateInvoiceFromEntriesAction({
				clientId,
				workEntryIds: Array.from(selectedIds),
				issueDate: new Date(issueDate),
				dueDate: new Date(dueDate),
				taxRate: taxRate ? parseFloat(taxRate) : undefined,
				notes: notes || undefined,
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
			<DialogContent className='max-w-lg flex flex-col max-h-[90vh]'>
				<DialogHeader>
					<DialogTitle>Generate Invoice for {clientName}</DialogTitle>
				</DialogHeader>

				<form onSubmit={handleSubmit} className='flex flex-col flex-1 min-h-0 gap-4'>
					{/* Entry selection */}
					<div className='flex flex-col min-h-0'>
						<div className='flex items-center justify-between pb-2'>
							<span className='text-sm font-medium'>
								Entries ({entries.length})
							</span>
							<Button
								type='button'
								variant='ghost'
								size='sm'
								onClick={toggleAll}
								className='h-7 text-xs'
							>
								{allSelected ? 'Deselect all' : 'Select all'}
							</Button>
						</div>

						<ScrollArea className='max-h-52 rounded-md border'>
							<div className='divide-y'>
								{entries.map((entry) => {
									const checked = selectedIds.has(entry.id);
									return (
										<label
											key={entry.id}
											htmlFor={`entry-${entry.id}`}
											className='flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50'
										>
											<Checkbox
												id={`entry-${entry.id}`}
												checked={checked}
												onCheckedChange={() => toggleEntry(entry.id)}
												className='mt-0.5'
											/>
											<div className='flex flex-1 items-start justify-between gap-2 min-w-0'>
												<div className='min-w-0'>
													<p className='text-sm truncate'>
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
											</div>
										</label>
									);
								})}
							</div>
						</ScrollArea>
					</div>

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

					<Separator />

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
