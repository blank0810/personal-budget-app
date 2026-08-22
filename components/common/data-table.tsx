'use client';

import { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface SortableHeaderProps<TField extends string> {
	field: TField;
	label: string;
	sortField: TField;
	onSort: (field: TField) => void;
	className?: string;
}

export function SortableHeader<TField extends string>({
	field,
	label,
	sortField,
	onSort,
	className,
}: SortableHeaderProps<TField>) {
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

export function useTableSort<TField extends string>(
	initialField: TField,
	initialDir: 'asc' | 'desc' = 'desc',
) {
	const [sortField, setSortField] = useState<TField>(initialField);
	const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialDir);

	function toggleSort(field: TField) {
		if (sortField === field) {
			setSortDir((direction) =>
				direction === 'asc' ? 'desc' : 'asc',
			);
		} else {
			setSortField(field);
			setSortDir(initialDir);
		}
	}

	return { sortField, sortDir, toggleSort };
}

interface TablePaginationProps {
	page: number;
	totalPages: number;
	totalRows: number;
	rowLabel: string;
	onPageChange: (page: number) => void;
	className?: string;
	hideSinglePageControls?: boolean;
}

function pluralizeRowLabel(rowLabel: string, totalRows: number) {
	if (totalRows === 1) return rowLabel;
	if (/[^aeiou]y$/i.test(rowLabel)) return `${rowLabel.slice(0, -1)}ies`;
	return `${rowLabel}s`;
}

export function TablePagination({
	page,
	totalPages,
	totalRows,
	rowLabel,
	onPageChange,
	className,
	hideSinglePageControls = false,
}: TablePaginationProps) {
	return (
		<div
			className={cn(
				'flex items-center justify-between px-2 py-4',
				className,
			)}
		>
			<p className='text-sm text-muted-foreground'>
				{totalRows} {pluralizeRowLabel(rowLabel, totalRows)}
			</p>
			{(!hideSinglePageControls || totalPages > 1) && (
				<div className='flex items-center gap-2'>
					<p className='text-sm text-muted-foreground'>
						Page {page + 1} of {totalPages}
					</p>
					<Button
						variant='outline'
						size='sm'
						disabled={page === 0}
						onClick={() => onPageChange(page - 1)}
					>
						Previous
					</Button>
					<Button
						variant='outline'
						size='sm'
						disabled={page >= totalPages - 1}
						onClick={() => onPageChange(page + 1)}
					>
						Next
					</Button>
				</div>
			)}
		</div>
	);
}
