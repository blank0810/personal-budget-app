'use client';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { ArrowRight, Calendar, CreditCard, FileText } from 'lucide-react';

export interface TransferWithRelations {
	id: string;
	amount: string | number;
	fee?: string | number | null;
	description: string | null;
	date: Date | string;
	fromAccount: {
		id: string;
		name: string;
		type: string;
	};
	toAccount: {
		id: string;
		name: string;
		type: string;
	};
	createdAt: Date | string;
}

interface TransferDetailDialogProps {
	transfer: TransferWithRelations | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function TransferDetailDialog({
	transfer,
	open,
	onOpenChange,
}: TransferDetailDialogProps) {
	if (!transfer) return null;

	const amount = Number(transfer.amount);
	const fee = Number(transfer.fee || 0);
	const totalDebit = amount + fee;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2'>
						<CreditCard className='h-5 w-5' />
						Transfer Summary
					</DialogTitle>
					<DialogDescription className='flex items-center gap-2'>
						<Calendar className='h-4 w-4' />
						{format(new Date(transfer.date), 'MMMM d, yyyy')}
					</DialogDescription>
				</DialogHeader>

				<div className='space-y-4'>
					{/* Account Flow Visualization */}
					<div className='flex items-center justify-between p-4 bg-secondary/20 rounded-lg'>
						<div className='text-center flex-1'>
							<p className='text-xs text-muted-foreground mb-1'>
								From
							</p>
							<p className='font-semibold text-sm'>
								{transfer.fromAccount.name}
							</p>
							<Badge variant='outline' className='text-xs mt-1'>
								{transfer.fromAccount.type}
							</Badge>
						</div>
						<ArrowRight className='h-5 w-5 text-muted-foreground mx-2 shrink-0' />
						<div className='text-center flex-1'>
							<p className='text-xs text-muted-foreground mb-1'>
								To
							</p>
							<p className='font-semibold text-sm'>
								{transfer.toAccount.name}
							</p>
							<Badge variant='outline' className='text-xs mt-1'>
								{transfer.toAccount.type}
							</Badge>
						</div>
					</div>

					{/* Amount Breakdown */}
					<div className='space-y-2 border rounded-lg p-4'>
						<div className='flex justify-between text-sm'>
							<span className='text-muted-foreground'>
								Transfer Amount
							</span>
							<span className='font-medium'>
								{formatCurrency(amount)}
							</span>
						</div>

						{fee > 0 && (
							<div className='flex justify-between text-sm text-amber-600'>
								<span>Bank Fee</span>
								<span>+{formatCurrency(fee)}</span>
							</div>
						)}

						<div className='border-t my-2' />

						<div className='flex justify-between font-bold text-sm'>
							<span>Total Debited from Source</span>
							<span className='text-red-600'>
								-{formatCurrency(totalDebit)}
							</span>
						</div>

						<div className='flex justify-between font-bold text-sm'>
							<span>Amount Credited to Dest.</span>
							<span className='text-green-600'>
								+{formatCurrency(amount)}
							</span>
						</div>
					</div>

					{/* Description */}
					{transfer.description && (
						<div className='border rounded-lg p-3'>
							<div className='flex items-center gap-2 mb-1'>
								<FileText className='h-4 w-4 text-muted-foreground' />
								<span className='text-xs text-muted-foreground'>
									Description
								</span>
							</div>
							<p className='text-sm'>{transfer.description}</p>
						</div>
					)}

					{/* Metadata */}
					<p className='text-xs text-muted-foreground text-center'>
						Created: {format(new Date(transfer.createdAt), 'PPpp')}
					</p>
				</div>

				<DialogFooter>
					<Button
						variant='outline'
						onClick={() => onOpenChange(false)}
					>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
