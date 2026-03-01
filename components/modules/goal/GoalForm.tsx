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
import { createGoalAction } from '@/server/modules/goal/goal.controller';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const ICONS = [
	{ value: 'target', label: 'Target' },
	{ value: 'star', label: 'Star' },
	{ value: 'flame', label: 'Flame' },
	{ value: 'heart', label: 'Heart' },
	{ value: 'gift', label: 'Gift' },
	{ value: 'home', label: 'Home' },
	{ value: 'car', label: 'Car' },
	{ value: 'graduation', label: 'Education' },
	{ value: 'plane', label: 'Travel' },
	{ value: 'piggybank', label: 'Savings' },
];

const COLORS = [
	{ value: 'blue', label: 'Blue' },
	{ value: 'green', label: 'Green' },
	{ value: 'purple', label: 'Purple' },
	{ value: 'orange', label: 'Orange' },
	{ value: 'red', label: 'Red' },
	{ value: 'pink', label: 'Pink' },
];

interface GoalFormProps {
	accounts: Array<{ id: string; name: string }>;
}

export function GoalForm({ accounts }: GoalFormProps) {
	const [loading, setLoading] = useState(false);
	const [amount, setAmount] = useState<number | undefined>(undefined);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setLoading(true);

		const form = e.currentTarget;
		const formData = new FormData(form);
		formData.set('targetAmount', String(amount ?? 0));

		const result = await createGoalAction(formData);
		setLoading(false);

		if (result?.error) {
			toast.error(result.error);
		} else {
			toast.success('Goal created');
			form.reset();
			setAmount(undefined);
		}
	}

	return (
		<form onSubmit={handleSubmit} className='space-y-4'>
			<div className='space-y-2'>
				<Label htmlFor='name'>Goal Name</Label>
				<Input
					id='name'
					name='name'
					placeholder='e.g. Emergency Fund'
					required
				/>
			</div>

			<div className='space-y-2'>
				<Label htmlFor='targetAmount'>Target Amount</Label>
				<CurrencyInput
					id='targetAmount'
					value={amount}
					onChange={setAmount}
				/>
			</div>

			<div className='space-y-2'>
				<Label htmlFor='deadline'>Deadline (optional)</Label>
				<Input id='deadline' name='deadline' type='date' />
			</div>

			<div className='grid grid-cols-2 gap-4'>
				<div className='space-y-2'>
					<Label>Icon</Label>
					<Select name='icon' defaultValue='target'>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{ICONS.map((i) => (
								<SelectItem key={i.value} value={i.value}>
									{i.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className='space-y-2'>
					<Label>Color</Label>
					<Select name='color' defaultValue='blue'>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{COLORS.map((c) => (
								<SelectItem key={c.value} value={c.value}>
									{c.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className='space-y-2'>
				<Label>Linked Account (optional)</Label>
				<Select name='linkedAccountId'>
					<SelectTrigger>
						<SelectValue placeholder='No account linked' />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='__none__'>
							No account linked
						</SelectItem>
						{accounts.map((a) => (
							<SelectItem key={a.id} value={a.id}>
								{a.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<p className='text-xs text-muted-foreground'>
					Linked goals track progress automatically from account
					balance changes.
				</p>
			</div>

			<Button type='submit' className='w-full' disabled={loading}>
				{loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
				Create Goal
			</Button>
		</form>
	);
}
