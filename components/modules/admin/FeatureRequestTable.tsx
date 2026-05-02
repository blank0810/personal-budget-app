'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
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
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { BulkActionBar } from '@/components/common/BulkActionBar';
import {
	adminGetFeatureRequestsAction,
	adminUpdateFeatureRequestAction,
	adminBulkUpdateFeatureRequestStatusAction,
	adminBulkDeleteFeatureRequestsAction,
} from '@/server/modules/admin/admin.controller';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	ChevronLeft,
	ChevronRight,
	Loader2,
	Search,
	X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeatureRequest {
	id: string;
	title: string;
	description: string;
	category: string;
	email: string;
	status: string;
	adminNotes: string | null;
	createdAt: string | Date;
}

const STATUS_OPTIONS = ['NEW', 'REVIEWING', 'PLANNED', 'COMPLETED', 'DECLINED'];

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
	NEW: 'outline',
	REVIEWING: 'secondary',
	PLANNED: 'default',
	COMPLETED: 'default',
	DECLINED: 'destructive',
};

const CATEGORY_OPTIONS = ['BUG', 'ENHANCEMENT', 'NEW_FEATURE', 'UI_UX'];

type SortBy = 'title' | 'category' | 'email' | 'createdAt' | 'status';
type SortOrder = 'asc' | 'desc';

function SortIcon({
	column,
	activeColumn,
	order,
}: {
	column: SortBy;
	activeColumn: SortBy;
	order: SortOrder;
}) {
	if (column !== activeColumn) {
		return <ArrowUpDown className='ml-1 h-3 w-3 opacity-40' />;
	}
	return order === 'asc' ? (
		<ArrowUp className='ml-1 h-3 w-3' />
	) : (
		<ArrowDown className='ml-1 h-3 w-3' />
	);
}

function SortableHead({
	column,
	activeColumn,
	order,
	onSort,
	className,
	children,
}: {
	column: SortBy;
	activeColumn: SortBy;
	order: SortOrder;
	onSort: (column: SortBy) => void;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<TableHead className={className}>
			<button
				type='button'
				onClick={() => onSort(column)}
				className={cn(
					'inline-flex items-center font-medium text-xs uppercase tracking-wide transition-colors hover:text-foreground',
					column === activeColumn ? 'text-foreground' : 'text-muted-foreground'
				)}
			>
				{children}
				<SortIcon
					column={column}
					activeColumn={activeColumn}
					order={order}
				/>
			</button>
		</TableHead>
	);
}

interface FeatureRequestTableProps {
	initialRequests: FeatureRequest[];
	initialTotal: number;
	initialPages: number;
}

