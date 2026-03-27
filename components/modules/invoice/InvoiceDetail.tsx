'use client';

import { useState, useTransition } from 'react';
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
import { useCurrency } from '@/lib/contexts/currency-context';
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

export function InvoiceDetail({ invoice, accounts }: InvoiceDetailProps) {
	const router = useRouter();
	const { formatCurrency } = useCurrency();
	const [isPending, startTransition] = useTransition();
	const [paidDialogOpen, setPaidDialogOpen] = useState(false);

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
									Issued:{' '}
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
										Mark as Sent
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
											PDF
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
											PDF
										</a>
									</Button>
									<Button
										variant='outline'
										onClick={handleCancel}
										disabled={isPending}
									>
										<XCircle className='mr-2 h-4 w-4' />
										Cancel
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
												Unit Price
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
									<span className='text-muted-foreground'>Reference</span>
									<span className='truncate max-w-[140px]'>
										{invoice.linkedIncome.description}
									</span>
								</div>
							</CardContent>
						</Card>
					)}
				</div>
			</div>

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
