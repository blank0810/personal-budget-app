'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Pencil, FileText, Mail, Phone, MapPin, DollarSign, Banknote } from 'lucide-react';
import { GenerateInvoiceDialog } from '@/components/modules/work-entry/GenerateInvoiceDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { InvoiceStatusBadge } from '@/components/modules/invoice/InvoiceStatusBadge';
import { WorkEntryStatusBadge } from '@/components/modules/work-entry/WorkEntryStatusBadge';
import { ClientForm } from './ClientForm';
import { useCurrency } from '@/lib/contexts/currency-context';
import { InvoiceStatus } from '@prisma/client';

interface ClientStats {
	id: string;
	name: string;
	email: string | null;
	phone: string | null;
	address: string | null;
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
	const { formatCurrency } = useCurrency();
	const [editOpen, setEditOpen] = useState(false);
	const [showGenerateDialog, setShowGenerateDialog] = useState(false);

	const unbilledEntries = entries.filter(e => e.status === 'UNBILLED');

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
								{formatCurrency(client.defaultRate)} default billing rate
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
					value={formatCurrency(client.unbilled.total)}
					highlight={client.unbilled.total > 0 ? 'orange' : undefined}
				/>
				<StatCard
					label='Total Invoiced'
					value={formatCurrency(client.totalInvoiced)}
				/>
				<StatCard
					label='Total Paid'
					value={formatCurrency(client.totalPaid)}
				/>
				<StatCard
					label='Outstanding'
					value={formatCurrency(client.outstanding)}
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
					{entries.length === 0 ? (
						<div className='rounded-lg border border-dashed p-8 text-center'>
							<p className='text-sm text-muted-foreground'>
								No billable entries yet.
							</p>
						</div>
					) : (
						<div className='rounded-md border'>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Date</TableHead>
										<TableHead>Description</TableHead>
										<TableHead className='text-right'>Hours / Qty</TableHead>
										<TableHead className='text-right'>Rate</TableHead>
										<TableHead className='text-right'>Amount</TableHead>
										<TableHead>Status</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{entries.map((entry) => (
										<TableRow key={entry.id}>
											<TableCell className='text-sm text-muted-foreground whitespace-nowrap'>
												{format(new Date(entry.date), 'MMM d, yyyy')}
											</TableCell>
											<TableCell>{entry.description}</TableCell>
											<TableCell className='text-right text-sm'>
												{Number(entry.quantity)}
											</TableCell>
											<TableCell className='text-right text-sm'>
												{formatCurrency(Number(entry.unitPrice))}
											</TableCell>
											<TableCell className='text-right font-medium'>
												{formatCurrency(Number(entry.amount))}
											</TableCell>
											<TableCell>
												<WorkEntryStatusBadge
													status={entry.status}
													invoiceId={entry.lastInvoiceId ?? undefined}
													invoiceNumber={entry.lastInvoiceNumber ?? undefined}
												/>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
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
										<TableHead>Invoice #</TableHead>
										<TableHead>Amount</TableHead>
										<TableHead>Issue Date</TableHead>
										<TableHead>Due Date</TableHead>
										<TableHead>Status</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{invoices.map((invoice) => (
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
												{formatCurrency(invoice.totalAmount)}
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