export function FeatureRequestTable({
	initialRequests,
	initialTotal,
	initialPages,
}: FeatureRequestTableProps) {
	const [requests, setRequests] = useState(initialRequests);
	const [total, setTotal] = useState(initialTotal);
	const [pages, setPages] = useState(initialPages);
	const [page, setPage] = useState(1);
	const [statusFilter, setStatusFilter] = useState('');
	const [categoryFilter, setCategoryFilter] = useState('');
	const [search, setSearch] = useState('');
	const [sortBy, setSortBy] = useState<SortBy>('createdAt');
	const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
	const [loading, setLoading] = useState(false);
	const [editing, setEditing] = useState<FeatureRequest | null>(null);
	const [editStatus, setEditStatus] = useState('');
	const [editNotes, setEditNotes] = useState('');
	const [saving, setSaving] = useState(false);

	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [bulkPending, setBulkPending] = useState(false);
	const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
	const [bulkStatusValue, setBulkStatusValue] = useState('NEW');
	const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

	const visibleIds = useMemo(() => requests.map((r) => r.id), [requests]);
	const visibleSelectionState: 'none' | 'some' | 'all' = useMemo(() => {
		if (visibleIds.length === 0) return 'none';
		const n = visibleIds.filter((id) => selected.has(id)).length;
		if (n === 0) return 'none';
		if (n === visibleIds.length) return 'all';
		return 'some';
	}, [selected, visibleIds]);

	function toggleRow(id: string) {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	function toggleAllVisible() {
		setSelected((prev) => {
			const next = new Set(prev);
			const allSelected = visibleIds.every((id) => next.has(id));
			for (const id of visibleIds) {
				if (allSelected) next.delete(id);
				else next.add(id);
			}
			return next;
		});
	}

	function clearSelection() {
		setSelected(new Set());
	}

	async function fetchRequests(opts: {
		page?: number;
		status?: string;
		category?: string;
		search?: string;
		sortBy?: SortBy;
		sortOrder?: SortOrder;
	} = {}) {
		const p = opts.page ?? page;
		const s = opts.status ?? statusFilter;
		const c = opts.category ?? categoryFilter;
		const q = opts.search ?? search;
		const sb = opts.sortBy ?? sortBy;
		const so = opts.sortOrder ?? sortOrder;

		setLoading(true);
		clearSelection();
		const result = await adminGetFeatureRequestsAction(
			p,
			s || undefined,
			c || undefined,
			q || undefined,
			sb,
			so
		);
		setLoading(false);

		if ('success' in result && result.data) {
			const r = result.data as {
				requests: FeatureRequest[];
				total: number;
				pages: number;
			};
			setRequests(r.requests);
			setTotal(r.total);
			setPages(r.pages);
			setPage(p);
		}
	}

	// Debounce the search input — 300ms after the user stops typing.
	const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => {
		if (searchDebounceRef.current) {
			clearTimeout(searchDebounceRef.current);
		}
		searchDebounceRef.current = setTimeout(() => {
			fetchRequests({ page: 1, search });
		}, 300);
		return () => {
			if (searchDebounceRef.current) {
				clearTimeout(searchDebounceRef.current);
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [search]);

	function handleSort(column: SortBy) {
		// Click same column → toggle order. Click new column → asc default
		// (createdAt remains desc-first since "newest first" is the natural
		// expectation for date columns).
		const isSame = sortBy === column;
		const nextOrder: SortOrder = isSame
			? sortOrder === 'asc'
				? 'desc'
				: 'asc'
			: column === 'createdAt'
				? 'desc'
				: 'asc';
		setSortBy(column);
		setSortOrder(nextOrder);
		fetchRequests({ page: 1, sortBy: column, sortOrder: nextOrder });
	}

	async function handleBulkStatus() {
		if (selected.size === 0) return;
		setBulkPending(true);
		const result = await adminBulkUpdateFeatureRequestStatusAction(
			Array.from(selected),
			bulkStatusValue
		);
		setBulkPending(false);
		setBulkStatusOpen(false);

		if ('success' in result && result.data) {
			toast.success(`Updated ${result.data.count} requests`);
			fetchRequests();
		} else {
			toast.error(result.error || 'Failed to update');
		}
	}

	async function handleBulkDelete() {
		if (selected.size === 0) return;
		setBulkPending(true);
		const result = await adminBulkDeleteFeatureRequestsAction(
			Array.from(selected)
		);
		setBulkPending(false);
		setBulkDeleteOpen(false);

		if ('success' in result && result.data) {
			toast.success(`Deleted ${result.data.count} requests`);
			fetchRequests();
		} else {
			toast.error(result.error || 'Failed to delete');
		}
	}

	function handleEdit(req: FeatureRequest) {
		setEditing(req);
		setEditStatus(req.status);
		setEditNotes(req.adminNotes || '');
	}

	async function handleSave() {
		if (!editing) return;
		setSaving(true);
		const result = await adminUpdateFeatureRequestAction(
			editing.id,
			editStatus,
			editNotes || undefined
		);
		setSaving(false);

		if (result.success) {
			toast.success('Updated');
			setEditing(null);
			fetchRequests();
		} else {
			toast.error(result.error || 'Failed');
		}
	}

	return (
		<div className='space-y-4'>
			<div className='flex flex-wrap gap-3'>
				<div className='relative flex-1 min-w-[220px] max-w-[320px]'>
					<Search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
					<Input
						placeholder='Search title or email…'
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className='pl-8 pr-8'
					/>
					{search && (
						<button
							type='button'
							onClick={() => setSearch('')}
							className='absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
							aria-label='Clear search'
						>
							<X className='h-4 w-4' />
						</button>
					)}
				</div>
				<Select
					value={statusFilter}
					onValueChange={(v) => {
						const val = v === '__all__' ? '' : v;
						setStatusFilter(val);
						fetchRequests({ page: 1, status: val });
					}}
				>
					<SelectTrigger className='w-[150px]'>
						<SelectValue placeholder='All Statuses' />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='__all__'>All Statuses</SelectItem>
						{STATUS_OPTIONS.map((s) => (
							<SelectItem key={s} value={s}>
								{s}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select
					value={categoryFilter}
					onValueChange={(v) => {
						const val = v === '__all__' ? '' : v;
						setCategoryFilter(val);
						fetchRequests({ page: 1, category: val });
					}}
				>
					<SelectTrigger className='w-[150px]'>
						<SelectValue placeholder='All Categories' />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='__all__'>All Categories</SelectItem>
						{CATEGORY_OPTIONS.map((c) => (
							<SelectItem key={c} value={c}>
								{c.replace('_', ' ')}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<span className='text-sm text-muted-foreground self-center'>
					{total} total
				</span>
			</div>

			{loading ? (
				<div className='flex justify-center py-8'>
					<Loader2 className='h-6 w-6 animate-spin' />
				</div>
			) : (
				<div className='overflow-x-auto rounded border'>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className='w-10'>
									<Checkbox
										aria-label='Select all on this page'
										checked={
											visibleSelectionState === 'all'
												? true
												: visibleSelectionState ===
												  'some'
												? 'indeterminate'
												: false
										}
										onCheckedChange={toggleAllVisible}
										disabled={visibleIds.length === 0}
									/>
								</TableHead>
								<SortableHead
									column='title'
									activeColumn={sortBy}
									order={sortOrder}
									onSort={handleSort}
								>
									Title
								</SortableHead>
								<SortableHead
									column='category'
									activeColumn={sortBy}
									order={sortOrder}
									onSort={handleSort}
								>
									Category
								</SortableHead>
								<SortableHead
									column='email'
									activeColumn={sortBy}
									order={sortOrder}
									onSort={handleSort}
								>
									Email
								</SortableHead>
								<SortableHead
									column='createdAt'
									activeColumn={sortBy}
									order={sortOrder}
									onSort={handleSort}
									className='hidden md:table-cell'
								>
									Date
								</SortableHead>
								<SortableHead
									column='status'
									activeColumn={sortBy}
									order={sortOrder}
									onSort={handleSort}
								>
									Status
								</SortableHead>
								<TableHead className='w-20'></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{requests.map((req) => {
								const isSelected = selected.has(req.id);
								return (
									<TableRow
										key={req.id}
										data-state={isSelected ? 'selected' : undefined}
									>
										<TableCell>
											<Checkbox
												aria-label={`Select ${req.title}`}
												checked={isSelected}
												onCheckedChange={() =>
													toggleRow(req.id)
												}
											/>
										</TableCell>
										<TableCell className='font-medium max-w-[200px] truncate'>
											{req.title}
										</TableCell>
										<TableCell>
											<Badge
												variant='secondary'
												className='text-xs'
											>
												{req.category.replace('_', ' ')}
											</Badge>
										</TableCell>
										<TableCell className='text-sm'>
											{req.email}
										</TableCell>
										<TableCell className='hidden md:table-cell text-sm'>
											{format(
												new Date(req.createdAt),
												'MMM d'
											)}
										</TableCell>
										<TableCell>
											<Badge
												variant={
													STATUS_COLORS[req.status] ||
													'outline'
												}
												className='text-xs'
											>
												{req.status}
											</Badge>
										</TableCell>
										<TableCell>
											<Button
												variant='ghost'
												size='sm'
												onClick={() => handleEdit(req)}
											>
												Edit
											</Button>
										</TableCell>
									</TableRow>
								);
							})}
							{requests.length === 0 && (
								<TableRow>
									<TableCell
										colSpan={7}
										className='text-center py-8 text-muted-foreground'
									>
										No feature requests
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			)}

			{pages > 1 && (
				<div className='flex items-center justify-between'>
					<span className='text-sm text-muted-foreground'>
						Page {page} of {pages}
					</span>
					<div className='flex gap-2'>
						<Button
							variant='outline'
							size='sm'
							disabled={page <= 1}
							onClick={() => fetchRequests({ page: page - 1 })}
						>
							<ChevronLeft className='h-4 w-4' />
						</Button>
						<Button
							variant='outline'
							size='sm'
							disabled={page >= pages}
							onClick={() => fetchRequests({ page: page + 1 })}
						>
							<ChevronRight className='h-4 w-4' />
						</Button>
					</div>
				</div>
			)}

			{/* Edit Dialog */}
			<Dialog
				open={!!editing}
				onOpenChange={(v) => !v && setEditing(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{editing?.title}</DialogTitle>
					</DialogHeader>
					{editing && (
						<div className='space-y-4'>
							<p className='text-sm text-muted-foreground'>
								{editing.description}
							</p>
							<div className='space-y-2'>
								<Label>Status</Label>
								<Select
									value={editStatus}
									onValueChange={setEditStatus}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{STATUS_OPTIONS.map((s) => (
											<SelectItem key={s} value={s}>
												{s}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className='space-y-2'>
								<Label>Admin Notes</Label>
								<Input
									value={editNotes}
									onChange={(e) =>
										setEditNotes(e.target.value)
									}
									placeholder='Internal notes...'
								/>
							</div>
							<Button
								onClick={handleSave}
								disabled={saving}
								className='w-full'
							>
								{saving && (
									<Loader2 className='mr-2 h-4 w-4 animate-spin' />
								)}
								Save
							</Button>
						</div>
					)}
				</DialogContent>
			</Dialog>

			<BulkActionBar
				count={selected.size}
				onClear={clearSelection}
				actions={[
					{
						label: 'Set status',
						variant: 'outline',
						onClick: () => setBulkStatusOpen(true),
						disabled: bulkPending,
					},
					{
						label: 'Delete',
						variant: 'destructive',
						onClick: () => setBulkDeleteOpen(true),
						disabled: bulkPending,
					},
				]}
			/>

			<Dialog open={bulkStatusOpen} onOpenChange={setBulkStatusOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							Set status for {selected.size} request
							{selected.size === 1 ? '' : 's'}
						</DialogTitle>
					</DialogHeader>
					<div className='space-y-2'>
						<Label>Status</Label>
						<Select
							value={bulkStatusValue}
							onValueChange={setBulkStatusValue}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{STATUS_OPTIONS.map((s) => (
									<SelectItem key={s} value={s}>
										{s}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => setBulkStatusOpen(false)}
							disabled={bulkPending}
						>
							Cancel
						</Button>
						<Button
							onClick={handleBulkStatus}
							disabled={bulkPending}
						>
							{bulkPending && (
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							)}
							Apply
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={bulkDeleteOpen}
				onOpenChange={setBulkDeleteOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Delete {selected.size} feature request
							{selected.size === 1 ? '' : 's'}?
						</AlertDialogTitle>
						<AlertDialogDescription>
							This permanently removes the selected requests.
							This cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={bulkPending}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleBulkDelete}
							disabled={bulkPending}
							className='bg-destructive text-white hover:bg-destructive/90'
						>
							{bulkPending && (
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							)}
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
