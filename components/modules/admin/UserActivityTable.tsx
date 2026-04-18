'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
	ArrowDownLeft,
	ArrowUpRight,
	ArrowRightLeft,
	Target,
	ChevronLeft,
	ChevronRight,
} from 'lucide-react';
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
import { useCurrency } from '@/lib/contexts/currency-context';
import { cn } from '@/lib/utils';

export type ActivityType = 'income' | 'expense' | 'transfer' | 'goal';

export interface ActivityItem {
	id: string;
	type: ActivityType;
	description: string;
	amount?: number;
	// Drawer passes raw Prisma dates from a client-fetch; page passes serialized ISO strings.
	timestamp: string | Date;
}

const TYPE_META: Record<
	ActivityType,
	{ label: string; Icon: typeof ArrowDownLeft; color: string; badge: string }
> = {
	income: {
		label: 'Income',
		Icon: ArrowDownLeft,
		color: 'text-green-500',
		badge: 'bg-green-500/10 text-green-600 dark:text-green-400',
	},
	expense: {
		label: 'Expense',
		Icon: ArrowUpRight,
		color: 'text-red-500',
		badge: 'bg-red-500/10 text-red-600 dark:text-red-400',
	},
	transfer: {
		label: 'Transfer',
		Icon: ArrowRightLeft,
		color: 'text-blue-500',
		badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
	},
	goal: {
		label: 'Goal',
		Icon: Target,
		color: 'text-purple-500',
		badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
	},
};

interface UserActivityTableProps {
	items: ActivityItem[];
	/** Rows per page; defaults to 10. */
	pageSize?: number;
}

/**
 * Renders an admin user's recent activity as a paginated table.
 * Replaces the previous long vertical timeline that expanded indefinitely.
 */
export function UserActivityTable({
	items,
	pageSize = 10,
}: UserActivityTableProps) {
	const { formatCurrency } = useCurrency();
	const [page, setPage] = useState(1);

	const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
	const safePage = Math.min(page, totalPages);

	const pageItems = useMemo(() => {
		const start = (safePage - 1) * pageSize;
		return items.slice(start, start + pageSize);
	}, [items, safePage, pageSize]);

	if (items.length === 0) {
		return (
			<p
				role='status'
				className='text-sm text-muted-foreground py-4 text-center'
			>
				No activity yet
			</p>
		);
	}

	return (
		<div className='space-y-3'>
			<div className='rounded-md border bg-card overflow-x-auto'>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className='w-[120px]'>Type</TableHead>
							<TableHead>Description</TableHead>
							<TableHead className='hidden text-right sm:table-cell w-[120px]'>
								Amount
							</TableHead>
							<TableHead className='w-[160px]'>When</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{pageItems.map((item) => {
							const meta = TYPE_META[item.type];
							const Icon = meta.Icon;
							return (
								<TableRow key={item.id}>
									<TableCell>
										<Badge
											variant='secondary'
											className={cn(
												'gap-1 text-[10px] font-medium',
												meta.badge
											)}
										>
											<Icon className='h-3 w-3' />
											{meta.label}
										</Badge>
									</TableCell>
									<TableCell
										className='max-w-0 truncate text-sm'
										title={item.description}
									>
										{item.description}
									</TableCell>
									<TableCell
										className={cn(
											'hidden text-right text-sm font-medium tabular-nums sm:table-cell',
											meta.color
										)}
									>
										{item.amount !== undefined
											? formatCurrency(item.amount)
											: '—'}
									</TableCell>
									<TableCell className='text-xs text-muted-foreground'>
										{format(
											new Date(item.timestamp),
											'MMM d, yyyy HH:mm'
										)}
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>

			{totalPages > 1 && (
				<div className='flex items-center justify-between gap-2 px-1'>
					<p className='text-xs text-muted-foreground'>
						Page {safePage} of {totalPages} · {items.length} events
					</p>
					<div className='flex items-center gap-1'>
						<Button
							variant='outline'
							size='icon'
							className='h-8 w-8'
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={safePage <= 1}
							aria-label='Previous page'
						>
							<ChevronLeft className='h-4 w-4' />
						</Button>
						<Button
							variant='outline'
							size='icon'
							className='h-8 w-8'
							onClick={() =>
								setPage((p) => Math.min(totalPages, p + 1))
							}
							disabled={safePage >= totalPages}
							aria-label='Next page'
						>
							<ChevronRight className='h-4 w-4' />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
