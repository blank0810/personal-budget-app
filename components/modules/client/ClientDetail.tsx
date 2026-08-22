'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Pencil, FileText, Mail, Phone, MapPin, DollarSign, Banknote } from 'lucide-react';
import {
	SortableHeader,
	TablePagination,
	useTableSort,
} from '@/components/common/data-table';
import { GenerateInvoiceDialog } from '@/components/modules/work-entry/GenerateInvoiceDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	Table,
	TableBody,
	TableCell,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { InvoiceStatusBadge } from '@/components/modules/invoice/InvoiceStatusBadge';
import { WorkEntryStatusBadge } from '@/components/modules/work-entry/WorkEntryStatusBadge';
import { ClientForm } from './ClientForm';
import { formatCurrency } from '@/lib/formatters';
import { InvoiceStatus } from '@prisma/client';

interface ClientStats {
	id: string;
	name: string;
	email: string | null;
	phone: string | null;
	address: string | null;
	taxId: string | null;
	contactName: string | null;
	contactEmail: string | null;
	contactPhone: string | null;
	defaultRate: number | null;
	currency: string;
	notes: string | null;
	isArchived: boolean;
	unbilled: {
		count: number;
		total: number;
		oldestDate: string | Date | null;
	};
	totalInvoiced: number;
	totalPaid: number;
	outstanding: number;
}

interface WorkEntryRow {
	id: string;
	description: string;
	date: string | Date;
	quantity: number;
	unitPrice: number;
	amount: number;
	status: string;
	lastInvoiceId: string | null;
	lastInvoiceNumber: string | null;
}

interface InvoiceRow {
	id: string;
	invoiceNumber: string;
	totalAmount: number;
	issueDate: string | Date;
	dueDate: string | Date;
	status: InvoiceStatus;
}

export interface ClientDetailProps {
	client: ClientStats;
	entries: WorkEntryRow[];
	invoices: InvoiceRow[];
}

type EntryStatusFilter = 'ALL' | 'UNBILLED' | 'BILLED';
type EntrySortField =
	| 'date'
	| 'description'
	| 'quantity'
	| 'unitPrice'
	| 'amount'
	| 'status';
type InvoiceSortField =
	| 'invoiceNumber'
	| 'totalAmount'
	| 'issueDate'
	| 'dueDate'
	| 'status';

const ENTRY_STATUS_TABS: { value: EntryStatusFilter; label: string }[] = [
	{ value: 'ALL', label: 'All' },
	{ value: 'UNBILLED', label: 'Unbilled' },
	{ value: 'BILLED', label: 'Billed' },
];

const PAGE_SIZE = 10;

function compareNullable<T>(
	left: T | null | undefined,
	right: T | null | undefined,
	compare: (leftValue: T, rightValue: T) => number,
	direction: 'asc' | 'desc',
) {
	if (left == null && right == null) return 0;
	if (left == null) return 1;
	if (right == null) return -1;

	const result = compare(left, right);
	return direction === 'asc' ? result : -result;
}

function StatCard({
	label,
	value,
	highlight,
}: {
	label: string;
	value: string;
	highlight?: 'orange' | 'red';
}) {
	return (
		<Card>
			<CardHeader className='pb-2'>
				<CardTitle className='text-sm font-medium text-muted-foreground'>
					{label}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<p
					className={
						highlight === 'orange'
							? 'text-xl font-bold text-orange-600 dark:text-orange-400'
							: highlight === 'red'
							? 'text-xl font-bold text-red-600 dark:text-red-400'
							: 'text-xl font-bold'
					}
				>
					{value}
				</p>
			</CardContent>
		</Card>
	);
}

