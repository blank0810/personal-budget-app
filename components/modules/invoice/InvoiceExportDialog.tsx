'use client';

import { format } from 'date-fns';
import { Download, Info } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { ClientSelectCombobox } from '@/components/modules/client/ClientSelectCombobox';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	DatePreset,
	resolveDatePreset,
} from '@/lib/date-presets';
import type { ExportInvoicesInput } from '@/server/modules/invoice/invoice.types';

interface InvoiceExportDialogProps {
	clients: { id: string; name: string }[];
}

type PaymentFilter = ExportInvoicesInput['payment'];

const ALL_CLIENTS_VALUE = '__all_clients__';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
	{ value: 'THIS_MONTH', label: 'This month' },
	{ value: 'LAST_MONTH', label: 'Last month' },
	{ value: 'LAST_2_MONTHS', label: 'Last 2 months' },
	{ value: 'LAST_3_MONTHS', label: 'Last 3 months' },
	{ value: 'THIS_QUARTER', label: 'This quarter' },
	{ value: 'THIS_YEAR', label: 'This year' },
];

function getRangeError(from: string, to: string): string | null {
	if (!from || !to) {
		return 'Choose both a start date and an end date.';
	}
	if (!DATE_PATTERN.test(from) || !DATE_PATTERN.test(to)) {
		return 'Enter valid dates for the export range.';
	}
	if (to < from) {
		return 'End date must be on or after start date.';
	}

	return null;
}

