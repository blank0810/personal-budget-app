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

interface Budget {
	id: string;
	name: string;
	categoryId: string;
	amount: number;
}

interface RecurringFormProps {
	categories: Array<{ id: string; name: string; type: string }>;
	accounts: Array<{ id: string; name: string }>;
	budgets: Budget[];
	onSuccess?: () => void;
}

const FREQUENCIES = [
	{ value: 'DAILY', label: 'Daily' },
	{ value: 'WEEKLY', label: 'Weekly' },
	{ value: 'BIWEEKLY', label: 'Bi-weekly' },
	{ value: 'MONTHLY', label: 'Monthly' },
	{ value: 'YEARLY', label: 'Yearly' },
];

export function RecurringForm({ categories, accounts, budgets, onSuccess }: RecurringFormProps) {
	const [loading, setLoading] = useState(false);
	const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
	const [amount, setAmount] = useState<number | undefined>(undefined);
	const [categoryId, setCategoryId] = useState('');
	const [budgetId, setBudgetId] = useState('');

	const filteredCategories = categories.filter((c) => c.type === type);

	// Budgets filtered to the selected category (only relevant for EXPENSE)
	const filteredBudgets = budgets.filter((b) => b.categoryId === categoryId);

	function handleTypeChange(v: string) {
		setType(v as 'INCOME' | 'EXPENSE');
		setCategoryId('');
		setBudgetId('');
	}

	function handleCategoryChange(v: string) {
		setCategoryId(v);
		setBudgetId('');
	}

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setLoading(true);

		const form = e.currentTarget;
		const formData = new FormData(form);
		formData.set('type', type);
		formData.set('amount', String(amount ?? 0));
		formData.set('categoryId', categoryId);
		if (budgetId) {
			formData.set('budgetId', budgetId);
		}

		const result = await createRecurringAction(formData);
		setLoading(false);

		if (result?.error) {
			toast.error(result.error);
		} else {
			toast.success('Recurring transaction created');
			form.reset();
			setAmount(undefined);
			setCategoryId('');
			setBudgetId('');
			onSuccess?.();
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
					onValueChange={handleTypeChange}
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
				<Select
					value={categoryId}
					onValueChange={handleCategoryChange}
					required
				>
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

			{type === 'EXPENSE' && (
				<div className='space-y-2'>
					<Label>Budget (optional)</Label>
					<Select
						value={budgetId}
						onValueChange={setBudgetId}
					>
						<SelectTrigger>
							<SelectValue placeholder='No budget linked' />
						</SelectTrigger>
						<SelectContent>
							{filteredBudgets.length === 0 ? (
								<SelectItem value='__none' disabled>
									{categoryId
										? 'No budgets for this category'
										: 'Select a category first'}
								</SelectItem>
							) : (
								filteredBudgets.map((b) => (
									<SelectItem key={b.id} value={b.id}>
										{b.name}
									</SelectItem>
								))
							)}
						</SelectContent>
					</Select>
				</div>
			)}

			<div className='space-y-2'>
				<Label>Account</Label>
				<Select name='accountId' required>
					<SelectTrigger>
						<SelectValue placeholder='Select account' />
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
