'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { CalendarIcon, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
	createExpenseSchema,
	CreateExpenseInput,
} from '@/server/modules/expense/expense.types';
import { createExpenseAction } from '@/server/modules/expense/expense.controller';
import { useState } from 'react';
import { Account, Category, Budget } from '@prisma/client';

interface BudgetWithCategory extends Budget {
	category: Category;
}

interface ExpenseFormProps {
	accounts: Account[];
	categories: Category[];
	budgets: BudgetWithCategory[];
}

export function ExpenseForm({
	accounts,
	categories,
	budgets,
}: ExpenseFormProps) {
	const [isPending, setIsPending] = useState(false);
	const [showCustomCategoryInput, setShowCustomCategoryInput] =
		useState(false);
	const [confirmationName, setConfirmationName] = useState('');

	// Sort accounts: Spending first (Bank, Cash, Credit), then others
	const sortedAccounts = [...accounts].sort((a, b) => {
		const isASpending = ['BANK', 'CASH', 'CREDIT'].includes(a.type);
		const isBSpending = ['BANK', 'CASH', 'CREDIT'].includes(b.type);
		if (isASpending && !isBSpending) return -1;
		if (!isASpending && isBSpending) return 1;
		return a.name.localeCompare(b.name);
	});

	const form = useForm({
		resolver: zodResolver(createExpenseSchema),
		defaultValues: {
			amount: 0,
			description: '',
			date: new Date(),
			isRecurring: false,
			categoryId: undefined,
			categoryName: '',
			accountId: undefined,
			budgetId: undefined,
		},
	});

	const isRecurring = form.watch('isRecurring');
	const selectedAccountId = form.watch('accountId');
	const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
	const isSavingsAccount = selectedAccount?.type === 'SAVINGS';

	const isSubmitDisabled =
		isPending ||
		(isSavingsAccount && confirmationName !== selectedAccount?.name);

	async function onSubmit(data: CreateExpenseInput) {
		setIsPending(true);
		const formData = new FormData();
		formData.append('amount', data.amount.toString());
		formData.append('description', data.description || '');
		formData.append('date', data.date.toISOString());

		// Handle category: pass either categoryId or categoryName
		if (data.categoryId) {
			formData.append('categoryId', data.categoryId);
		} else if (data.categoryName) {
			formData.append('categoryName', data.categoryName);
		}

		if (data.accountId) formData.append('accountId', data.accountId);
		if (data.budgetId) formData.append('budgetId', data.budgetId);
		if (data.notes) formData.append('notes', data.notes);
		if (data.isRecurring) formData.append('isRecurring', 'on');
		if (data.recurringPeriod)
			formData.append('recurringPeriod', data.recurringPeriod);

		const result = await createExpenseAction(formData);
		setIsPending(false);

		if (result?.error) {
			console.error(result.error);
			// Handle error (toast)
		} else {
			form.reset({
				amount: 0,
				description: '',
				date: new Date(),
				isRecurring: false,
				categoryId: undefined,
				categoryName: '',
				accountId: undefined,
				budgetId: undefined,
				recurringPeriod: undefined,
			});
			setShowCustomCategoryInput(false); // Reset custom category state
			// Handle success (toast)
		}
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
				<FormField
					control={form.control}
					name='amount'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Amount</FormLabel>
							<FormControl>
								<CurrencyInput
									placeholder='0.00'
									value={field.value}
									onChange={field.onChange}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name='description'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Description</FormLabel>
							<FormControl>
								<Input
									placeholder='Groceries, Rent, etc.'
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name='accountId'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Account</FormLabel>
							<Select
								onValueChange={(val) => {
									field.onChange(val);
									setConfirmationName(''); // Reset confirmation on change
								}}
								value={field.value || ''}
							>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder='Select an account' />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									<SelectItem
										value='__placeholder__'
										disabled
										className='hidden'
									>
										Select an account
									</SelectItem>
									{/* Group 1: Spendable */}
									{sortedAccounts
										.filter((a) =>
											['BANK', 'CASH', 'CREDIT'].includes(
												a.type
											)
										)
										.map((account) => (
											<SelectItem
												key={account.id}
												value={account.id}
											>
												{account.name}
											</SelectItem>
										))}

									{/* Group 2: Savings/Other (Separator) */}
									{sortedAccounts.some(
										(a) =>
											![
												'BANK',
												'CASH',
												'CREDIT',
											].includes(a.type)
									) && (
										<div className='border-t my-1 mx-2 text-[10px] text-muted-foreground pt-1'>
											SAVINGS & RESERVES
										</div>
									)}

									{sortedAccounts
										.filter(
											(a) =>
												![
													'BANK',
													'CASH',
													'CREDIT',
												].includes(a.type)
										)
										.map((account) => (
											<SelectItem
												key={account.id}
												value={account.id}
												className='text-amber-600 dark:text-amber-500 font-medium'
											>
												🔒 {account.name}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>

				{isSavingsAccount && selectedAccount && (
					<div className='rounded-md bg-amber-50 dark:bg-amber-950/30 p-4 border border-amber-200 dark:border-amber-800'>
						<div className='flex items-start gap-3'>
							<AlertTriangle className='h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5' />
							<div className='space-y-2 w-full'>
								<h4 className='text-sm font-semibold text-amber-800 dark:text-amber-500'>
									Spending from Savings detected
								</h4>
								<p className='text-xs text-amber-700 dark:text-amber-600'>
									Direct spending from {selectedAccount.name}{' '}
									reduces your wealth momentum. Consider a
									Transfer execution instead.
								</p>
								<div className='pt-2'>
									<label className='text-xs font-medium text-amber-800 dark:text-amber-500 mb-1 block'>
										Type &quot;{selectedAccount.name}&quot;
										to confirm:
									</label>
									<Input
										value={confirmationName}
										onChange={(e) =>
											setConfirmationName(e.target.value)
										}
										placeholder={selectedAccount.name}
										className={cn(
											'bg-white dark:bg-black border-amber-300 focus-visible:ring-amber-500',
											confirmationName ===
												selectedAccount.name
												? 'border-green-500 ring-green-500'
												: ''
										)}
									/>
								</div>
							</div>
						</div>
					</div>
				)}

				<FormField
					control={form.control}
					name='date'
					render={({ field }) => (
						<FormItem className='flex flex-col'>
							<FormLabel>Date</FormLabel>
							<Popover>
								<PopoverTrigger asChild>
									<FormControl>
										<Button
											variant={'outline'}
											className={cn(
												'w-full pl-3 text-left font-normal',
												!field.value &&
													'text-muted-foreground'
											)}
										>
											{field.value ? (
												<span suppressHydrationWarning>
													{format(field.value, 'PPP')}
												</span>
											) : (
												<span>Pick a date</span>
											)}
											<CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
										</Button>
									</FormControl>
								</PopoverTrigger>
								<PopoverContent
									className='w-auto p-0'
									align='start'
								>
									<Calendar
										mode='single'
										selected={field.value}
										onSelect={field.onChange}
										disabled={(date) =>
											date > new Date() ||
											date < new Date('1900-01-01')
										}
										initialFocus
									/>
								</PopoverContent>
							</Popover>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Category Selection: Select or Create Custom */}
				<FormField
					control={form.control}
					name='categoryId'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Category</FormLabel>
							<div className='space-y-2'>
								<Select
									onValueChange={(value) => {
										if (value === '__custom__') {
											// Clear categoryId and show custom input
											field.onChange(undefined);
											form.setValue('categoryName', '');
											setShowCustomCategoryInput(true);
										} else {
											// Set categoryId, clear categoryName, and hide custom input
											field.onChange(value);
											form.setValue('categoryName', '');
											setShowCustomCategoryInput(false);
										}
									}}
									value={
										showCustomCategoryInput
											? '__custom__'
											: field.value || ''
									}
								>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder='Select a category or create new' />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										<SelectItem
											value='__placeholder__'
											disabled
											className='hidden'
										>
											Select a category
										</SelectItem>
										{categories.map((category) => (
											<SelectItem
												key={category.id}
												value={category.id}
											>
												{category.name}
											</SelectItem>
										))}
										<SelectItem value='__custom__'>
											➕ Create Custom Category
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Show input field only when user selects "Create Custom Category" */}
				{showCustomCategoryInput && (
					<FormField
						control={form.control}
						name='categoryName'
						render={({ field }) => (
							<FormItem>
								<FormControl>
									<Input
										placeholder='Enter new category name'
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}

				<FormField
					control={form.control}
					name='budgetId'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Budget (Optional)</FormLabel>
							<Select
								onValueChange={field.onChange}
								value={field.value || ''}
							>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder='Link to a budget (optional)' />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									<SelectItem
										value='__placeholder__'
										disabled
										className='hidden'
									>
										Select a budget
									</SelectItem>
									{budgets.map((budget) => (
										<SelectItem
											key={budget.id}
											value={budget.id}
										>
											{budget.category.name} -{' '}
											{format(budget.month, 'MMMM yyyy')}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name='isRecurring'
					render={({ field }) => (
						<FormItem className='flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4'>
							<FormControl>
								<Checkbox
									checked={field.value}
									onCheckedChange={field.onChange}
								/>
							</FormControl>
							<div className='space-y-1 leading-none'>
								<FormLabel>Recurring Expense</FormLabel>
							</div>
						</FormItem>
					)}
				/>

				{isRecurring && (
					<FormField
						control={form.control}
						name='recurringPeriod'
						render={({ field }) => (
							<FormItem>
								<FormLabel>Frequency</FormLabel>
								<Select
									onValueChange={field.onChange}
									value={field.value || ''}
								>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder='Select frequency' />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										<SelectItem value='WEEKLY'>
											Weekly
										</SelectItem>
										<SelectItem value='MONTHLY'>
											Monthly
										</SelectItem>
										<SelectItem value='YEARLY'>
											Yearly
										</SelectItem>
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}

				<Button
					type='submit'
					disabled={isSubmitDisabled}
					className={cn(
						isSavingsAccount
							? 'w-full bg-amber-600 hover:bg-amber-700'
							: ''
					)}
				>
					{isPending
						? 'Saving...'
						: isSavingsAccount
						? 'Confirm Savings Withdrawal'
						: 'Add Expense'}
				</Button>
			</form>
		</Form>
	);
}
