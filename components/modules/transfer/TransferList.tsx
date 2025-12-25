'use client';

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Trash2, ArrowRight } from 'lucide-react';
import { deleteTransferAction } from '@/server/modules/transfer/transfer.controller';
import { Transfer, Account } from '@prisma/client';

interface TransferWithRelations extends Transfer {
	fromAccount: Account;
	toAccount: Account;
}

interface TransferListProps {
	transfers: TransferWithRelations[];
}

export function TransferList({ transfers }: TransferListProps) {
	async function handleDelete(id: string) {
		if (
			confirm(
				'Are you sure you want to delete this transfer? This will revert the transaction.'
			)
		) {
			await deleteTransferAction(id);
		}
	}

	return (
		<div className='rounded-md border bg-card'>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Date</TableHead>
						<TableHead>Description</TableHead>
						<TableHead>From</TableHead>
						<TableHead></TableHead>
						<TableHead>To</TableHead>
						<TableHead className='text-right'>Amount</TableHead>
						<TableHead className='w-[50px]'></TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{transfers.length === 0 ? (
						<TableRow>
							<TableCell
								colSpan={7}
								className='text-center h-24 text-muted-foreground'
							>
								No transfers found.
							</TableCell>
						</TableRow>
					) : (
						transfers.map((transfer) => (
							<TableRow key={transfer.id}>
								<TableCell>
									{format(new Date(transfer.date), 'PPP')}
								</TableCell>
								<TableCell>{transfer.description}</TableCell>
								<TableCell className='font-medium text-red-600'>
									{transfer.fromAccount.name}
								</TableCell>
								<TableCell>
									<ArrowRight className='h-4 w-4 text-muted-foreground' />
								</TableCell>
								<TableCell className='font-medium text-green-600'>
									{transfer.toAccount.name}
								</TableCell>
								<TableCell className='text-right font-bold'>
									${Number(transfer.amount).toFixed(2)}
								</TableCell>
								<TableCell>
									<Button
										variant='ghost'
										size='icon'
										className='h-8 w-8 text-destructive'
										onClick={() =>
											handleDelete(transfer.id)
										}
									>
										<Trash2 className='h-4 w-4' />
									</Button>
								</TableCell>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</div>
	);
}
