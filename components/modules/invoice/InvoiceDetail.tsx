'use client';

import { useState, useTransition, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { MarkAsPaidDialog } from './MarkAsPaidDialog';
import { formatCurrency as formatCurrencyUtil } from '@/lib/formatters';
import {
	markAsSentAction,
	cancelInvoiceAction,
	deleteInvoiceAction,
} from '@/server/modules/invoice/invoice.controller';
import { toast } from 'sonner';
import {
	Loader2,
	Pencil,
	Download,
	XCircle,
	Trash2,
	Send,
	CheckCircle,
	ArrowLeft,
} from 'lucide-react';
import { InvoiceStatus } from '@prisma/client';

interface LineItem {
	id: string;
	description: string;
	quantity: number;
	unitPrice: number;
	amount: number;
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
}

// --- Invoice Preview Status Stamp ---

function InvoicePreviewStatusStamp({ status }: { status: InvoiceStatus }) {
	if (status === 'DRAFT') {
		return (
			<div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
				<span
					className="text-[80px] font-bold tracking-[12px] text-[#111111] select-none"
					style={{ opacity: 0.05, transform: 'rotate(-35deg)' }}
				>
					DRAFT
				</span>
			</div>
		);
	}

	if (status === 'PAID') {
		return (
			<div
				className="absolute top-8 right-8"
				style={{ transform: 'rotate(-12deg)' }}
			>
				<div className="rounded border-[3px] border-[#16a34a] px-4 py-1.5 opacity-75">
					<span className="text-xl font-bold tracking-[3px] text-[#16a34a]">
						PAID
					</span>
				</div>
			</div>
		);
	}

	if (status === 'OVERDUE') {
		return (
			<div
				className="absolute top-8 right-8"
				style={{ transform: 'rotate(-12deg)' }}
			>
				<div className="rounded border-[3px] border-[#dc2626] px-4 py-1.5 opacity-75">
					<span className="text-xl font-bold tracking-[3px] text-[#dc2626]">
						OVERDUE
					</span>
				</div>
			</div>
		);
	}

	if (status === 'CANCELLED') {
		return (
			<div
				className="absolute top-8 right-8"
				style={{ transform: 'rotate(-12deg)' }}
			>
				<div className="rounded border-[3px] border-[#9ca3af] px-4 py-1.5 opacity-75">
					<span className="text-xl font-bold tracking-[3px] text-[#9ca3af] line-through">
						CANCELLED
					</span>
				</div>
			</div>
		);
	}

	return null;
}

// --- Invoice Preview (document-style) ---

function InvoicePreview({
	invoice,
	formatCurrency,
}: {
	invoice: InvoiceWithDetails;
	formatCurrency: (value: number) => string;
}) {
	return (
		<div className="mx-auto w-full max-w-[800px]">
			<Card className="shadow-lg">
				<CardContent className="p-0">
					<div
						className="relative bg-white p-10 sm:p-12"
						style={{ fontFamily: 'system-ui, sans-serif' }}
					>
						<InvoicePreviewStatusStamp status={invoice.status} />

						{/* Header: INVOICE title + metadata stack */}
						<div className="flex items-start justify-between mb-8">
							<h2 className="font-serif text-3xl font-bold text-[#111111]">
								INVOICE
							</h2>
							<div className="text-right space-y-0.5">
								<div className="flex items-baseline justify-end gap-2">
									<span className="text-xs text-[#6b7280]">
										Invoice #
									</span>
									<span className="text-sm font-bold text-[#111111]">
										{invoice.invoiceNumber}
									</span>
								</div>
								<div className="flex items-baseline justify-end gap-2">
									<span className="text-xs text-[#6b7280]">
										Issue Date
									</span>
									<span className="text-sm text-[#111111]">
										{format(new Date(invoice.issueDate), 'MMM d, yyyy')}
									</span>
								</div>
								<div className="flex items-baseline justify-end gap-2">
									<span className="text-xs text-[#6b7280]">
										Due Date
									</span>
									<span className="text-sm text-[#111111]">
										{format(new Date(invoice.dueDate), 'MMM d, yyyy')}
									</span>
								</div>
							</div>
						</div>

						{/* Separator */}
						<div className="border-b border-[#e5e5e5] mb-6" />

						{/* Bill To */}
						<div className="mb-7">
							<p className="text-[11px] font-bold uppercase tracking-wider text-[#6b7280] mb-1.5">
								Bill To
							</p>
							<p className="text-sm font-bold text-[#111111]">
								{invoice.clientName}
							</p>
							{invoice.clientEmail && (
								<p className="text-xs text-[#4b5563]">
									{invoice.clientEmail}
								</p>
							)}
							{invoice.clientPhone && (
								<p className="text-xs text-[#4b5563]">
									{invoice.clientPhone}
								</p>
							)}
							{invoice.clientAddress && (
								<p className="text-xs text-[#4b5563] whitespace-pre-line">
									{invoice.clientAddress}
								</p>
							)}
						</div>

						{/* Line Items Table */}
						<div className="mb-7">
							<table className="w-full text-sm">
								<thead>
									<tr className="bg-[#f5f5f5] border-b border-[#e5e5e5]">
										<th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-[#4b5563]">
											Description
										</th>
										<th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-[#4b5563] w-20">
											Hrs/Qty
										</th>
										<th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-[#4b5563] w-24">
											Rate
										</th>
										<th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-[#4b5563] w-28">
											Amount
										</th>
									</tr>
								</thead>
								<tbody>
									{invoice.lineItems.map((item) => (
										<tr
											key={item.id}
											className="border-b border-[#e5e5e5]"
										>
											<td className="px-3 py-2.5 text-[#4b5563]">
												{item.description}
											</td>
											<td className="px-3 py-2.5 text-right text-[#4b5563] tabular-nums">
												{item.quantity}
											</td>
											<td className="px-3 py-2.5 text-right text-[#4b5563] tabular-nums">
												{formatCurrency(item.unitPrice)}
											</td>
											<td className="px-3 py-2.5 text-right font-bold text-[#111111] tabular-nums">
												{formatCurrency(item.amount)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{/* Totals */}
						<div className="flex justify-end mb-7">
							<div className="w-56 space-y-1">
								<div className="flex justify-between py-1">
									<span className="text-sm text-[#6b7280]">Subtotal</span>
									<span className="text-sm text-[#111111] tabular-nums">
										{formatCurrency(invoice.subtotal)}
									</span>
								</div>
								{invoice.taxRate != null && invoice.taxRate > 0 && (
									<div className="flex justify-between py-1">
										<span className="text-sm text-[#6b7280]">
											Tax ({invoice.taxRate}%)
										</span>
										<span className="text-sm text-[#111111] tabular-nums">
											{formatCurrency(invoice.taxAmount)}
										</span>
									</div>
								)}
								<div className="border-t-2 border-[#111111] mt-2 pt-2">
									<div className="flex justify-between">
										<span className="text-base font-bold text-[#111111]">
											Total
										</span>
										<span className="text-base font-bold text-[#111111] tabular-nums">
											{formatCurrency(invoice.totalAmount)}
										</span>
									</div>
								</div>
							</div>
						</div>

						{/* Notes */}
						{invoice.notes && (
							<div className="mb-4">
								<p className="text-[11px] font-bold uppercase tracking-wider text-[#6b7280] mb-1">
									Notes
								</p>
								<p className="text-xs text-[#4b5563] leading-relaxed whitespace-pre-line">
									{invoice.notes}
								</p>
							</div>
						)}

						{/* Footer */}
						<div className="border-t border-[#e5e5e5] pt-3 flex justify-end">
							<span className="text-[10px] text-[#6b7280]">
								{invoice.invoiceNumber}
							</span>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

// --- Main Component ---

export function InvoiceDetail({ invoice }: InvoiceDetailProps) {
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
		<div className="space-y-6">
			{/* Back link */}
			<Link
				href="/invoices"
				className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
			>
				<ArrowLeft className="h-4 w-4" />
				Back to Invoices
			</Link>

			{/* Header bar: Invoice # + Status + Actions */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-3">
					<h2 className="text-xl font-bold font-mono">
						{invoice.invoiceNumber}
					</h2>
					<InvoiceStatusBadge status={invoice.status} />
					{invoice.paidAt && (
						<span className="text-sm text-muted-foreground">
							Paid {format(new Date(invoice.paidAt), 'MMM d, yyyy')}
						</span>
					)}
					{invoice.linkedIncome && (
						<span className="text-sm text-muted-foreground">
							via {invoice.linkedIncome.account?.name ?? 'Unknown'}
						</span>
					)}
				</div>

				<div className="flex flex-wrap gap-2">
					{invoice.status === 'DRAFT' && (
						<>
							<Button
								onClick={handleMarkAsSent}
								disabled={isPending}
							>
								{isPending ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Send className="mr-2 h-4 w-4" />
								)}
								Record as Sent
							</Button>
							<Button variant="outline" asChild>
								<Link href={`/invoices/${invoice.id}/edit`}>
									<Pencil className="mr-2 h-4 w-4" />
									Edit
								</Link>
							</Button>
							<Button variant="outline" asChild>
								<a
									href={`/api/invoices/${invoice.id}/pdf`}
									target="_blank"
									rel="noopener noreferrer"
								>
									<Download className="mr-2 h-4 w-4" />
									Download PDF
								</a>
							</Button>
							<Button
								variant="destructive"
								onClick={handleDelete}
								disabled={isPending}
							>
								<Trash2 className="mr-2 h-4 w-4" />
								Delete
							</Button>
						</>
					)}

					{(invoice.status === 'SENT' ||
						invoice.status === 'OVERDUE') && (
						<>
							<Button onClick={() => setPaidDialogOpen(true)}>
								<CheckCircle className="mr-2 h-4 w-4" />
								Mark as Paid
							</Button>
							<Button variant="outline" asChild>
								<a
									href={`/api/invoices/${invoice.id}/pdf`}
									target="_blank"
									rel="noopener noreferrer"
								>
									<Download className="mr-2 h-4 w-4" />
									Download PDF
								</a>
							</Button>
							<Button
								variant="outline"
								onClick={handleCancel}
								disabled={isPending}
							>
								<XCircle className="mr-2 h-4 w-4" />
								Cancel Invoice
							</Button>
						</>
					)}

					{(invoice.status === 'PAID' ||
						invoice.status === 'CANCELLED') && (
						<Button variant="outline" asChild>
							<a
								href={`/api/invoices/${invoice.id}/pdf`}
								target="_blank"
								rel="noopener noreferrer"
							>
								<Download className="mr-2 h-4 w-4" />
								Download PDF
							</a>
						</Button>
					)}
				</div>
			</div>

			{/* Invoice Preview — the primary content */}
			<InvoicePreview
				invoice={invoice}
				formatCurrency={formatCurrency}
			/>

			<MarkAsPaidDialog
				invoiceId={invoice.id}
				open={paidDialogOpen}
				onSuccess={() => router.refresh()}
				onClose={() => setPaidDialogOpen(false)}
			/>
		</div>
	);
}
