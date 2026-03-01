'use client';

import { useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { addContributionAction } from '@/server/modules/goal/goal.controller';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface AddContributionDialogProps {
	goalId: string;
	goalName: string;
	open: boolean;
	onClose: () => void;
}

export function AddContributionDialog({
	goalId,
	goalName,
	open,
	onClose,
}: AddContributionDialogProps) {
	const [loading, setLoading] = useState(false);
	const [amount, setAmount] = useState<number | undefined>(undefined);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setLoading(true);

		const form = e.currentTarget;
		const formData = new FormData(form);
		formData.set('goalId', goalId);
		formData.set('amount', String(amount ?? 0));

		const result = await addContributionAction(formData);
		setLoading(false);

		if (result?.error) {
			toast.error(result.error);
		} else {
			toast.success('Contribution added');
			setAmount(undefined);
			onClose();
		}
	}

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add Contribution to {goalName}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className='space-y-4'>
					<div className='space-y-2'>
						<Label htmlFor='contrib-amount'>Amount</Label>
						<CurrencyInput
							id='contrib-amount'
							value={amount}
							onChange={setAmount}
						/>
					</div>

					<div className='space-y-2'>
						<Label htmlFor='contrib-note'>Note (optional)</Label>
						<Input
							id='contrib-note'
							name='note'
							placeholder='e.g. Monthly savings'
						/>
					</div>

					<div className='space-y-2'>
						<Label htmlFor='contrib-date'>Date</Label>
						<Input
							id='contrib-date'
							name='date'
							type='date'
							defaultValue={new Date().toISOString().slice(0, 10)}
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
							disabled={loading || !amount}
						>
							{loading && (
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							)}
							Add
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