export function InvoiceExportDialog({
	clients,
}: InvoiceExportDialogProps) {
	const [open, setOpen] = useState(false);
	const [fromDate, setFromDate] = useState('');
	const [toDate, setToDate] = useState('');
	const [selectedPreset, setSelectedPreset] = useState<DatePreset | null>(null);
	const [payment, setPayment] = useState<PaymentFilter>('ALL');
	const [includeDrafts, setIncludeDrafts] = useState(false);
	const [includeCancelled, setIncludeCancelled] = useState(true);
	const [clientId, setClientId] = useState(ALL_CLIENTS_VALUE);

	const rangeError = getRangeError(fromDate, toDate);
	const clientOptions = [
		{ id: ALL_CLIENTS_VALUE, name: 'All clients' },
		...clients,
	];

	function applyPreset(preset: DatePreset) {
		const range = resolveDatePreset(preset, new Date());
		setFromDate(format(range.from, 'yyyy-MM-dd'));
		setToDate(format(range.to, 'yyyy-MM-dd'));
		setSelectedPreset(preset);
	}

	function handleOpenChange(nextOpen: boolean) {
		if (nextOpen && !fromDate && !toDate) {
			applyPreset('THIS_MONTH');
		}
		setOpen(nextOpen);
	}

	function handleExport(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (rangeError) return;

		const params = new URLSearchParams({
			from: fromDate,
			to: toDate,
			payment,
			includeDrafts: String(includeDrafts),
			includeCancelled: String(includeCancelled),
		});
		if (clientId !== ALL_CLIENTS_VALUE) {
			params.set('clientId', clientId);
		}

		window.location.href = `/api/invoices/export?${params.toString()}`;
		setOpen(false);
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button type='button' variant='outline'>
					<Download aria-hidden='true' />
					Export
				</Button>
			</DialogTrigger>
			<DialogContent className='max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl'>
				<DialogHeader>
					<DialogTitle>Export invoices</DialogTitle>
					<DialogDescription>
						Download invoice records as a spreadsheet-ready CSV file.
					</DialogDescription>
				</DialogHeader>

				<form className='space-y-5' onSubmit={handleExport}>
					<section className='space-y-3' aria-labelledby='export-range-label'>
						<div className='space-y-1'>
							<p id='export-range-label' className='text-sm font-medium'>
								Issue date range
							</p>
							<p className='text-xs text-muted-foreground'>
								Preset ranges fill the dates below. You can edit either date.
							</p>
						</div>
						<div className='flex flex-wrap gap-2'>
							{DATE_PRESETS.map((preset) => (
								<Button
									key={preset.value}
									type='button'
									variant={
										selectedPreset === preset.value
											? 'secondary'
											: 'outline'
									}
									size='sm'
									aria-pressed={selectedPreset === preset.value}
									onClick={() => applyPreset(preset.value)}
								>
									{preset.label}
								</Button>
							))}
						</div>

						<div className='grid gap-3 sm:grid-cols-2'>
							<div className='space-y-2'>
								<Label htmlFor='invoice-export-from'>From</Label>
								<Input
									id='invoice-export-from'
									type='date'
									value={fromDate}
									max={toDate || undefined}
									onChange={(event) => {
										setFromDate(event.target.value);
										setSelectedPreset(null);
									}}
									aria-invalid={Boolean(rangeError)}
									aria-describedby={
										rangeError ? 'invoice-export-range-error' : undefined
									}
									required
								/>
							</div>
							<div className='space-y-2'>
								<Label htmlFor='invoice-export-to'>To</Label>
								<Input
									id='invoice-export-to'
									type='date'
									value={toDate}
									min={fromDate || undefined}
									onChange={(event) => {
										setToDate(event.target.value);
										setSelectedPreset(null);
									}}
									aria-invalid={Boolean(rangeError)}
									aria-describedby={
										rangeError ? 'invoice-export-range-error' : undefined
									}
									required
								/>
							</div>
						</div>
						{rangeError && (
							<p
								id='invoice-export-range-error'
								className='text-sm text-destructive'
								role='alert'
							>
								{rangeError}
							</p>
						)}
					</section>

					<section className='space-y-3' aria-labelledby='payment-filter-label'>
						<p id='payment-filter-label' className='text-sm font-medium'>
							Payment status
						</p>
						<Tabs
							value={payment}
							onValueChange={(value) => setPayment(value as PaymentFilter)}
							aria-labelledby='payment-filter-label'
						>
							<TabsList className='grid w-full grid-cols-3'>
								<TabsTrigger value='ALL'>All</TabsTrigger>
								<TabsTrigger value='PAID'>Paid</TabsTrigger>
								<TabsTrigger value='UNPAID'>Unpaid</TabsTrigger>
							</TabsList>
						</Tabs>
						{payment === 'UNPAID' && (
							<div
								className='flex items-start gap-2 text-xs text-muted-foreground'
								role='note'
							>
								<Info className='mt-0.5 size-3.5 shrink-0' aria-hidden='true' />
								<p>
									This is an outstanding-receivables list, not income. The
									 Paid Date column will be empty.
								</p>
							</div>
						)}
					</section>

					<fieldset className='space-y-3'>
						<legend className='text-sm font-medium'>Additional statuses</legend>
						<div className='grid gap-3 sm:grid-cols-2'>
							<div className='flex items-center gap-2'>
								<Checkbox
									id='invoice-export-drafts'
									checked={includeDrafts}
									onCheckedChange={(checked) =>
										setIncludeDrafts(checked === true)
									}
								/>
								<Label
									htmlFor='invoice-export-drafts'
									className='cursor-pointer font-normal'
								>
									Include drafts
								</Label>
							</div>
							<div className='flex items-center gap-2'>
								<Checkbox
									id='invoice-export-cancelled'
									checked={includeCancelled}
									onCheckedChange={(checked) =>
										setIncludeCancelled(checked === true)
									}
								/>
								<Label
									htmlFor='invoice-export-cancelled'
									className='cursor-pointer font-normal'
								>
									Include cancelled
								</Label>
							</div>
						</div>
					</fieldset>

					<div className='space-y-2'>
						<Label htmlFor='invoice-export-client'>Client</Label>
						<ClientSelectCombobox
							id='invoice-export-client'
							clients={clientOptions}
							value={clientId}
							onChange={setClientId}
							placeholder='All clients'
						/>
					</div>

					<DialogFooter>
						<Button
							type='button'
							variant='outline'
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
						<Button type='submit' disabled={Boolean(rangeError)}>
							<Download aria-hidden='true' />
							Export CSV
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
