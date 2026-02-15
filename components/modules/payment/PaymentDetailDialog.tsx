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
import { ArrowRight, Calendar, Receipt, FileText, Trash2 } from 'lucide-react';
import { deletePaymentAction } from '@/server/modules/payment/payment.controller';
import { useState } from 'react';

export interface PaymentWithRelations {
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

interface PaymentDetailDialogProps {
	payment: PaymentWithRelations | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function PaymentDetailDialog({
	payment,
	open,
	onOpenChange,
}: PaymentDetailDialogProps) {
	const [isDeleting, setIsDeleting] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	if (!payment) return null;

	const amount = Number(payment.amount);
	const fee = Number(payment.fee || 0);
	const totalDebit = amount + fee;

	async function handleDelete() {
		setIsDeleting(true);
		const result = await deletePaymentAction(payment!.id);
		setIsDeleting(false);

		if (result?.error) {
			console.error(result.error);
		} else {
			setShowDeleteConfirm(false);
			onOpenChange(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2'>
						<Receipt className='h-5 w-5' />
						Payment Summary
					</DialogTitle>
					<DialogDescription className='flex items-center gap-2'>
						<Calendar className='h-4 w-4' />
						{format(new Date(payment.date), 'MMMM d, yyyy')}
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
								{payment.fromAccount.name}
							</p>
							<Badge variant='outline' className='text-xs mt-1'>
								{payment.fromAccount.type}
							</Badge>
						</div>
						<ArrowRight className='h-5 w-5 text-muted-foreground mx-2 shrink-0' />
						<div className='text-center flex-1'>
							<p className='text-xs text-muted-foreground mb-1'>
								Paid Off
							</p>
							<p className='font-semibold text-sm'>
								{payment.toAccount.name}
							</p>
							<Badge variant='destructive' className='text-xs mt-1'>
								{payment.toAccount.type}
							</Badge>
						</div>
					</div>

					{/* Amount Breakdown */}
					<div className='space-y-2 border rounded-lg p-4'>
						<div className='flex justify-between text-sm'>
							<span className='text-muted-foreground'>
								Payment Amount
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
							<span>Total Debited</span>
							<span className='text-red-600'>
								-{formatCurrency(totalDebit)}
							</span>
						</div>

						<div className='flex justify-between font-bold text-sm'>
							<span>Debt Reduced</span>
							<span className='text-green-600'>
								-{formatCurrency(amount)}
							</span>
						</div>
					</div>

					{/* Description */}
					{payment.description && (
						<div className='border rounded-lg p-3'>
							<div className='flex items-center gap-2 mb-1'>
								<FileText className='h-4 w-4 text-muted-foreground' />
								<span className='text-xs text-muted-foreground'>
									Description
								</span>
							</div>
							<p className='text-sm'>{payment.description}</p>
						</div>
					)}

					{/* Metadata */}
					<p className='text-xs text-muted-foreground text-center'>
						Created: {format(new Date(payment.createdAt), 'PPpp')}
					</p>
				</div>

				<DialogFooter className='flex gap-2 sm:gap-2'>
					{!showDeleteConfirm ? (
						<>
							<Button
								variant='destructive'
								size='sm'
								onClick={() => setShowDeleteConfirm(true)}
							>
								<Trash2 className='h-4 w-4 mr-1' />
								Delete
							</Button>
							<Button
								variant='outline'
								onClick={() => onOpenChange(false)}
							>
								Close
							</Button>
						</>
					) : (
						<>
							<p className='text-sm text-destructive flex-1'>
								Delete this payment? This will revert all balance changes.
							</p>
							<Button
								variant='outline'
								size='sm'
								onClick={() => setShowDeleteConfirm(false)}
								disabled={isDeleting}
							>
								Cancel
							</Button>
							<Button
								variant='destructive'
								size='sm'
								onClick={handleDelete}
								disabled={isDeleting}
							>
								{isDeleting ? 'Deleting...' : 'Confirm'}
							</Button>
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
