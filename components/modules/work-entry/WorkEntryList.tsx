'use client';

import { useState, useTransition, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { toast } from 'sonner';
import { Pencil, Trash2, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { WorkEntryStatusBadge } from './WorkEntryStatusBadge';
import { DateGroupHeader } from './DateGroupHeader';
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

interface WorkEntryListProps {
	entries: WorkEntryRow[];
	clients: ClientOption[];
	totalCount?: number;
	pageLimit?: number;
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
	const d = typeof date === 'string' ? parseISO(date) : date;
	return format(d, 'yyyy-MM-dd');
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
						<Input
							id='edit-description'
							value={form.description}
							onChange={(e) => handleChange('description', e.target.value)}
							required
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

export function WorkEntryList({ entries, clients, totalCount, pageLimit }: WorkEntryListProps) {
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

	// Edit dialog state
	const [editingEntry, setEditingEntry] = useState<WorkEntryRow | null>(null);

	// Generate invoice dialog state
	const [generateClientId, setGenerateClientId] = useState<string | null>(null);
	const [generateEntries, setGenerateEntries] = useState<WorkEntryRow[]>([]);
	const [loadingInvoiceClientId, setLoadingInvoiceClientId] = useState<string | null>(null);

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

	// Group by date
	const groups = useMemo(() => {
		const map = new Map<string, WorkEntryRow[]>();
		for (const entry of filtered) {
			const key = toDateKey(entry.date);
			const group = map.get(key) ?? [];
			group.push(entry);
			map.set(key, group);
		}
		// Return sorted descending by date
		return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
	}, [filtered]);

	// Unbilled entries per client for invoice generation
	const unbilledByClient = useMemo(() => {
		const map = new Map<string, WorkEntryRow[]>();
		for (const entry of entries) {
			if (entry.status === 'UNBILLED') {
				const arr = map.get(entry.clientId) ?? [];
				arr.push(entry);
				map.set(entry.clientId, arr);
			}
		}
		return map;
	}, [entries]);

	// Clients that have unbilled entries (for generate invoice button)
	const clientsWithUnbilled = useMemo(() => {
		return clients.filter((c) => (unbilledByClient.get(c.id)?.length ?? 0) > 0);
	}, [clients, unbilledByClient]);

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

	const generateClient = generateClientId
		? clients.find((c) => c.id === generateClientId) ?? null
		: null;

	// Resolve the client currency for invoice generation from the fetched entries
	const generateClientCurrency = useMemo(() => {
		if (!generateClientId || generateEntries.length === 0) return undefined;
		const entry = generateEntries.find((e) => e.clientId === generateClientId);
		return entry?.currency ?? entry?.client?.currency;
	}, [generateClientId, generateEntries]);

	return (
		<div className='space-y-4'>
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
							const count = unbilledByClient.get(c.id)?.length ?? 0;
							const isLoading = loadingInvoiceClientId === c.id;
							return (
								<Button
									key={c.id}
									variant='outline'
									size='sm'
									disabled={isLoading}
									onClick={() => handleGenerateInvoice(c.id)}
								>
									{isLoading ? (
										<Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
									) : (
										<FileText className='mr-1.5 h-3.5 w-3.5' />
									)}
									Invoice {c.name}
									<span className='ml-1.5 text-xs text-muted-foreground'>
										({count})
									</span>
								</Button>
							);
						})}
					</div>
				)}
			</div>

			{/* Entry list */}
			{filtered.length === 0 ? (
				<div className='rounded-lg border border-dashed p-10 text-center'>
					<p className='text-muted-foreground text-sm'>
						{entries.length === 0
							? 'No entries yet. Add your first billable entry above.'
							: 'No entries match the current filters.'}
					</p>
				</div>
			) : (
				<div className='space-y-6'>
					{groups.map(([dateKey, groupEntries]) => {
						const unbilledTotal = groupEntries
							.filter((e) => e.status === 'UNBILLED')
							.reduce((sum, e) => sum + e.amount, 0);

						return (
							<div key={dateKey} className='space-y-1'>
								<DateGroupHeader
									date={dateKey}
									totalAmount={unbilledTotal}
								/>
								<div className='rounded-md border overflow-hidden'>
									<table className='w-full'>
										<thead className='sr-only'>
											<tr>
												<th>Client</th>
												<th>Description</th>
												<th>Hours / Qty</th>
												<th>Amount</th>
												<th>Status</th>
												<th>Actions</th>
											</tr>
										</thead>
										<tbody className='divide-y'>
											{groupEntries.map((entry) => (
												<tr
													key={entry.id}
													className={cn(
														'text-sm',
														entry.status === 'UNBILLED'
															? 'hover:bg-muted/30'
															: 'opacity-75 bg-muted/10'
													)}
												>
													{/* Client badge */}
													<td className='px-3 py-2.5 w-[120px]'>
														<Badge
															variant='secondary'
															className={`text-xs px-1.5 py-0.5 ${clientColorClass(entry.clientId)}`}
														>
															{entry.client.name}
														</Badge>
													</td>

													{/* Description */}
													<td className='px-3 py-2.5 truncate max-w-0'>
														{entry.description}
													</td>

													{/* Qty × price */}
													<td className='px-3 py-2.5 text-right text-xs text-muted-foreground tabular-nums w-[100px] hidden sm:table-cell'>
														{entry.quantity} &times;{' '}
														{formatCurrency(entry.unitPrice, { currency: entry.client.currency || entry.currency })}
													</td>

													{/* Amount */}
													<td className='px-3 py-2.5 text-right font-medium tabular-nums w-[90px]'>
														{formatCurrency(entry.amount, { currency: entry.client.currency || entry.currency })}
													</td>

													{/* Status */}
													<td className='px-3 py-2.5 w-[100px]'>
														<WorkEntryStatusBadge
															status={entry.status}
															invoiceNumber={entry.lastInvoiceNumber ?? undefined}
															invoiceId={entry.lastInvoiceId ?? undefined}
														/>
													</td>

													{/* Actions */}
													<td className='px-3 py-2.5 w-[70px]'>
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
															<div className='shrink-0 w-[60px]' />
														)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* Truncation notice */}
			{totalCount != null && pageLimit != null && totalCount > pageLimit && (
				<p className='text-center text-sm text-muted-foreground pt-2'>
					Showing latest {pageLimit} of {totalCount} entries
				</p>
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
