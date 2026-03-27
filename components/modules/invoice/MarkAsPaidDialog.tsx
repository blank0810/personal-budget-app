'use client';

import { useState, useTransition } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { markAsPaidAction } from '@/server/modules/invoice/invoice.controller';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface MarkAsPaidDialogProps {
	invoiceId: string;
	open: boolean;
	onSuccess: () => void;
	onClose: () => void;
}

export function MarkAsPaidDialog({
	invoiceId,
	open,
	onSuccess,
	onClose,
}: MarkAsPaidDialogProps) {
	const [isPending, startTransition] = useTransition();
	const [paymentDate, setPaymentDate] = useState(
		new Date().toISOString().slice(0, 10)
	);

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();

		startTransition(async () => {
			const result = await markAsPaidAction({
				invoiceId,
				date: new Date(paymentDate),
			});

			if (result?.error) {
				toast.error(result.error);
			} else {
				toast.success('Invoice marked as paid');
				onSuccess();
				onClose();
			}
		});
	}

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Mark Invoice as Paid</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className='space-y-4'>
					<div className='space-y-2'>
						<Label htmlFor='paid-date'>Payment Date</Label>
						<Input
							id='paid-date'
							type='date'
							value={paymentDate}
							onChange={(e) => setPaymentDate(e.target.value)}
						/>
					</div>

					<div className='flex gap-3'>
						<Button
							type='button'
							variant='outline'
							onClick={onClose}
							className='flex-1'
						>
							Cancel
						</Button>
						<Button
							type='submit'
							className='flex-1'
							disabled={isPending}
						>
							{isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
							Mark as Paid
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
