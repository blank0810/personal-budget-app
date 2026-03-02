'use client';

import { useState } from 'react';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
	deleteRecurringAction,
	toggleRecurringAction,
} from '@/server/modules/recurring/recurring.controller';
import { useCurrency } from '@/lib/contexts/currency-context';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Pause, Play, Trash2 } from 'lucide-react';

interface RecurringItem {
	id: string;
	name: string;
	type: string;
	amount: number | { toNumber(): number };
	frequency: string;
	nextRunDate: string | Date;
	lastRunDate: string | Date | null;
	isActive: boolean;
	category: { name: string };
	account: { name: string } | null;
}

interface RecurringListProps {
	items: RecurringItem[];
}

const FREQUENCY_LABELS: Record<string, string> = {
	DAILY: 'Daily',
	WEEKLY: 'Weekly',
	BIWEEKLY: 'Bi-weekly',
	MONTHLY: 'Monthly',
	YEARLY: 'Yearly',
};

export function RecurringList({ items }: RecurringListProps) {
	const { formatCurrency } = useCurrency();
	const [loadingId, setLoadingId] = useState<string | null>(null);

	async function handleToggle(id: string) {
		setLoadingId(id);
		const result = await toggleRecurringAction(id);
		setLoadingId(null);

		if (result?.error) {
			toast.error(result.error);
		} else {
			toast.success('Updated');
		}
	}

	async function handleDelete(id: string) {
		setLoadingId(id);
		const result = await deleteRecurringAction(id);
		setLoadingId(null);

		if (result?.error) {
			toast.error(result.error);
		} else {
			toast.success('Deleted');
		}
	}

	if (items.length === 0) {
		return (
			<p className='text-muted-foreground text-center py-8'>
				No recurring transactions yet. Create one to get started.
			</p>
		);
	}

	return (
		<div className='overflow-x-auto'>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Type</TableHead>
						<TableHead>Amount</TableHead>
						<TableHead className='hidden md:table-cell'>
							Category
						</TableHead>
						<TableHead className='hidden md:table-cell'>
							Frequency
						</TableHead>
						<TableHead className='hidden lg:table-cell'>
							Next Run
						</TableHead>
						<TableHead>Status</TableHead>
						<TableHead className='text-right'>Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{items.map((item) => (
						<TableRow
							key={item.id}
							className={!item.isActive ? 'opacity-50' : ''}
						>
							<TableCell className='font-medium'>
								{item.name}
							</TableCell>
							<TableCell>
								<Badge
									variant={
										item.type === 'INCOME'
											? 'default'
											: 'destructive'
									}
								>
									{item.type}
								</Badge>
							</TableCell>
							<TableCell>
								{formatCurrency(Number(item.amount))}
							</TableCell>
							<TableCell className='hidden md:table-cell'>
								{item.category.name}
							</TableCell>
							<TableCell className='hidden md:table-cell'>
								{FREQUENCY_LABELS[item.frequency] ||
									item.frequency}
							</TableCell>
							<TableCell className='hidden lg:table-cell'>
								{format(
									new Date(item.nextRunDate),
									'MMM d, yyyy'
								)}
							</TableCell>
							<TableCell>
								<Badge
									variant={
										item.isActive ? 'outline' : 'secondary'
									}
								>
									{item.isActive ? 'Active' : 'Paused'}
								</Badge>
							</TableCell>
							<TableCell className='text-right'>
								<div className='flex justify-end gap-1'>
									<Button
										variant='ghost'
										size='icon'
										onClick={() => handleToggle(item.id)}
										disabled={loadingId === item.id}
										title={
											item.isActive
												? 'Pause'
												: 'Resume'
										}
									>
										{item.isActive ? (
											<Pause className='h-4 w-4' />
										) : (
											<Play className='h-4 w-4' />
										)}
									</Button>
									<AlertDialog>
										<AlertDialogTrigger asChild>
											<Button
												variant='ghost'
												size='icon'
												disabled={
													loadingId === item.id
												}
											>
												<Trash2 className='h-4 w-4 text-destructive' />
											</Button>
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>
													Delete &quot;{item.name}
													&quot;?
												</AlertDialogTitle>
												<AlertDialogDescription>
													This will permanently
													delete this recurring
													transaction. Existing
													transactions created by
													it will not be affected.
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>
													Cancel
												</AlertDialogCancel>
												<AlertDialogAction
													onClick={() =>
														handleDelete(item.id)
													}
												>
													Delete
												</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								</div>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