export function ClientDetail({ client, entries, invoices }: ClientDetailProps) {
	const [editOpen, setEditOpen] = useState(false);
	const [showGenerateDialog, setShowGenerateDialog] = useState(false);
	const [entryStatusFilter, setEntryStatusFilter] =
		useState<EntryStatusFilter>('ALL');
	const {
		sortField: entrySortField,
		sortDir: entrySortDir,
		toggleSort: toggleEntrySort,
	} = useTableSort<EntrySortField>('date');
	const [entryPage, setEntryPage] = useState(0);
	const {
		sortField: invoiceSortField,
		sortDir: invoiceSortDir,
		toggleSort: toggleInvoiceSort,
	} = useTableSort<InvoiceSortField>('issueDate');
	const [invoicePage, setInvoicePage] = useState(0);

	const unbilledEntries = entries.filter((entry) => entry.status === 'UNBILLED');
	const filteredEntries = useMemo(() => {
		if (entryStatusFilter === 'ALL') return entries;
		return entries.filter((entry) => entry.status === entryStatusFilter);
	}, [entries, entryStatusFilter]);

	const sortedEntries = useMemo(() => {
		return [...filteredEntries].sort((a, b) => {
			switch (entrySortField) {
				case 'date':
					return compareNullable(
						a.date,
						b.date,
						(left, right) =>
							new Date(left).getTime() - new Date(right).getTime(),
						entrySortDir,
					);
				case 'description':
					return compareNullable(
						a.description,
						b.description,
						(left, right) => left.localeCompare(right),
						entrySortDir,
					);
				case 'quantity':
					return compareNullable(
						a.quantity,
						b.quantity,
						(left, right) => left - right,
						entrySortDir,
					);
				case 'unitPrice':
					return compareNullable(
						a.unitPrice,
						b.unitPrice,
						(left, right) => left - right,
						entrySortDir,
					);
				case 'amount':
					return compareNullable(
						a.amount,
						b.amount,
						(left, right) => left - right,
						entrySortDir,
					);
				case 'status':
					return compareNullable(
						a.status,
						b.status,
						(left, right) => left.localeCompare(right),
						entrySortDir,
					);
			}
		});
	}, [filteredEntries, entrySortField, entrySortDir]);

	const entryTotalPages = Math.ceil(sortedEntries.length / PAGE_SIZE);
	const pagedEntries = sortedEntries.slice(
		entryPage * PAGE_SIZE,
		(entryPage + 1) * PAGE_SIZE,
	);

	const sortedInvoices = useMemo(() => {
		return [...invoices].sort((a, b) => {
			switch (invoiceSortField) {
				case 'invoiceNumber':
					return compareNullable(
						a.invoiceNumber,
						b.invoiceNumber,
						(left, right) => left.localeCompare(right),
						invoiceSortDir,
					);
				case 'totalAmount':
					return compareNullable(
						a.totalAmount,
						b.totalAmount,
						(left, right) => left - right,
						invoiceSortDir,
					);
				case 'issueDate':
					return compareNullable(
						a.issueDate,
						b.issueDate,
						(left, right) =>
							new Date(left).getTime() - new Date(right).getTime(),
						invoiceSortDir,
					);
				case 'dueDate':
					return compareNullable(
						a.dueDate,
						b.dueDate,
						(left, right) =>
							new Date(left).getTime() - new Date(right).getTime(),
						invoiceSortDir,
					);
				case 'status':
					return compareNullable(
						a.status,
						b.status,
						(left, right) => left.localeCompare(right),
						invoiceSortDir,
					);
			}
		});
	}, [invoices, invoiceSortField, invoiceSortDir]);

	const invoiceTotalPages = Math.ceil(sortedInvoices.length / PAGE_SIZE);
	const pagedInvoices = sortedInvoices.slice(
		invoicePage * PAGE_SIZE,
		(invoicePage + 1) * PAGE_SIZE,
	);

	function handleEntryStatusChange(value: string) {
		setEntryStatusFilter(value as EntryStatusFilter);
		setEntryPage(0);
	}

	function handleEntrySort(field: EntrySortField) {
		toggleEntrySort(field);
		setEntryPage(0);
	}

	function handleInvoiceSort(field: InvoiceSortField) {
		toggleInvoiceSort(field);
		setInvoicePage(0);
	}

	const fmt = (amount: number) => formatCurrency(amount, { currency: client.currency });

	return (
		<div className='space-y-6'>
			{/* Header */}
			<div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
				<div className='space-y-2'>
					<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
						{client.name}
					</h1>
					<div className='flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground'>
						{client.email && (
							<span className='flex items-center gap-1'>
								<Mail className='h-3.5 w-3.5' />
								{client.email}
							</span>
						)}
						{client.phone && (
							<span className='flex items-center gap-1'>
								<Phone className='h-3.5 w-3.5' />
								{client.phone}
							</span>
						)}
						{client.address && (
							<span className='flex items-center gap-1'>
								<MapPin className='h-3.5 w-3.5' />
								{client.address}
							</span>
						)}
						{client.defaultRate != null && (
							<span className='flex items-center gap-1'>
								<DollarSign className='h-3.5 w-3.5' />
								{fmt(client.defaultRate)} default billing rate
							</span>
						)}
						{client.currency && (
							<span className='flex items-center gap-1'>
								<Banknote className='h-3.5 w-3.5' />
								{client.currency}
							</span>
						)}
					</div>
				</div>

				<div className='flex gap-2 shrink-0'>
					<Button
						variant='outline'
						size='sm'
						onClick={() => setEditOpen(true)}
					>
						<Pencil className='mr-2 h-4 w-4' />
						Edit
					</Button>
					<Button
						size='sm'
						onClick={() => setShowGenerateDialog(true)}
						disabled={unbilledEntries.length === 0}
					>
						<FileText className='mr-2 h-4 w-4' />
						Generate Invoice
					</Button>
				</div>
			</div>

			{/* Stats row */}
			<div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
				<StatCard
					label='Unbilled Total'
					value={fmt(client.unbilled.total)}
					highlight={client.unbilled.total > 0 ? 'orange' : undefined}
				/>
				<StatCard
					label='Total Invoiced'
					value={fmt(client.totalInvoiced)}
				/>
				<StatCard
					label='Total Paid'
					value={fmt(client.totalPaid)}
				/>
				<StatCard
					label='Outstanding'
					value={fmt(client.outstanding)}
					highlight={client.outstanding > 0 ? 'red' : undefined}
				/>
			</div>

			{/* Tabs */}
			<Tabs defaultValue='entries'>
				<TabsList>
					<TabsTrigger value='entries'>
						Billable Entries
						{entries.length > 0 && (
							<span className='ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium'>
								{entries.length}
							</span>
						)}
					</TabsTrigger>
					<TabsTrigger value='invoices'>
						Invoices
						{invoices.length > 0 && (
							<span className='ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium'>
								{invoices.length}
							</span>
						)}
					</TabsTrigger>
				</TabsList>

				<TabsContent value='entries' className='mt-4'>
					<div className='space-y-4'>
						<Tabs
							value={entryStatusFilter}
							onValueChange={handleEntryStatusChange}
						>
							<TabsList className='flex-wrap h-auto'>
								{ENTRY_STATUS_TABS.map((tab) => (
									<TabsTrigger
										key={tab.value}
										value={tab.value}
									>
										{tab.label}
									</TabsTrigger>
								))}
							</TabsList>
						</Tabs>

						{entries.length === 0 ? (
							<div className='rounded-lg border border-dashed p-8 text-center'>
								<p className='text-sm text-muted-foreground'>
									No billable entries yet.
								</p>
							</div>
						) : filteredEntries.length === 0 ? (
							<div className='rounded-lg border border-dashed p-8 text-center'>
								<p className='text-sm text-muted-foreground'>
									No billable entries match the current filter.
								</p>
							</div>
						) : (
							<div className='rounded-md border'>
								<Table>
									<TableHeader>
										<TableRow>
											<SortableHeader
												field='date'
												label='Date'
												sortField={entrySortField}
												onSort={handleEntrySort}
											/>
											<SortableHeader
												field='description'
												label='Description'
												sortField={entrySortField}
												onSort={handleEntrySort}
											/>
											<SortableHeader
												field='quantity'
												label='Hours / Qty'
												sortField={entrySortField}
												onSort={handleEntrySort}
												className='text-right'
											/>
											<SortableHeader
												field='unitPrice'
												label='Rate'
												sortField={entrySortField}
												onSort={handleEntrySort}
												className='text-right'
											/>
											<SortableHeader
												field='amount'
												label='Amount'
												sortField={entrySortField}
												onSort={handleEntrySort}
												className='text-right'
											/>
											<SortableHeader
												field='status'
												label='Status'
												sortField={entrySortField}
												onSort={handleEntrySort}
											/>
										</TableRow>
									</TableHeader>
									<TableBody>
										{pagedEntries.map((entry) => (
											<TableRow key={entry.id}>
												<TableCell className='text-sm text-muted-foreground whitespace-nowrap'>
													{format(new Date(entry.date), 'MMM d, yyyy')}
												</TableCell>
												<TableCell>{entry.description}</TableCell>
												<TableCell className='text-right text-sm'>
													{Number(entry.quantity)}
												</TableCell>
												<TableCell className='text-right text-sm'>
													{fmt(Number(entry.unitPrice))}
												</TableCell>
												<TableCell className='text-right font-medium'>
													{fmt(Number(entry.amount))}
												</TableCell>
												<TableCell>
													<WorkEntryStatusBadge
														status={entry.status}
													/>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
								<TablePagination
									page={entryPage}
									totalPages={entryTotalPages}
									totalRows={sortedEntries.length}
									rowLabel='entry'
									onPageChange={setEntryPage}
								/>
							</div>
						)}
					</div>
				</TabsContent>

				<TabsContent value='invoices' className='mt-4'>
					{invoices.length === 0 ? (
						<div className='rounded-lg border border-dashed p-8 text-center'>
							<p className='text-sm text-muted-foreground'>
								No invoices yet.
							</p>
						</div>
					) : (
						<div className='rounded-md border'>
							<Table>
								<TableHeader>
									<TableRow>
										<SortableHeader
											field='invoiceNumber'
											label='Invoice #'
											sortField={invoiceSortField}
											onSort={handleInvoiceSort}
										/>
										<SortableHeader
											field='totalAmount'
											label='Amount'
											sortField={invoiceSortField}
											onSort={handleInvoiceSort}
										/>
										<SortableHeader
											field='issueDate'
											label='Issue Date'
											sortField={invoiceSortField}
											onSort={handleInvoiceSort}
										/>
										<SortableHeader
											field='dueDate'
											label='Due Date'
											sortField={invoiceSortField}
											onSort={handleInvoiceSort}
										/>
										<SortableHeader
											field='status'
											label='Status'
											sortField={invoiceSortField}
											onSort={handleInvoiceSort}
										/>
									</TableRow>
								</TableHeader>
								<TableBody>
									{pagedInvoices.map((invoice) => (
										<TableRow key={invoice.id}>
											<TableCell className='font-mono text-sm font-medium'>
												<Link
													href={`/invoices/${invoice.id}`}
													className='hover:underline'
												>
													{invoice.invoiceNumber}
												</Link>
											</TableCell>
											<TableCell className='font-medium'>
												{fmt(invoice.totalAmount)}
											</TableCell>
											<TableCell className='text-sm text-muted-foreground whitespace-nowrap'>
												{format(new Date(invoice.issueDate), 'MMM d, yyyy')}
											</TableCell>
											<TableCell className='text-sm text-muted-foreground whitespace-nowrap'>
												{format(new Date(invoice.dueDate), 'MMM d, yyyy')}
											</TableCell>
											<TableCell>
												<InvoiceStatusBadge status={invoice.status} />
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
							<TablePagination
								page={invoicePage}
								totalPages={invoiceTotalPages}
								totalRows={sortedInvoices.length}
								rowLabel='invoice'
								onPageChange={setInvoicePage}
							/>
						</div>
					)}
				</TabsContent>
			</Tabs>

			<ClientForm
				mode='edit'
				client={client}
				open={editOpen}
				onOpenChange={setEditOpen}
			/>

			{showGenerateDialog && (
				<GenerateInvoiceDialog
					clientId={client.id}
					clientName={client.name}
					clientCurrency={client.currency}
					entries={unbilledEntries}
					open={showGenerateDialog}
					onOpenChange={setShowGenerateDialog}
				/>
			)}
		</div>
	);
}
