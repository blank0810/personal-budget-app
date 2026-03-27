'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { useCurrency } from '@/lib/contexts/currency-context';
import {
	cancelInvoiceAction,
	deleteInvoiceAction,
} from '@/server/modules/invoice/invoice.controller';
import { toast } from 'sonner';
import { MoreHorizontal, Eye, Pencil, Download, XCircle, Trash2 } from 'lucide-react';
import { InvoiceStatus } from '@prisma/client';

export interface InvoiceRow {
	id: string;
	invoiceNumber: string;
	clientName: string;
	totalAmount: number;
	issueDate: string | Date;
	dueDate: string | Date;
	status: InvoiceStatus;
}

interface InvoiceListProps {
	invoices: InvoiceRow[];
}

const STATUS_TABS: { value: string; label: string }[] = [
	{ value: 'ALL', label: 'All' },
	{ value: 'DRAFT', label: 'Draft' },
	{ value: 'SENT', label: 'Sent' },
	{ value: 'OVERDUE', label: 'Overdue' },
	{ value: 'PAID', label: 'Paid' },
	{ value: 'CANCELLED', label: 'Cancelled' },
];

export function InvoiceList({ invoices }: InvoiceListProps) {
	const { formatCurrency } = useCurrency();
	const [activeTab, setActiveTab] = useState('ALL');
	const [isPending, startTransition] = useTransition();
	const [loadingId, setLoadingId] = useState<string | null>(null);

	const filtered =
		activeTab === 'ALL'
			? invoices
			: invoices.filter((inv) => inv.status === activeTab);

	function handleCancel(id: string) {
		setLoadingId(id);
		startTransition(async () => {
			const result = await cancelInvoiceAction(id);
			setLoadingId(null);
			if (result?.error) {
				toast.error(result.error);
			} else {
				toast.success('Invoice cancelled');
			}
		});
	}

	function handleDelete(id: string) {
		setLoadingId(id);
		startTransition(async () => {
			const result = await deleteInvoiceAction(id);
			setLoadingId(null);
			if (result?.error) {
				toast.error(result.error);
			} else {
				toast.success('Invoice deleted');
			}
		});
	}

	return (
		<div className='space-y-4'>
			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList className='flex-wrap h-auto'>
					{STATUS_TABS.map((tab) => (
						<TabsTrigger key={tab.value} value={tab.value}>
							{tab.label}
						</TabsTrigger>
					))}
				</TabsList>
			</Tabs>

			{filtered.length === 0 ? (
				<div className='rounded-lg border border-dashed p-8 text-center'>
					<p className='text-muted-foreground text-sm'>No invoices found.</p>
				</div>
			) : (
				<div className='rounded-md border'>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Invoice #</TableHead>
								<TableHead>Client</TableHead>
								<TableHead>Amount</TableHead>
								<TableHead>Issue Date</TableHead>
								<TableHead>Due Date</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className='w-[60px]'></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filtered.map((invoice) => (
								<TableRow key={invoice.id}>
									<TableCell className='font-mono text-sm font-medium'>
										<Link
											href={`/invoices/${invoice.id}`}
											className='hover:underline'
										>
											{invoice.invoiceNumber}
										</Link>
									</TableCell>
									<TableCell>{invoice.clientName}</TableCell>
									<TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
									<TableCell>
										{format(new Date(invoice.issueDate), 'MMM d, yyyy')}
									</TableCell>
									<TableCell>
										{format(new Date(invoice.dueDate), 'MMM d, yyyy')}
									</TableCell>
									<TableCell>
										<InvoiceStatusBadge status={invoice.status} />
									</TableCell>
									<TableCell>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													variant='ghost'
													size='icon'
													disabled={
														isPending && loadingId === invoice.id
													}
												>
													<MoreHorizontal className='h-4 w-4' />
													<span className='sr-only'>Actions</span>
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align='end'>
												<DropdownMenuItem asChild>
													<Link href={`/invoices/${invoice.id}`}>
														<Eye className='mr-2 h-4 w-4' />
														View
													</Link>
												</DropdownMenuItem>
												{invoice.status === 'DRAFT' && (
													<DropdownMenuItem asChild>
														<Link
															href={`/invoices/${invoice.id}/edit`}
														>
															<Pencil className='mr-2 h-4 w-4' />
															Edit
														</Link>
													</DropdownMenuItem>
												)}
												<DropdownMenuItem asChild>
													<a
														href={`/api/invoices/${invoice.id}/pdf`}
														target='_blank'
														rel='noopener noreferrer'
													>
														<Download className='mr-2 h-4 w-4' />
														Download PDF
													</a>
												</DropdownMenuItem>
												{(invoice.status === 'DRAFT' ||
													invoice.status === 'SENT' ||
													invoice.status === 'OVERDUE') && (
													<>
														<DropdownMenuSeparator />
														{invoice.status === 'DRAFT' ? (
															<DropdownMenuItem
																className='text-destructive focus:text-destructive'
																onClick={() =>
																	handleDelete(invoice.id)
																}
															>
																<Trash2 className='mr-2 h-4 w-4' />
																Delete
															</DropdownMenuItem>
														) : (
															<DropdownMenuItem
																className='text-destructive focus:text-destructive'
																onClick={() =>
																	handleCancel(invoice.id)
																}
															>
																<XCircle className='mr-2 h-4 w-4' />
																Cancel
															</DropdownMenuItem>
														)}
													</>
												)}
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	);
}
