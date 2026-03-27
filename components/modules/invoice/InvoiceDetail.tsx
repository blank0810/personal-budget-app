'use client';

import { useState, useTransition, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { MarkAsPaidDialog } from './MarkAsPaidDialog';
import { formatCurrency as formatCurrencyUtil } from '@/lib/formatters';
import {
	markAsSentAction,
	cancelInvoiceAction,
	deleteInvoiceAction,
} from '@/server/modules/invoice/invoice.controller';
import { toast } from 'sonner';
import { Loader2, Pencil, Download, XCircle, Trash2, Send, CheckCircle } from 'lucide-react';
import { InvoiceStatus } from '@prisma/client';

interface LineItem {
	id: string;
	description: string;
	quantity: number;
	unitPrice: number;
	amount: number;
}

interface Account {
	id: string;
	name: string;
}

export interface InvoiceWithDetails {
	id: string;
	invoiceNumber: string;
	clientName: string;
	clientEmail: string | null;
	clientAddress: string | null;
	clientPhone: string | null;
	currency?: string | null;
	issueDate: string | Date;
	dueDate: string | Date;
	paidAt: string | Date | null;
	subtotal: number;
	taxRate: number | null;
	taxAmount: number;
	totalAmount: number;
	notes: string | null;
	status: InvoiceStatus;
	lineItems: LineItem[];
	linkedIncome: {
		id: string;
		description: string;
		account: { name: string } | null;
	} | null;
}

interface InvoiceDetailProps {
	invoice: InvoiceWithDetails;
	accounts: Account[];
}

// --- Invoice Preview Component ---

function InvoicePreviewStatusStamp({ status }: { status: InvoiceStatus }) {
	if (status === 'DRAFT') {
		return (
			<div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
				<span
					className="text-[80px] font-serif font-bold tracking-[12px] text-[#1a1a2e] select-none"
					style={{ opacity: 0.06, transform: 'rotate(-35deg)' }}
				>
					DRAFT
				</span>
			</div>
		);
	}

	if (status === 'PAID') {
		return (
			<div
				className="absolute top-6 right-6"
				style={{ transform: 'rotate(-12deg)' }}
			>
				<div className="rounded-md bg-[#16a34a] px-5 py-2 opacity-85">
					<span className="font-serif text-xl tracking-[2px] text-white">PAID</span>
				</div>
			</div>
		);
	}

	if (status === 'OVERDUE') {
		return (
			<div
				className="absolute top-6 right-6"
				style={{ transform: 'rotate(-12deg)' }}
			>
				<div className="rounded-md bg-[#dc2626] px-5 py-2 opacity-85">
					<span className="font-serif text-xl tracking-[2px] text-white">OVERDUE</span>
				</div>
			</div>
		);
	}

	if (status === 'CANCELLED') {
		return (
			<div
				className="absolute top-6 right-6"
				style={{ transform: 'rotate(-12deg)' }}
			>
				<div className="rounded-md border-[3px] border-[#6b7280] px-5 py-2 opacity-70">
					<span className="font-serif text-xl tracking-[2px] text-[#6b7280] line-through">
						CANCELLED
					</span>
				</div>
			</div>
		);
	}

	return null;
}

function InvoicePreview({
	invoice,
	formatCurrency,
}: {
	invoice: InvoiceWithDetails;
	formatCurrency: (value: number) => string;
}) {
	return (
		<Card className="overflow-hidden">
			<CardHeader>
				<CardTitle className="text-base">Invoice Preview</CardTitle>
			</CardHeader>
			<CardContent className="p-0">
				<div
					className="relative bg-white p-8 space-y-6"
					style={{ fontFamily: 'system-ui, sans-serif' }}
				>
					<InvoicePreviewStatusStamp status={invoice.status} />

					{/* Top Section: Brand + INVOICE title */}
					<div className="flex items-start justify-between">
						<div>
							<span className="text-xs font-bold tracking-widest text-[#0d9488] uppercase">
								Budget Planner
							</span>
						</div>
						<div>
							<h2 className="font-serif text-2xl text-[#1a1a2e]">
								INVOICE
							</h2>
						</div>
					</div>

					{/* Metadata Grid */}
					<div className="flex justify-end gap-6">
						<div className="text-right">
							<p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
								Invoice #
							</p>
							<p className="text-xs font-bold tracking-wide text-[#1a1a2e]">
								{invoice.invoiceNumber}
							</p>
						</div>
						<div className="text-right">
							<p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
								Issue Date
							</p>
							<p className="text-xs text-[#1a1a2e]">
								{format(new Date(invoice.issueDate), 'MMM d, yyyy')}
							</p>
						</div>
						<div className="text-right">
							<p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
								Due Date
							</p>
							<p className="text-xs text-[#1a1a2e]">
								{format(new Date(invoice.dueDate), 'MMM d, yyyy')}
							</p>
						</div>
						<div className="text-right">
							<p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
								Status
							</p>
							<p className="text-xs text-[#1a1a2e]">
								{invoice.status.charAt(0) + invoice.status.slice(1).toLowerCase()}
							</p>
						</div>
					</div>

					{/* Separator */}
					<div className="border-b border-[#e2e8f0]" />

					{/* Bill To */}
					<div className="rounded-md border border-[#e2e8f0] bg-[#f8fafc] p-4">
						<p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] mb-2">
							Bill To
						</p>
						<p className="text-sm font-bold text-[#1a1a2e]">
							{invoice.clientName}
						</p>
						{invoice.clientEmail && (
							<p className="text-xs text-[#475569]">{invoice.clientEmail}</p>
						)}
						{invoice.clientPhone && (
							<p className="text-xs text-[#475569]">{invoice.clientPhone}</p>
						)}
						{invoice.clientAddress && (
							<p className="text-xs text-[#475569] whitespace-pre-line">
								{invoice.clientAddress}
							</p>
						)}
					</div>

					{/* Line Items Table */}
					<div className="overflow-hidden rounded-md">
						<table className="w-full text-xs">
							<thead>
								<tr className="bg-[#1a1a2e] text-white">
									<th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider w-8">
										#
									</th>
									<th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider">
										Description
									</th>
									<th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider w-16">
										Hrs/Qty
									</th>
									<th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider w-24">
										Rate
									</th>
									<th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider w-24">
										Amount
									</th>
								</tr>
							</thead>
							<tbody>
								{invoice.lineItems.map((item, index) => (
									<tr
										key={item.id}
										className={index % 2 === 1 ? 'bg-[#f8fafc]' : 'bg-white'}
									>
										<td className="px-3 py-2 text-[#475569] border-b border-[#e2e8f0]">
											{index + 1}
										</td>
										<td className="px-3 py-2 text-[#475569] border-b border-[#e2e8f0]">
											{item.description}
										</td>
										<td className="px-3 py-2 text-right text-[#475569] tabular-nums border-b border-[#e2e8f0]">
											{item.quantity}
										</td>
										<td className="px-3 py-2 text-right text-[#475569] tabular-nums border-b border-[#e2e8f0]">
											{formatCurrency(item.unitPrice)}
										</td>
										<td className="px-3 py-2 text-right font-bold text-[#1a1a2e] tabular-nums border-b border-[#e2e8f0]">
											{formatCurrency(item.amount)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* Totals */}
					<div className="flex justify-end">
						<div className="w-60 space-y-1">
							<div className="flex justify-between py-1">
								<span className="text-xs text-[#64748b]">Subtotal</span>
								<span className="text-xs font-medium text-[#1a1a2e] tabular-nums">
									{formatCurrency(invoice.subtotal)}
								</span>
							</div>
							{invoice.taxRate != null && invoice.taxRate > 0 && (
								<div className="flex justify-between py-1">
									<span className="text-xs text-[#64748b]">
										Tax ({invoice.taxRate}%)
									</span>
									<span className="text-xs font-medium text-[#1a1a2e] tabular-nums">
										{formatCurrency(invoice.taxAmount)}
									</span>
								</div>
							)}
							<div className="border-b border-[#e2e8f0] my-1" />
							<div className="flex justify-between items-center rounded-md bg-[#0d9488] px-3.5 py-2.5 mt-1.5">
								<span className="font-serif text-sm text-white">TOTAL</span>
								<span className="font-serif text-sm text-white tabular-nums">
									{formatCurrency(invoice.totalAmount)}
								</span>
							</div>
						</div>
					</div>

					{/* Notes */}
					{invoice.notes && (
						<div className="rounded-md bg-[#f1f5f9] p-3.5">
							<p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] mb-1.5">
								Notes
							</p>
							<p className="text-xs text-[#475569] leading-relaxed whitespace-pre-line">
								{invoice.notes}
							</p>
						</div>
					)}

					{/* Footer */}
					<div className="border-t border-[#e2e8f0] pt-3 flex justify-between items-center">
						<span className="text-[11px] font-medium text-[#0d9488]">
							Thank you for your business
						</span>
						<span className="text-[10px] text-[#64748b]">
							{invoice.invoiceNumber} | {invoice.clientName}
						</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

// --- Main Component ---

export function InvoiceDetail({ invoice, accounts }: InvoiceDetailProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [paidDialogOpen, setPaidDialogOpen] = useState(false);

	// Use the invoice's own currency for formatting, falling back to USD
	const formatCurrency = useCallback(
		(value: number) =>
			formatCurrencyUtil(value, { currency: invoice.currency ?? 'USD' }),
		[invoice.currency]
	);

	function handleMarkAsSent() {
		startTransition(async () => {
			const result = await markAsSentAction(invoice.id);
			if (result?.error) {
				toast.error(result.error);
			} else {
				toast.success('Invoice marked as sent');
				router.refresh();
			}
		});
	}

	function handleCancel() {
		startTransition(async () => {
			const result = await cancelInvoiceAction(invoice.id);
			if (result?.error) {
				toast.error(result.error);
			} else {
				toast.success('Invoice cancelled');
				router.refresh();
			}
		});
	}

	function handleDelete() {
		startTransition(async () => {
			const result = await deleteInvoiceAction(invoice.id);
			if (result?.error) {
				toast.error(result.error);
			} else {
				toast.success('Invoice deleted');
				router.push('/invoices');
			}
		});
	}

	return (
		<div className='space-y-6'>
			{/* Header */}
			<Card>
				<CardContent className='pt-6'>
					<div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
						<div className='space-y-1'>
							<div className='flex items-center gap-3'>
								<h2 className='text-xl font-bold font-mono'>
									{invoice.invoiceNumber}
								</h2>
								<InvoiceStatusBadge status={invoice.status} />
							</div>
							<div className='text-sm text-muted-foreground space-y-0.5'>
								<p>
									Issue Date:{' '}
									{format(new Date(invoice.issueDate), 'MMM d, yyyy')}
								</p>
								<p>
									Due:{' '}
									{format(new Date(invoice.dueDate), 'MMM d, yyyy')}
								</p>
								{invoice.paidAt && (
									<p>
										Paid:{' '}
										{format(new Date(invoice.paidAt), 'MMM d, yyyy')}
									</p>
								)}
								{invoice.currency && (
									<p>Currency: {invoice.currency}</p>
								)}
							</div>
						</div>

						{/* Actions */}
						<div className='flex flex-wrap gap-2'>
							{invoice.status === 'DRAFT' && (
								<>
									<Button
										onClick={handleMarkAsSent}
										disabled={isPending}
									>
										{isPending ? (
											<Loader2 className='mr-2 h-4 w-4 animate-spin' />
										) : (
											<Send className='mr-2 h-4 w-4' />
										)}
										Record as Sent
									</Button>
									<Button variant='outline' asChild>
										<Link href={`/invoices/${invoice.id}/edit`}>
											<Pencil className='mr-2 h-4 w-4' />
											Edit
										</Link>
									</Button>
									<Button
										variant='outline'
										asChild
									>
										<a
											href={`/api/invoices/${invoice.id}/pdf`}
											target='_blank'
											rel='noopener noreferrer'
										>
											<Download className='mr-2 h-4 w-4' />
											Download PDF
										</a>
									</Button>
									<Button
										variant='destructive'
										onClick={handleDelete}
										disabled={isPending}
									>
										<Trash2 className='mr-2 h-4 w-4' />
										Delete
									</Button>
								</>
							)}

							{(invoice.status === 'SENT' || invoice.status === 'OVERDUE') && (
								<>
									<Button onClick={() => setPaidDialogOpen(true)}>
										<CheckCircle className='mr-2 h-4 w-4' />
										Mark as Paid
									</Button>
									<Button
										variant='outline'
										asChild
									>
										<a
											href={`/api/invoices/${invoice.id}/pdf`}
											target='_blank'
											rel='noopener noreferrer'
										>
											<Download className='mr-2 h-4 w-4' />
											Download PDF
										</a>
									</Button>
									<Button
										variant='outline'
										onClick={handleCancel}
										disabled={isPending}
									>
										<XCircle className='mr-2 h-4 w-4' />
										Cancel Invoice
									</Button>
								</>
							)}

							{(invoice.status === 'PAID' ||
								invoice.status === 'CANCELLED') && (
								<Button variant='outline' asChild>
									<a
										href={`/api/invoices/${invoice.id}/pdf`}
										target='_blank'
										rel='noopener noreferrer'
									>
										<Download className='mr-2 h-4 w-4' />
										Download PDF
									</a>
								</Button>
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			<div className='grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]'>
				<div className='space-y-6'>
					{/* Client Info */}
					<Card>
						<CardHeader>
							<CardTitle className='text-base'>Client</CardTitle>
						</CardHeader>
						<CardContent className='space-y-1 text-sm'>
							<p className='font-semibold'>{invoice.clientName}</p>
							{invoice.clientEmail && (
								<p className='text-muted-foreground'>{invoice.clientEmail}</p>
							)}
							{invoice.clientPhone && (
								<p className='text-muted-foreground'>{invoice.clientPhone}</p>
							)}
							{invoice.clientAddress && (
								<p className='text-muted-foreground whitespace-pre-line'>
									{invoice.clientAddress}
								</p>
							)}
						</CardContent>
					</Card>

					{/* Line Items */}
					<Card>
						<CardHeader>
							<CardTitle className='text-base'>Line Items</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='rounded-md border'>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Description</TableHead>
											<TableHead className='w-[80px] text-right'>
												Qty
											</TableHead>
											<TableHead className='w-[120px] text-right'>
												Rate
											</TableHead>
											<TableHead className='w-[120px] text-right'>
												Amount
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{invoice.lineItems.map((item) => (
											<TableRow key={item.id}>
												<TableCell>{item.description}</TableCell>
												<TableCell className='text-right tabular-nums'>
													{item.quantity}
												</TableCell>
												<TableCell className='text-right tabular-nums'>
													{formatCurrency(item.unitPrice)}
												</TableCell>
												<TableCell className='text-right tabular-nums'>
													{formatCurrency(item.amount)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						</CardContent>
					</Card>

					{/* Notes */}
					{invoice.notes && (
						<Card>
							<CardHeader>
								<CardTitle className='text-base'>Notes</CardTitle>
							</CardHeader>
							<CardContent>
								<p className='text-sm text-muted-foreground whitespace-pre-line'>
									{invoice.notes}
								</p>
							</CardContent>
						</Card>
					)}
				</div>

				{/* Totals + Payment Info */}
				<div className='space-y-6'>
					<Card>
						<CardHeader>
							<CardTitle className='text-base'>Summary</CardTitle>
						</CardHeader>
						<CardContent className='space-y-3 text-sm'>
							<div className='flex justify-between'>
								<span className='text-muted-foreground'>Subtotal</span>
								<span className='tabular-nums'>
									{formatCurrency(invoice.subtotal)}
								</span>
							</div>
							{invoice.taxRate != null && invoice.taxRate > 0 && (
								<div className='flex justify-between'>
									<span className='text-muted-foreground'>
										Tax ({invoice.taxRate}%)
									</span>
									<span className='tabular-nums'>
										{formatCurrency(invoice.taxAmount)}
									</span>
								</div>
							)}
							<Separator />
							<div className='flex justify-between font-semibold text-base'>
								<span>Total</span>
								<span className='tabular-nums'>
									{formatCurrency(invoice.totalAmount)}
								</span>
							</div>
						</CardContent>
					</Card>

					{/* Linked Income */}
					{invoice.status === 'PAID' && invoice.linkedIncome && (
						<Card>
							<CardHeader>
								<CardTitle className='text-base'>Payment</CardTitle>
							</CardHeader>
							<CardContent className='space-y-2 text-sm'>
								<div className='flex justify-between'>
									<span className='text-muted-foreground'>Account</span>
									<span>
										{invoice.linkedIncome.account?.name ?? 'Unknown'}
									</span>
								</div>
								{invoice.paidAt && (
									<div className='flex justify-between'>
										<span className='text-muted-foreground'>Date</span>
										<span>
											{format(new Date(invoice.paidAt), 'MMM d, yyyy')}
										</span>
									</div>
								)}
								<div className='flex justify-between'>
									<span className='text-muted-foreground'>Linked Transaction</span>
									<span className='truncate max-w-[140px]'>
										{invoice.linkedIncome.description}
									</span>
								</div>
							</CardContent>
						</Card>
					)}
				</div>
			</div>

			{/* Invoice Preview */}
			<InvoicePreview invoice={invoice} formatCurrency={formatCurrency} />

			<MarkAsPaidDialog
				invoiceId={invoice.id}
				accounts={accounts}
				open={paidDialogOpen}
				onSuccess={() => router.refresh()}
				onClose={() => setPaidDialogOpen(false)}
			/>
		</div>
	);
}
