'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
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
	createIncomeSchema,
	CreateIncomeInput,
} from '@/server/modules/income/income.types';
import {
	createIncomeAction,
	getIncomeStabilityAction,
} from '@/server/modules/income/income.controller';
import { useState, useEffect } from 'react';
import { Account, Category } from '@prisma/client';

interface IncomeFormProps {
	accounts: Account[];
	categories: Category[];
	hasEmergencyFundAccount?: boolean;
}

export function IncomeForm({
	accounts,
	categories,
	hasEmergencyFundAccount,
}: IncomeFormProps) {
	const [isPending, setIsPending] = useState(false);
	const [showCustomCategoryInput, setShowCustomCategoryInput] =
		useState(false);
	const [efSuggestion, setEfSuggestion] = useState<{
		suggestedPercentage: number;
		reasoning: string;
	} | null>(null);
	const [loadingEfSuggestion, setLoadingEfSuggestion] = useState(false);

	const form = useForm({
		resolver: zodResolver(createIncomeSchema),
		defaultValues: {
			amount: 0,
			description: '',
			date: new Date(),
			isRecurring: false,
			categoryId: undefined,
			categoryName: '',
			accountId: accounts.length === 1 ? accounts[0].id : undefined,
			titheEnabled: true,
			tithePercentage: 10,
			emergencyFundEnabled: false,
			emergencyFundPercentage: 10,
		},
	});

	const isRecurring = form.watch('isRecurring');
	const titheEnabled = form.watch('titheEnabled');
	const categoryId = form.watch('categoryId');
	const emergencyFundEnabled = form.watch('emergencyFundEnabled');

	// Fetch EF suggestion when enabled
	useEffect(() => {
		if (emergencyFundEnabled && !efSuggestion) {
			setLoadingEfSuggestion(true);
			getIncomeStabilityAction().then((result) => {
				if (result.success && result.data) {
					setEfSuggestion({
						suggestedPercentage: result.data.suggestedPercentage,
						reasoning: result.data.reasoning,
					});
					form.setValue(
						'emergencyFundPercentage',
						result.data.suggestedPercentage
					);
				}
				setLoadingEfSuggestion(false);
			});
		}
	}, [emergencyFundEnabled, efSuggestion, form]);

	async function onSubmit(data: CreateIncomeInput) {
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
		if (data.isRecurring) formData.append('isRecurring', 'on');
		if (data.recurringPeriod)
			formData.append('recurringPeriod', data.recurringPeriod);
		if (data.titheEnabled) {
			formData.append('titheEnabled', 'on');
			formData.append('tithePercentage', data.tithePercentage.toString());
		}
		if (data.emergencyFundEnabled) {
			formData.append('emergencyFundEnabled', 'on');
			formData.append(
				'emergencyFundPercentage',
				data.emergencyFundPercentage?.toString() || '10'
			);
		}

		const result = await createIncomeAction(formData);
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
				titheEnabled: true,
				tithePercentage: 10,
				emergencyFundEnabled: false,
				emergencyFundPercentage: 10,
				recurringPeriod: undefined,
			});
			setShowCustomCategoryInput(false);
			setEfSuggestion(null);
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
									placeholder='Paycheck, Freelance, etc.'
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

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
												format(field.value, 'PPP')
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
					name='categoryName'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Category</FormLabel>
							<div className='space-y-2'>
								<Select
									onValueChange={(value) => {
										if (value === '__custom__') {
											// Clear categoryId and show custom input
											form.setValue(
												'categoryId',
												undefined
											);
											field.onChange('');
											setShowCustomCategoryInput(true);
										} else {
											// Set categoryId, clear categoryName, and hide custom input
											form.setValue('categoryId', value);
											field.onChange('');
											setShowCustomCategoryInput(false);
										}
									}}
									value={
										showCustomCategoryInput
											? '__custom__'
											: categoryId || ''
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

								{/* Show input field only when user selects "Create Custom Category" */}
								{showCustomCategoryInput && (
									<FormControl>
										<Input
											placeholder='Enter new category name'
											{...field}
										/>
									</FormControl>
								)}
							</div>
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
								onValueChange={field.onChange}
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
									{accounts.map((account) => (
										<SelectItem
											key={account.id}
											value={account.id}
										>
											<span className='truncate'>
												{account.name} (
												{formatCurrency(
													Number(account.balance),
													{ decimals: 0 }
												)}
												)
											</span>
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
								<FormLabel>Recurring Income</FormLabel>
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

				<FormField
					control={form.control}
					name='titheEnabled'
					render={({ field }) => (
						<FormItem className='flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4'>
							<FormControl>
								<Checkbox
									checked={field.value}
									onCheckedChange={field.onChange}
								/>
							</FormControl>
							<div className='space-y-1 leading-none'>
								<FormLabel>Deduct Church Tithe?</FormLabel>
								<p className='text-sm text-muted-foreground'>
									Automatically transfer a percentage to the
									Tithes account.
								</p>
							</div>
						</FormItem>
					)}
				/>

				{titheEnabled && (
					<FormField
						control={form.control}
						name='tithePercentage'
						render={({ field }) => (
							<FormItem>
								<FormLabel>Tithe Percentage (%)</FormLabel>
								<FormControl>
									<CurrencyInput
										value={field.value}
										onChange={field.onChange}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}

				{hasEmergencyFundAccount && (
					<>
						<FormField
							control={form.control}
							name='emergencyFundEnabled'
							render={({ field }) => (
								<FormItem className='flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4'>
									<FormControl>
										<Checkbox
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
									</FormControl>
									<div className='space-y-1 leading-none'>
										<FormLabel>
											Contribute to Emergency Fund?
										</FormLabel>
										<p className='text-sm text-muted-foreground'>
											Automatically transfer a percentage
											to your Emergency Fund.
										</p>
									</div>
								</FormItem>
							)}
						/>

						{emergencyFundEnabled && (
							<div className='space-y-3'>
								{loadingEfSuggestion ? (
									<div className='text-sm text-muted-foreground animate-pulse'>
										Analyzing your income patterns...
									</div>
								) : (
									efSuggestion && (
										<div className='rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-3'>
											<p className='text-sm text-blue-800 dark:text-blue-200'>
												<strong>Smart Suggestion:</strong>{' '}
												{efSuggestion.reasoning}
											</p>
										</div>
									)
								)}

								<FormField
									control={form.control}
									name='emergencyFundPercentage'
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												Emergency Fund Percentage (%)
											</FormLabel>
											<FormControl>
												<CurrencyInput
													value={field.value}
													onChange={field.onChange}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						)}
					</>
				)}

				<Button type='submit' disabled={isPending}>
					{isPending ? 'Saving...' : 'Add Income'}
				</Button>
			</form>
		</Form>
	);
}
