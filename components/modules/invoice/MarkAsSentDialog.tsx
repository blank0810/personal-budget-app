'use client';

import { useState, useTransition } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { markAsSentAction } from '@/server/modules/invoice/invoice.controller';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface MarkAsSentDialogProps {
	invoiceId: string;
	clientEmail?: string | null;
	open: boolean;
	onSuccess: () => void;
	onClose: () => void;
}

export function MarkAsSentDialog({
	invoiceId,
	clientEmail,
	open,
	onSuccess,
	onClose,
}: MarkAsSentDialogProps) {
	const [isPending, startTransition] = useTransition();
	const [sendEmail, setSendEmail] = useState(false);

	function handleClose() {
		setSendEmail(false);
		onClose();
	}

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		startTransition(async () => {
			const result = await markAsSentAction({
				invoiceId,
				sendEmail: sendEmail && Boolean(clientEmail),
			});

			if ('error' in result) {
				toast.error(result.error);
				return;
			}

			if (result.emailWarning) {
				toast.warning(result.emailWarning);
			} else {
				toast.success(
					result.emailedTo
						? `Invoice marked as sent and emailed to ${result.emailedTo}`
						: 'Invoice marked as sent'
				);
			}

			onSuccess();
			handleClose();
		});
	}

	return (
		<Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Mark Invoice as Sent</DialogTitle>
					<DialogDescription>
						Record this invoice as sent. Email delivery is optional.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className='space-y-4' aria-busy={isPending}>
					{clientEmail && (
						<div className='flex items-start gap-2'>
							<Checkbox
								id='send-invoice-email'
								checked={sendEmail}
								onCheckedChange={(value) => setSendEmail(value === true)}
								className='mt-0.5'
								disabled={isPending}
							/>
							<div className='min-w-0 flex-1'>
								<Label
									htmlFor='send-invoice-email'
									className='cursor-pointer text-sm font-normal leading-relaxed'
								>
									Email invoice to{' '}
									<span className='break-all font-medium'>{clientEmail}</span>
								</Label>
								<p className='text-xs text-muted-foreground'>
									Sends the invoice PDF using the configured email service.
								</p>
							</div>
						</div>
					)}

					<div className='flex gap-3'>
						<Button
							type='button'
							variant='outline'
							onClick={handleClose}
							className='flex-1'
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button type='submit' className='flex-1' disabled={isPending}>
							{isPending && (
								<Loader2
									className='mr-2 h-4 w-4 animate-spin'
									aria-hidden='true'
								/>
							)}
							Mark as Sent
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
