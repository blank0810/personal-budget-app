'use client';

import { useState, useMemo } from 'react';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	Search,
} from 'lucide-react';

export interface Column<T> {
	key: string;
	header: string;
	sortable?: boolean;
	searchable?: boolean;
	render?: (item: T) => React.ReactNode;
	className?: string;
	getValue?: (item: T) => unknown; // For sorting/searching nested values
}

interface DataTableProps<T> {
	data: T[];
	columns: Column<T>[];
	pageSize?: number;
	searchPlaceholder?: string;
	emptyMessage?: string;
	onRowClick?: (item: T) => void;
	getRowId: (item: T) => string;
}

type SortDirection = 'asc' | 'desc' | null;

// Helper to safely get value from object
function getValueByKey<T>(item: T, key: string, column?: Column<T>): unknown {
	if (column?.getValue) {
		return column.getValue(item);
	}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (item as any)[key];
}

export function DataTable<T>({
	data,
	columns,
	pageSize: initialPageSize = 10,
	searchPlaceholder = 'Search...',
	emptyMessage = 'No items found.',
	onRowClick,
	getRowId,
}: DataTableProps<T>) {
	const [searchQuery, setSearchQuery] = useState('');
	const [sortKey, setSortKey] = useState<string | null>(null);
	const [sortDirection, setSortDirection] = useState<SortDirection>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(initialPageSize);

	// Get searchable columns
	const searchableColumns = columns.filter((col) => col.searchable !== false);

	// Filter data by search query
	const filteredData = useMemo(() => {
		if (!searchQuery.trim()) return data;

		const query = searchQuery.toLowerCase();
		return data.filter((item) =>
			searchableColumns.some((col) => {
				const value = getValueByKey(item, col.key, col);
				if (value == null) return false;
				return String(value).toLowerCase().includes(query);
			})
		);
	}, [data, searchQuery, searchableColumns]);

	// Sort data
	const sortedData = useMemo(() => {
		if (!sortKey || !sortDirection) return filteredData;

		const sortColumn = columns.find((c) => c.key === sortKey);

		return [...filteredData].sort((a, b) => {
			const aVal = getValueByKey(a, sortKey, sortColumn);
			const bVal = getValueByKey(b, sortKey, sortColumn);

			if (aVal == null) return 1;
			if (bVal == null) return -1;

			let comparison = 0;
			if (typeof aVal === 'number' && typeof bVal === 'number') {
				comparison = aVal - bVal;
			} else if (aVal instanceof Date && bVal instanceof Date) {
				comparison = aVal.getTime() - bVal.getTime();
			} else {
				comparison = String(aVal).localeCompare(String(bVal));
			}

			return sortDirection === 'desc' ? -comparison : comparison;
		});
	}, [filteredData, sortKey, sortDirection, columns]);

	// Paginate data
	const totalPages = Math.ceil(sortedData.length / pageSize);
	const paginatedData = useMemo(() => {
		const start = (currentPage - 1) * pageSize;
		return sortedData.slice(start, start + pageSize);
	}, [sortedData, currentPage, pageSize]);

	// Handle sort click
	const handleSort = (key: string) => {
		if (sortKey === key) {
			if (sortDirection === 'asc') setSortDirection('desc');
			else if (sortDirection === 'desc') {
				setSortKey(null);
				setSortDirection(null);
			}
		} else {
			setSortKey(key);
			setSortDirection('asc');
		}
		setCurrentPage(1);
	};

	// Reset to page 1 when search changes
	const handleSearch = (value: string) => {
		setSearchQuery(value);
		setCurrentPage(1);
	};

	const SortIcon = ({ columnKey }: { columnKey: string }) => {
		if (sortKey !== columnKey) {
			return <ArrowUpDown className='h-4 w-4 ml-1 opacity-50' />;
		}
		return sortDirection === 'asc' ? (
			<ArrowUp className='h-4 w-4 ml-1' />
		) : (
			<ArrowDown className='h-4 w-4 ml-1' />
		);
	};

	return (
		<div className='space-y-4'>
			{/* Search Bar */}
			<div className='flex items-center gap-4'>
				<div className='relative flex-1 max-w-sm'>
					<Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
					<Input
						placeholder={searchPlaceholder}
						value={searchQuery}
						onChange={(e) => handleSearch(e.target.value)}
						className='pl-9'
					/>
				</div>
				<div className='text-sm text-muted-foreground'>
					{filteredData.length} items
				</div>
			</div>

			{/* Table */}
			<div className='rounded-md border bg-card'>
				<Table>
					<TableHeader>
						<TableRow>
							{columns.map((column) => (
								<TableHead
									key={column.key}
									className={column.className}
								>
									{column.sortable !== false ? (
										<button
											className='flex items-center hover:text-foreground transition-colors'
											onClick={() =>
												handleSort(column.key)
											}
										>
											{column.header}
											<SortIcon columnKey={column.key} />
										</button>
									) : (
										column.header
									)}
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{paginatedData.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className='text-center h-24 text-muted-foreground'
								>
									{emptyMessage}
								</TableCell>
							</TableRow>
						) : (
							paginatedData.map((item) => (
								<TableRow
									key={getRowId(item)}
									className={
										onRowClick
											? 'cursor-pointer hover:bg-accent'
											: ''
									}
									onClick={() => onRowClick?.(item)}
								>
									{columns.map((column) => (
										<TableCell
											key={column.key}
											className={column.className}
										>
											{column.render
												? column.render(item)
												: String(
														getValueByKey(
															item,
															column.key,
															column
														) ?? ''
												  )}
										</TableCell>
									))}
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pagination */}
			{totalPages > 1 && (
				<div className='flex items-center justify-between'>
					<div className='flex items-center gap-2'>
						<span className='text-sm text-muted-foreground'>
							Rows per page:
						</span>
						<Select
							value={String(pageSize)}
							onValueChange={(value) => {
								setPageSize(Number(value));
								setCurrentPage(1);
							}}
						>
							<SelectTrigger className='w-[70px] h-8'>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{[5, 10, 20, 50].map((size) => (
									<SelectItem key={size} value={String(size)}>
										{size}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className='flex items-center gap-2'>
						<span className='text-sm text-muted-foreground'>
							Page {currentPage} of {totalPages}
						</span>
						<div className='flex gap-1'>
							<Button
								variant='outline'
								size='icon'
								className='h-8 w-8'
								onClick={() => setCurrentPage(1)}
								disabled={currentPage === 1}
							>
								<ChevronsLeft className='h-4 w-4' />
							</Button>
							<Button
								variant='outline'
								size='icon'
								className='h-8 w-8'
								onClick={() => setCurrentPage((p) => p - 1)}
								disabled={currentPage === 1}
							>
								<ChevronLeft className='h-4 w-4' />
							</Button>
							<Button
								variant='outline'
								size='icon'
								className='h-8 w-8'
								onClick={() => setCurrentPage((p) => p + 1)}
								disabled={currentPage === totalPages}
							>
								<ChevronRight className='h-4 w-4' />
							</Button>
							<Button
								variant='outline'
								size='icon'
								className='h-8 w-8'
								onClick={() => setCurrentPage(totalPages)}
								disabled={currentPage === totalPages}
							>
								<ChevronsRight className='h-4 w-4' />
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
