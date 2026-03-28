'use client';

import { useState, useTransition, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { toast } from 'sonner';
import { Pencil, Trash2, FileText, Loader2, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { WorkEntryStatusBadge } from './WorkEntryStatusBadge';
import { GenerateInvoiceDialog } from './GenerateInvoiceDialog';
import {
	updateWorkEntryAction,
	deleteWorkEntryAction,
	getUnbilledByClientAction,
} from '@/server/modules/work-entry/work-entry.controller';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

// Serialized types (Decimals converted to numbers by serialize())
export interface WorkEntryRow {
	id: string;
	description: string;
	date: string | Date;
	quantity: number;
	unitPrice: number;
	amount: number;
	status: string;
	currency: string;
	lastInvoiceId: string | null;
	lastInvoiceNumber: string | null;
	clientId: string;
	client: {
		id: string;
		name: string;
		currency?: string;
	};
}

interface ClientOption {
	id: string;
	name: string;
	defaultRate: number | null;
}

export interface UnbilledCount {
	clientId: string;
	clientName: string;
	count: number;
	total: number;
}

interface WorkEntryListProps {
	initialEntries: WorkEntryRow[];
	initialTotal: number;
	unbilledCounts: UnbilledCount[];
	clients: ClientOption[];
}

// Deterministic color per client name for the small badge
const CLIENT_COLORS = [
	'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
	'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
	'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
	'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
	'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
	'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
];

function clientColorClass(clientId: string): string {
	let hash = 0;
	for (let i = 0; i < clientId.length; i++) {
		hash = (hash * 31 + clientId.charCodeAt(i)) >>> 0;
	}
	return CLIENT_COLORS[hash % CLIENT_COLORS.length];
}

function toDateKey(date: string | Date): string {
	if (typeof date === 'string') {
		if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
		return date.slice(0, 10);
	}
	return format(date, 'yyyy-MM-dd');
}

function formatDate(date: string | Date): string {
	return format(parseISO(toDateKey(date)), 'MMM d, yyyy');
}

function formatGroupDate(dateKey: string): string {
	return format(parseISO(dateKey), 'EEEE, MMM d, yyyy');
}

const PAGE_SIZE = 20;

type SortField = 'date' | 'client' | 'amount';

interface SortableHeaderProps {
	field: SortField;
	label: string;
	sortField: SortField;
	onSort: (field: SortField) => void;
	className?: string;
}

function SortableHeader({ field, label, sortField, onSort, className }: SortableHeaderProps) {
	const isActive = sortField === field;
	return (
		<TableHead className={className}>
			<Button
				variant='ghost'
				size='sm'
				className='-ml-3 h-8'
				onClick={() => onSort(field)}
			>
				{label}
				<ArrowUpDown
					className={cn(
						'ml-1 h-3 w-3',
						isActive ? 'opacity-100' : 'opacity-40',
					)}
				/>
			</Button>
		</TableHead>
	);
}

interface EditDialogProps {
	entry: WorkEntryRow;
	clients: ClientOption[];
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

function EditDialog({ entry, clients, open, onOpenChange }: EditDialogProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [form, setForm] = useState({
		clientId: entry.clientId,
		date: toDateKey(entry.date),
		description: entry.description,
		quantity: String(entry.quantity),
		unitPrice: String(entry.unitPrice),
	});

	function handleChange(field: string, value: string) {
		setForm((prev) => ({ ...prev, [field]: value }));
	}

	function handleClientChange(clientId: string) {
		const client = clients.find((c) => c.id === clientId);
		setForm((prev) => ({
			...prev,
			clientId,
			unitPrice:
				client?.defaultRate != null
					? String(client.defaultRate)
					: prev.unitPrice,
		}));
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		startTransition(async () => {
			const result = await updateWorkEntryAction({
				id: entry.id,
				clientId: form.clientId,
				description: form.description,
				date: new Date(form.date),
				quantity: parseFloat(form.quantity),
				unitPrice: parseFloat(form.unitPrice),
			});

			if (result?.error) {
				toast.error(result.error);
			} else {
				toast.success('Entry updated');
				onOpenChange(false);
				router.refresh();
			}
		});
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='max-w-md'>
				<DialogHeader>
					<DialogTitle>Edit Entry</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className='space-y-4'>
					<div className='space-y-1.5'>
						<Label htmlFor='edit-client'>Client</Label>
						<Select
							value={form.clientId}
							onValueChange={handleClientChange}
						>
							<SelectTrigger id='edit-client' className='w-full'>
								<SelectValue placeholder='Select client...' />
							</SelectTrigger>
							<SelectContent>
								{clients.map((c) => (
									<SelectItem key={c.id} value={c.id}>
										{c.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className='space-y-1.5'>
						<Label htmlFor='edit-date'>Date</Label>
						<Input
							id='edit-date'
							type='date'
							value={form.date}
							onChange={(e) => handleChange('date', e.target.value)}
							required
						/>
					</div>

					<div className='space-y-1.5'>
						<Label htmlFor='edit-description'>Description</Label>
						<Textarea
							id='edit-description'
							value={form.description}
							onChange={(e) => handleChange('description', e.target.value)}
							required
							rows={2}
							className='resize-none'
							onInput={(e) => {
								const target = e.target as HTMLTextAreaElement;
								target.style.height = 'auto';
								target.style.height = target.scrollHeight + 'px';
							}}
						/>
					</div>

					<div className='grid grid-cols-2 gap-3'>
						<div className='space-y-1.5'>
							<Label htmlFor='edit-quantity'>Hours / Qty</Label>
							<Input
								id='edit-quantity'
								type='number'
								min='0.01'
								step='any'
								value={form.quantity}
								onChange={(e) => handleChange('quantity', e.target.value)}
								required
							/>
						</div>
						<div className='space-y-1.5'>
							<Label htmlFor='edit-unitPrice'>Rate</Label>
							<Input
								id='edit-unitPrice'
								type='number'
								min='0'
								step='any'
								value={form.unitPrice}
								onChange={(e) => handleChange('unitPrice', e.target.value)}
								required
							/>
						</div>
					</div>

					<div className='flex justify-end gap-2 pt-2'>
						<Button
							type='button'
							variant='outline'
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type='submit' disabled={isPending}>
							Save Changes
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

type DividerRow = { type: 'divider'; date: string; total: Record<string, number> };
type DisplayRow = WorkEntryRow | DividerRow;

function isDivider(row: DisplayRow): row is DividerRow {
	return 'type' in row && (row as DividerRow).type === 'divider';
}

export function WorkEntryList({ initialEntries, unbilledCounts, clients }: WorkEntryListProps) {
	const entries = initialEntries;
	const router = useRouter();
	const [, startTransition] = useTransition();

	// Filter state — default to this week
	const [clientFilter, setClientFilter] = useState('ALL');
	const [startDate, setStartDate] = useState(() =>
		format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
	);
	const [endDate, setEndDate] = useState(() =>
		format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
	);

	// Sort state — default to date descending
	const [sortField, setSortField] = useState<SortField>('date');
	const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

	// Pagination
	const [page, setPage] = useState(0);

	// Edit dialog state
	const [editingEntry, setEditingEntry] = useState<WorkEntryRow | null>(null);

	// Generate invoice dialog state
	const [generateClientId, setGenerateClientId] = useState<string | null>(null);
	const [generateEntries, setGenerateEntries] = useState<WorkEntryRow[]>([]);
	const [loadingInvoiceClientId, setLoadingInvoiceClientId] = useState<string | null>(null);

	// Reset page when filters or sort changes
	useEffect(() => {
		setPage(0);
	}, [clientFilter, startDate, endDate, sortField, sortDir]);

	// Filtered entries
	const filtered = useMemo(() => {
		return entries.filter((e) => {
			if (clientFilter !== 'ALL' && e.clientId !== clientFilter) return false;
			const dateKey = toDateKey(e.date);
			if (startDate && dateKey < startDate) return false;
			if (endDate && dateKey > endDate) return false;
			return true;
		});
	}, [entries, clientFilter, startDate, endDate]);

	// Sorted entries
	const sorted = useMemo(() => {
		return [...filtered].sort((a, b) => {
			let cmp = 0;
			switch (sortField) {
				case 'date':
					cmp = toDateKey(a.date).localeCompare(toDateKey(b.date));
					break;
				case 'client':
					cmp = a.client.name.localeCompare(b.client.name);
					break;
				case 'amount':
					cmp = a.amount - b.amount;
					break;
			}
			return sortDir === 'asc' ? cmp : -cmp;
		});
	}, [filtered, sortField, sortDir]);

	// Pagination
	const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
	const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

	// Build display rows with optional date dividers
	const displayRows = useMemo<DisplayRow[]>(() => {
		// Only inject dividers when sorting by date
		if (sortField !== 'date') {
			return paged;
		}

		const rows: DisplayRow[] = [];
		let lastDate = '';

		for (const entry of paged) {
			const dateKey = toDateKey(entry.date);
			if (dateKey !== lastDate) {
				// Compute unbilled total for this date across ALL sorted entries (not just paged)
				const dayEntries = sorted.filter(
					(e) => toDateKey(e.date) === dateKey && e.status === 'UNBILLED'
				);
				const dayTotals: Record<string, number> = {};
				for (const e of dayEntries) {
					const cur = e.client?.currency || e.currency || 'USD';
					dayTotals[cur] = (dayTotals[cur] || 0) + e.amount;
				}
				rows.push({ type: 'divider', date: dateKey, total: dayTotals });
				lastDate = dateKey;
			}
			rows.push(entry);
		}
		return rows;
	}, [paged, sorted, sortField]);

	// Unbilled totals across ALL entries (not filtered/paged) for the summary bar
	const currencyTotals = useMemo(() => {
		const totals: Record<string, number> = {};
		for (const e of entries) {
			if (e.status === 'UNBILLED') {
				const cur = e.client?.currency || e.currency || 'USD';
				totals[cur] = (totals[cur] || 0) + e.amount;
			}
		}
		return totals;
	}, [entries]);

	// Use unbilledCounts prop for the "Invoice [Client]" buttons
	const clientsWithUnbilled = unbilledCounts;

	function handleDelete(entryId: string) {
		startTransition(async () => {
			const result = await deleteWorkEntryAction(entryId);
			if (result?.error) {
				toast.error(result.error);
			} else {
				toast.success('Entry deleted');
				router.refresh();
			}
		});
	}

	const handleGenerateInvoice = useCallback(async (clientId: string) => {
		setLoadingInvoiceClientId(clientId);
		try {
			const result = await getUnbilledByClientAction(clientId);
			if (result?.error) {
				toast.error(result.error);
				return;
			}
			if (result.entries) {
				setGenerateEntries(result.entries as unknown as WorkEntryRow[]);
				setGenerateClientId(clientId);
			}
		} catch {
			toast.error('Failed to load unbilled entries');
		} finally {
			setLoadingInvoiceClientId(null);
		}
	}, []);

	function handleSort(field: SortField) {
		if (sortField === field) {
			setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
		} else {
			setSortField(field);
			setSortDir('desc');
		}
	}

	const generateClient = generateClientId
		? clients.find((c) => c.id === generateClientId) ?? null
		: null;

	const generateClientCurrency = useMemo(() => {
		if (!generateClientId || generateEntries.length === 0) return undefined;
		const entry = generateEntries.find((e) => e.clientId === generateClientId);
		return entry?.currency ?? entry?.client?.currency;
	}, [generateClientId, generateEntries]);

	const hasCurrencyTotals = Object.keys(currencyTotals).length > 0;

	return (
		<div className='space-y-4'>
			{/* Unbilled summary bar */}
			{hasCurrencyTotals && (
				<div className='flex items-center gap-4 text-sm text-muted-foreground border rounded-md px-4 py-2'>
					<span className='font-medium text-foreground'>Unbilled:</span>
					{Object.entries(currencyTotals).map(([currency, total]) => (
						<span key={currency} className='tabular-nums'>
							{formatCurrency(total, { currency })}
						</span>
					))}
				</div>
			)}

			{/* Filters */}
			<div className='flex flex-wrap items-end gap-3'>
				<div className='space-y-1.5'>
					<Label htmlFor='filter-client' className='text-xs'>
						Client
					</Label>
					<Select value={clientFilter} onValueChange={setClientFilter}>
						<SelectTrigger id='filter-client' className='w-[160px]'>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='ALL'>All clients</SelectItem>
							{clients.map((c) => (
								<SelectItem key={c.id} value={c.id}>
									{c.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className='space-y-1.5'>
					<Label htmlFor='filter-start' className='text-xs'>
						From
					</Label>
					<Input
						id='filter-start'
						type='date'
						value={startDate}
						onChange={(e) => setStartDate(e.target.value)}
						className='w-[140px]'
					/>
				</div>

				<div className='space-y-1.5'>
					<Label htmlFor='filter-end' className='text-xs'>
						To
					</Label>
					<Input
						id='filter-end'
						type='date'
						value={endDate}
						onChange={(e) => setEndDate(e.target.value)}
						className='w-[140px]'
					/>
				</div>

				{(clientFilter !== 'ALL' || startDate || endDate) && (
					<Button
						variant='ghost'
						size='sm'
						onClick={() => {
							setClientFilter('ALL');
							setStartDate('');
							setEndDate('');
						}}
					>
						Clear filters
					</Button>
				)}

				{clientsWithUnbilled.length > 0 && (
					<div className='ml-auto flex flex-wrap gap-2'>
						{clientsWithUnbilled.map((c) => {
							const isLoading = loadingInvoiceClientId === c.clientId;
							return (
								<Button
									key={c.clientId}
									variant='outline'
									size='sm'
									disabled={isLoading}
									onClick={() => handleGenerateInvoice(c.clientId)}
								>
									{isLoading ? (
										<Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
									) : (
										<FileText className='mr-1.5 h-3.5 w-3.5' />
									)}
									Invoice {c.clientName}
									<span className='ml-1.5 text-xs text-muted-foreground'>
										({c.count})
									</span>
								</Button>
							);
						})}
					</div>
				)}
			</div>

			{/* Table */}
			{filtered.length === 0 ? (
				<div className='rounded-lg border border-dashed p-10 text-center'>
					<p className='text-muted-foreground text-sm'>
						{entries.length === 0
							? 'No entries yet. Add your first billable entry above.'
							: 'No entries match the current filters.'}
					</p>
				</div>
			) : (
				<div className='rounded-md border'>
					<Table>
						<TableHeader>
							<TableRow>
								{/* Mobile: single merged header */}
								<TableHead className='sm:hidden p-3'>Entry</TableHead>

								{/* Desktop columns */}
								<SortableHeader
									field='date'
									label='Date'
									sortField={sortField}
									onSort={handleSort}
									className='hidden sm:table-cell'
								/>
								<SortableHeader
									field='client'
									label='Client'
									sortField={sortField}
									onSort={handleSort}
									className='hidden sm:table-cell'
								/>
								<TableHead className='hidden sm:table-cell'>Description</TableHead>
								<SortableHeader
									field='amount'
									label='Amount'
									sortField={sortField}
									onSort={handleSort}
									className='hidden sm:table-cell text-right'
								/>
								<TableHead className='hidden sm:table-cell'>Status</TableHead>
								<TableHead className='hidden sm:table-cell w-[80px]'>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{displayRows.map((row, idx) => {
								if (isDivider(row)) {
									return (
										<TableRow
											key={`divider-${row.date}-${idx}`}
											className='hover:bg-transparent'
										>
											<TableCell colSpan={7} className='bg-muted/30 py-1.5 px-3'>
												<div className='flex items-center justify-between'>
													<span className='text-xs font-semibold'>
														{formatGroupDate(row.date)}
													</span>
													<span className='text-xs text-muted-foreground tabular-nums'>
														{Object.entries(row.total).map(([cur, total], i) => (
															<span key={cur}>
																{i > 0 && ' | '}
																{formatCurrency(total, { currency: cur })}
															</span>
														))}
													</span>
												</div>
											</TableCell>
										</TableRow>
									);
								}

								const entry = row as WorkEntryRow;
								return (
									<TableRow
										key={entry.id}
										className={cn(
											entry.status !== 'UNBILLED' && 'opacity-75 bg-muted/10',
										)}
									>
										{/* Mobile stacked layout */}
										<TableCell className='sm:hidden p-3' colSpan={7}>
											<div className='flex items-start justify-between gap-2'>
												<div className='min-w-0 flex-1'>
													<div className='flex items-center gap-2 mb-1'>
														<Badge
															variant='secondary'
															className={`text-xs px-1.5 py-0.5 ${clientColorClass(entry.clientId)}`}
														>
															{entry.client.name}
														</Badge>
														<span className='text-xs text-muted-foreground'>
															{formatDate(entry.date)}
														</span>
													</div>
													<p className='text-sm line-clamp-2'>{entry.description}</p>
												</div>
												<div className='text-right shrink-0'>
													<p className='text-sm font-medium tabular-nums'>
														{formatCurrency(entry.amount, {
															currency: entry.client.currency || entry.currency,
														})}
													</p>
													<WorkEntryStatusBadge
														status={entry.status}
														invoiceNumber={entry.lastInvoiceNumber ?? undefined}
														invoiceId={entry.lastInvoiceId ?? undefined}
													/>
												</div>
											</div>
											{entry.status === 'UNBILLED' && (
												<div className='flex justify-end gap-1 mt-2'>
													<Button
														variant='ghost'
														size='icon'
														className='h-7 w-7'
														onClick={() => setEditingEntry(entry)}
													>
														<Pencil className='h-3.5 w-3.5' />
														<span className='sr-only'>Edit</span>
													</Button>
													<Button
														variant='ghost'
														size='icon'
														className='h-7 w-7 text-destructive hover:text-destructive'
														onClick={() => handleDelete(entry.id)}
													>
														<Trash2 className='h-3.5 w-3.5' />
														<span className='sr-only'>Delete</span>
													</Button>
												</div>
											)}
										</TableCell>

										{/* Desktop: Date */}
										<TableCell className='hidden sm:table-cell px-3 py-2.5 text-sm'>
											{formatDate(entry.date)}
										</TableCell>

										{/* Desktop: Client */}
										<TableCell className='hidden sm:table-cell px-3 py-2.5'>
											<Badge
												variant='secondary'
												className={`text-xs px-1.5 py-0.5 ${clientColorClass(entry.clientId)}`}
											>
												{entry.client.name}
											</Badge>
										</TableCell>

										{/* Desktop: Description */}
										<TableCell
											className='hidden sm:table-cell px-3 py-2.5 max-w-[280px]'
											title={entry.description}
										>
											<p className='line-clamp-2 text-sm'>{entry.description}</p>
										</TableCell>

										{/* Desktop: Amount */}
										<TableCell className='hidden sm:table-cell px-3 py-2.5 text-right font-medium tabular-nums'>
											{formatCurrency(entry.amount, {
												currency: entry.client.currency || entry.currency,
											})}
										</TableCell>

										{/* Desktop: Status */}
										<TableCell className='hidden sm:table-cell px-3 py-2.5'>
											<WorkEntryStatusBadge
												status={entry.status}
												invoiceNumber={entry.lastInvoiceNumber ?? undefined}
												invoiceId={entry.lastInvoiceId ?? undefined}
											/>
										</TableCell>

										{/* Desktop: Actions */}
										<TableCell className='hidden sm:table-cell px-3 py-2.5'>
											{entry.status === 'UNBILLED' ? (
												<div className='flex items-center gap-1'>
													<Button
														variant='ghost'
														size='icon'
														className='h-7 w-7'
														onClick={() => setEditingEntry(entry)}
													>
														<Pencil className='h-3.5 w-3.5' />
														<span className='sr-only'>Edit</span>
													</Button>
													<Button
														variant='ghost'
														size='icon'
														className='h-7 w-7 text-destructive hover:text-destructive'
														onClick={() => handleDelete(entry.id)}
													>
														<Trash2 className='h-3.5 w-3.5' />
														<span className='sr-only'>Delete</span>
													</Button>
												</div>
											) : (
												<div className='w-[60px]' />
											)}
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>

					{/* Pagination bar */}
					<div className='flex items-center justify-between px-2 py-3'>
						<p className='text-sm text-muted-foreground'>
							{sorted.length} {sorted.length === 1 ? 'entry' : 'entries'}
						</p>
						{totalPages > 1 && (
							<div className='flex items-center gap-2'>
								<span className='text-sm text-muted-foreground'>
									Page {page + 1} of {totalPages}
								</span>
								<Button
									variant='outline'
									size='sm'
									disabled={page === 0}
									onClick={() => setPage((p) => p - 1)}
								>
									Previous
								</Button>
								<Button
									variant='outline'
									size='sm'
									disabled={page >= totalPages - 1}
									onClick={() => setPage((p) => p + 1)}
								>
									Next
								</Button>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Edit dialog */}
			{editingEntry && (
				<EditDialog
					entry={editingEntry}
					clients={clients}
					open={!!editingEntry}
					onOpenChange={(open) => {
						if (!open) setEditingEntry(null);
					}}
				/>
			)}

			{/* Generate invoice dialog */}
			{generateClient && (
				<GenerateInvoiceDialog
					clientId={generateClient.id}
					clientName={generateClient.name}
					clientCurrency={generateClientCurrency}
					entries={generateEntries}
					open={!!generateClientId}
					onOpenChange={(open) => {
						if (!open) {
							setGenerateClientId(null);
							setGenerateEntries([]);
						}
					}}
				/>
			)}
		</div>
	);
}
