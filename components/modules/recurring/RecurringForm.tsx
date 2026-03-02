'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { createRecurringAction } from '@/server/modules/recurring/recurring.controller';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface RecurringFormProps {
	categories: Array<{ id: string; name: string; type: string }>;
	accounts: Array<{ id: string; name: string }>;
}

const FREQUENCIES = [
	{ value: 'DAILY', label: 'Daily' },
	{ value: 'WEEKLY', label: 'Weekly' },
	{ value: 'BIWEEKLY', label: 'Bi-weekly' },
	{ value: 'MONTHLY', label: 'Monthly' },
	{ value: 'YEARLY', label: 'Yearly' },
];

export function RecurringForm({ categories, accounts }: RecurringFormProps) {
	const [loading, setLoading] = useState(false);
	const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
	const [amount, setAmount] = useState<number | undefined>(undefined);

	const filteredCategories = categories.filter(
		(c) => c.type === type
	);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setLoading(true);

		const form = e.currentTarget;
		const formData = new FormData(form);
		formData.set('type', type);
		formData.set('amount', String(amount ?? 0));

		const result = await createRecurringAction(formData);
		setLoading(false);

		if (result?.error) {
			toast.error(result.error);
		} else {
			toast.success('Recurring transaction created');
			form.reset();
			setAmount(undefined);
		}
	}

	return (
		<form onSubmit={handleSubmit} className='space-y-4'>
			<div className='space-y-2'>
				<Label htmlFor='name'>Name</Label>
				<Input
					id='name'
					name='name'
					placeholder='e.g. Monthly Rent'
					required
				/>
			</div>

			<div className='space-y-2'>
				<Label>Type</Label>
				<Select
					value={type}
					onValueChange={(v) => setType(v as 'INCOME' | 'EXPENSE')}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='EXPENSE'>Expense</SelectItem>
						<SelectItem value='INCOME'>Income</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className='space-y-2'>
				<Label htmlFor='amount'>Amount</Label>
				<CurrencyInput
					id='amount'
					value={amount}
					onChange={setAmount}
				/>
			</div>

			<div className='space-y-2'>
				<Label>Category</Label>
				<Select name='categoryId' required>
					<SelectTrigger>
						<SelectValue placeholder='Select category' />
					</SelectTrigger>
					<SelectContent>
						{filteredCategories.map((c) => (
							<SelectItem key={c.id} value={c.id}>
								{c.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className='space-y-2'>
				<Label>Account (optional)</Label>
				<Select name='accountId'>
					<SelectTrigger>
						<SelectValue placeholder='No account linked' />
					</SelectTrigger>
					<SelectContent>
						{accounts.map((a) => (
							<SelectItem key={a.id} value={a.id}>
								{a.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className='space-y-2'>
				<Label>Frequency</Label>
				<Select name='frequency' defaultValue='MONTHLY'>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{FREQUENCIES.map((f) => (
							<SelectItem key={f.value} value={f.value}>
								{f.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className='grid grid-cols-2 gap-4'>
				<div className='space-y-2'>
					<Label htmlFor='startDate'>Start Date</Label>
					<Input
						id='startDate'
						name='startDate'
						type='date'
						required
					/>
				</div>
				<div className='space-y-2'>
					<Label htmlFor='endDate'>End Date (optional)</Label>
					<Input id='endDate' name='endDate' type='date' />
				</div>
			</div>

			<div className='space-y-2'>
				<Label htmlFor='description'>Description (optional)</Label>
				<Input
					id='description'
					name='description'
					placeholder='Optional notes'
				/>
			</div>

			<Button type='submit' className='w-full' disabled={loading}>
				{loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
				Create Recurring Transaction
			</Button>
		</form>
	);
}
