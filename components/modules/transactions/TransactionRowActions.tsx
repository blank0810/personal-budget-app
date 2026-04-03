'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { deleteIncomeAction } from '@/server/modules/income/income.controller';
import { deleteExpenseAction } from '@/server/modules/expense/expense.controller';
import { deleteTransferAction } from '@/server/modules/transfer/transfer.controller';
import type { UnifiedTransaction } from '@/server/modules/transaction/transaction.types';

interface TransactionRowActionsProps {
	transaction: UnifiedTransaction;
}

export function TransactionRowActions({ transaction }: TransactionRowActionsProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	const handleDelete = () => {
		startTransition(async () => {
			let result: { error?: string } | undefined;

			switch (transaction.kind) {
				case 'income':
					result = await deleteIncomeAction(transaction.id);
					break;
				case 'expense':
					result = await deleteExpenseAction(transaction.id);
					break;
				case 'transfer':
					result = await deleteTransferAction(transaction.id);
					break;
			}

			if (result?.error) {
				toast.error(result.error);
			} else {
				toast.success('Transaction deleted');
				router.refresh();
			}
		});
	};

	// Determine the edit route based on kind
	const editRoute =
		transaction.kind === 'income'
			? '/income'
			: transaction.kind === 'expense'
				? '/expense'
				: '/transfers';

	return (
		<AlertDialog>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant='ghost' size='icon' className='h-8 w-8'>
						<MoreHorizontal className='h-4 w-4' />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align='end'>
					<DropdownMenuItem onClick={() => router.push(editRoute)}>
						<Pencil className='mr-2 h-3.5 w-3.5' />
						Edit
					</DropdownMenuItem>
					<AlertDialogTrigger asChild>
						<DropdownMenuItem className='text-destructive'>
							<Trash2 className='mr-2 h-3.5 w-3.5' />
							Delete
						</DropdownMenuItem>
					</AlertDialogTrigger>
				</DropdownMenuContent>
			</DropdownMenu>

			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete transaction?</AlertDialogTitle>
					<AlertDialogDescription>
						This will reverse the balance changes. This action cannot be undone.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleDelete}
						disabled={isPending}
						className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
					>
						{isPending ? 'Deleting...' : 'Delete'}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
