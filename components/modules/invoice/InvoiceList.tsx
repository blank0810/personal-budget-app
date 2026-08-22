'use client';

import { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	SortableHeader,
	TablePagination,
	useTableSort,
} from '@/components/common/data-table';
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
import { formatCurrency } from '@/lib/formatters';
import {
	cancelInvoiceAction,
	deleteInvoiceAction,
} from '@/server/modules/invoice/invoice.controller';
import { toast } from 'sonner';
import {
	MoreHorizontal,
	Eye,
	Pencil,
	Download,
	XCircle,
	Trash2,
} from 'lucide-react';
import { InvoiceStatus } from '@prisma/client';
import { billedPartyName } from '@/lib/invoice-party';

export interface InvoiceRow {
	id: string;
	invoiceNumber: string;
	companyName: string | null;
	clientName: string | null;
	totalAmount: number;
	currency: string;
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

const PAGE_SIZE = 10;

type SortField =
	| 'invoiceNumber'
	| 'clientName'
	| 'totalAmount'
	| 'issueDate'
	| 'dueDate';

export function InvoiceList({ invoices }: InvoiceListProps) {
	const [activeTab, setActiveTab] = useState('ALL');
	const [isPending, startTransition] = useTransition();
	const [loadingId, setLoadingId] = useState<string | null>(null);
	const { sortField, sortDir, toggleSort } =
		useTableSort<SortField>('issueDate');
	const [page, setPage] = useState(0);

	const filtered =
		activeTab === 'ALL'
			? invoices
			: invoices.filter((inv) => inv.status === activeTab);

	const sorted = useMemo(() => {
		return [...filtered].sort((a, b) => {
			let cmp = 0;
			switch (sortField) {
				case 'invoiceNumber':
					cmp = a.invoiceNumber.localeCompare(b.invoiceNumber);
					break;
				case 'clientName':
					cmp = billedPartyName(a).localeCompare(billedPartyName(b));
					break;
				case 'totalAmount':
					cmp = a.totalAmount - b.totalAmount;
					break;
				case 'issueDate':
					cmp =
						new Date(a.issueDate).getTime() -
						new Date(b.issueDate).getTime();
					break;
				case 'dueDate':
					cmp =
						new Date(a.dueDate).getTime() -
						new Date(b.dueDate).getTime();
					break;
			}
			return sortDir === 'asc' ? cmp : -cmp;
		});
	}, [filtered, sortField, sortDir]);

	const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
	const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

	function handleTabChange(value: string) {
		setActiveTab(value);
		setPage(0);
	}

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
			<Tabs value={activeTab} onValueChange={handleTabChange}>
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
					<p className='text-muted-foreground text-sm'>
						No invoices found.
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
									sortField={sortField}
									onSort={toggleSort}
								/>
								<SortableHeader
									field='clientName'
									label='Billed To'
									sortField={sortField}
									onSort={toggleSort}
								/>
								<SortableHeader
									field='totalAmount'
									label='Total'
									sortField={sortField}
									onSort={toggleSort}
								/>
								<SortableHeader
									field='issueDate'
									label='Issue Date'
									sortField={sortField}
									onSort={toggleSort}
								/>
								<SortableHeader
									field='dueDate'
									label='Due Date'
									sortField={sortField}
									onSort={toggleSort}
								/>
								<TableHead>Status</TableHead>
								<TableHead className='w-[80px] text-right'>
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{paged.map((invoice) => (
								<TableRow key={invoice.id}>
									<TableCell className='font-mono text-sm font-medium'>
										<Link
											href={`/invoices/${invoice.id}`}
											className='hover:underline'
										>
											{invoice.invoiceNumber}
										</Link>
									</TableCell>
									<TableCell>
										{invoice.companyName?.trim() ? (
											<>
												<div>{billedPartyName(invoice)}</div>
												{invoice.clientName?.trim() ? (
													<div className='text-xs text-muted-foreground'>
														Attn: {invoice.clientName}
													</div>
												) : null}
											</>
										) : (
											invoice.clientName
										)}
									</TableCell>
									<TableCell>
										{formatCurrency(invoice.totalAmount, {
											currency: invoice.currency,
										})}
									</TableCell>
									<TableCell>
										{format(
											new Date(invoice.issueDate),
											'MMM d, yyyy',
										)}
									</TableCell>
									<TableCell>
										{format(
											new Date(invoice.dueDate),
											'MMM d, yyyy',
										)}
									</TableCell>
									<TableCell>
										<InvoiceStatusBadge
											status={invoice.status}
										/>
									</TableCell>
									<TableCell className='text-right'>
										<div className='flex items-center justify-end gap-1'>
											<Button
												variant='ghost'
												size='icon'
												className='h-7 w-7'
												asChild
											>
												<Link
													href={`/invoices/${invoice.id}`}
												>
													<Eye className='h-3.5 w-3.5' />
													<span className='sr-only'>
														View
													</span>
												</Link>
											</Button>
											{invoice.status === 'DRAFT' && (
												<Button
													variant='ghost'
													size='icon'
													className='h-7 w-7'
													asChild
												>
													<Link
														href={`/invoices/${invoice.id}/edit`}
													>
														<Pencil className='h-3.5 w-3.5' />
														<span className='sr-only'>
															Edit
														</span>
													</Link>
												</Button>
											)}
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														variant='ghost'
														size='icon'
														className='h-7 w-7'
														disabled={
															isPending &&
															loadingId ===
																invoice.id
														}
													>
														<MoreHorizontal className='h-4 w-4' />
														<span className='sr-only'>
															Actions
														</span>
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align='end'>
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
													{(invoice.status ===
														'DRAFT' ||
														invoice.status ===
															'SENT' ||
														invoice.status ===
															'OVERDUE') && (
														<>
															<DropdownMenuSeparator />
															{invoice.status ===
															'DRAFT' ? (
																<DropdownMenuItem
																	className='text-destructive focus:text-destructive'
																	onClick={() =>
																		handleDelete(
																			invoice.id,
																		)
																	}
																>
																	<Trash2 className='mr-2 h-4 w-4' />
																	Delete
																</DropdownMenuItem>
															) : (
																<DropdownMenuItem
																	className='text-destructive focus:text-destructive'
																	onClick={() =>
																		handleCancel(
																			invoice.id,
																		)
																	}
																>
																	<XCircle className='mr-2 h-4 w-4' />
																	Cancel
																	Invoice
																</DropdownMenuItem>
															)}
														</>
													)}
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
					<TablePagination
						page={page}
						totalPages={totalPages}
						totalRows={sorted.length}
						rowLabel='invoice'
						onPageChange={setPage}
					/>
				</div>
			)}
		</div>
	);
}
