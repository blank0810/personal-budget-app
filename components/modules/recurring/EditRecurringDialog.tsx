'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
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
import { updateRecurringAction } from '@/server/modules/recurring/recurring.controller';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface EditRecurringDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	recurring: {
		id: string;
		name: string;
		type: string;
		amount: number;
		description?: string | null;
		frequency: string;
		startDate: string;
		endDate?: string | null;
		categoryId: string;
		accountId: string;
		budgetId?: string | null;
		isActive: boolean;
	};
	categories: { id: string; name: string; type: string }[];
	accounts: { id: string; name: string; type: string }[];
	budgets: { id: string; name: string; categoryId: string; amount: number }[];
}

const FREQUENCIES = [
	{ value: 'DAILY', label: 'Daily' },
	{ value: 'WEEKLY', label: 'Weekly' },
	{ value: 'BIWEEKLY', label: 'Bi-weekly' },
	{ value: 'MONTHLY', label: 'Monthly' },
	{ value: 'YEARLY', label: 'Yearly' },
];

// Format a date string or Date to YYYY-MM-DD for <input type="date" />
function toDateInputValue(value: string | null | undefined): string {
	if (!value) return '';
	const d = new Date(value);
	if (isNaN(d.getTime())) return '';
	return d.toISOString().slice(0, 10);
}

export function EditRecurringDialog({
	open,
	onOpenChange,
	recurring,
	categories,
	accounts,
	budgets,
}: EditRecurringDialogProps) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);

	const [type, setType] = useState<'INCOME' | 'EXPENSE'>(
		recurring.type as 'INCOME' | 'EXPENSE'
	);
	const [amount, setAmount] = useState<number | undefined>(recurring.amount);
	const [categoryId, setCategoryId] = useState(recurring.categoryId);
	const [accountId, setAccountId] = useState(recurring.accountId);
	const [frequency, setFrequency] = useState(recurring.frequency);
	const [budgetId, setBudgetId] = useState(recurring.budgetId ?? '');

	const filteredCategories = categories.filter((c) => c.type === type);
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
		formData.set('id', recurring.id);
		formData.set('type', type);
		formData.set('amount', String(amount ?? 0));
		formData.set('categoryId', categoryId);
		formData.set('accountId', accountId);
		formData.set('frequency', frequency);
		if (budgetId) {
			formData.set('budgetId', budgetId);
		} else {
			formData.delete('budgetId');
		}

		const result = await updateRecurringAction(formData);
		setLoading(false);

		if (result?.error) {
			toast.error(result.error);
		} else {
			toast.success('Recurring transaction updated');
			onOpenChange(false);
			router.refresh();
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-lg'>
				<DialogHeader>
					<DialogTitle>Edit Recurring Transaction</DialogTitle>
				</DialogHeader>

				<form onSubmit={handleSubmit} className='space-y-4'>
					<div className='space-y-2'>
						<Label htmlFor='edit-name'>Name</Label>
						<Input
							id='edit-name'
							name='name'
							defaultValue={recurring.name}
							placeholder='e.g. Monthly Rent'
							required
						/>
					</div>

					<div className='space-y-2'>
						<Label>Type</Label>
						<Select value={type} onValueChange={handleTypeChange}>
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
						<Label htmlFor='edit-amount'>Amount</Label>
						<CurrencyInput
							id='edit-amount'
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
										<SelectItem
											value='__none'
											disabled
										>
											{categoryId
												? 'No budgets for this category'
												: 'Select a category first'}
										</SelectItem>
									) : (
										filteredBudgets.map((b) => (
											<SelectItem
												key={b.id}
												value={b.id}
											>
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
						<Select
							value={accountId}
							onValueChange={setAccountId}
							required
						>
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
						<Select
							value={frequency}
							onValueChange={setFrequency}
						>
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
							<Label htmlFor='edit-startDate'>Start Date</Label>
							<Input
								id='edit-startDate'
								name='startDate'
								type='date'
								defaultValue={toDateInputValue(
									recurring.startDate
								)}
								required
							/>
						</div>
						<div className='space-y-2'>
							<Label htmlFor='edit-endDate'>
								End Date (optional)
							</Label>
							<Input
								id='edit-endDate'
								name='endDate'
								type='date'
								defaultValue={toDateInputValue(
									recurring.endDate
								)}
							/>
						</div>
					</div>

					<div className='space-y-2'>
						<Label htmlFor='edit-description'>
							Description (optional)
						</Label>
						<Input
							id='edit-description'
							name='description'
							placeholder='Optional notes'
							defaultValue={recurring.description ?? ''}
						/>
					</div>

					<div className='flex gap-2 pt-2'>
						<Button
							type='button'
							variant='outline'
							className='flex-1'
							onClick={() => onOpenChange(false)}
							disabled={loading}
						>
							Cancel
						</Button>
						<Button
							type='submit'
							className='flex-1'
							disabled={loading}
						>
							{loading && (
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							)}
							Save Changes
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
