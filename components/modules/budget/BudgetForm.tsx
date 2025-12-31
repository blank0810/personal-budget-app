'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	createBudgetSchema,
	CreateBudgetInput,
} from '@/server/modules/budget/budget.types';
import { createBudgetAction } from '@/server/modules/budget/budget.controller';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Category } from '@prisma/client';

interface BudgetFormProps {
	categories: Category[];
}

export function BudgetForm({ categories }: BudgetFormProps) {
	const router = useRouter();
	const [isPending, setIsPending] = useState(false);
	const [showCustomCategoryInput, setShowCustomCategoryInput] =
		useState(false);
	const [showCustomYearInput, setShowCustomYearInput] = useState(false);

	const form = useForm<CreateBudgetInput>({
		resolver: zodResolver(createBudgetSchema),
		defaultValues: {
			name: '',
			amount: 0,
			categoryId: '',
			categoryName: '',
			month: new Date(),
		},
	});

	// Watch categoryId for the Select component
	const watchedCategoryId = useWatch({
		control: form.control,
		name: 'categoryId',
	});

	async function onSubmit(data: CreateBudgetInput) {
		setIsPending(true);
		const formData = new FormData();
		formData.append('name', data.name);
		formData.append('amount', data.amount.toString());

		// Handle category: pass either categoryId or categoryName
		if (data.categoryId && data.categoryId.length > 0) {
			formData.append('categoryId', data.categoryId);
		} else if (data.categoryName && data.categoryName.length > 0) {
			formData.append('categoryName', data.categoryName);
		}

		formData.append('month', data.month.toISOString());

		const result = await createBudgetAction(formData);
		setIsPending(false);

		if (result?.error) {
			console.error(result.error);
		} else {
			form.reset();
			setShowCustomCategoryInput(false);
			setShowCustomYearInput(false);
			router.refresh();
		}
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
				{/* Budget Name - Primary identifier */}
				<FormField
					control={form.control}
					name='name'
					render={({ field }) => (
						<FormItem>
							<FormLabel className='flex items-center gap-2'>
								<Wallet className='h-4 w-4' />
								Budget Name
							</FormLabel>
							<FormControl>
								<Input
									placeholder='e.g., "My Insurance", "Groceries Budget"'
									{...field}
								/>
							</FormControl>
							<FormDescription>
								Give your budget a unique name (envelope-style)
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Budget Amount */}
				<FormField
					control={form.control}
					name='amount'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Budget Limit</FormLabel>
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

				{/* Register categoryId with the form */}
				<input type='hidden' {...form.register('categoryId')} />

				{/* Category Selection */}
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
											form.setValue('categoryId', '', { shouldValidate: true });
											form.setValue('categoryName', '');
											setShowCustomCategoryInput(true);
										} else {
											form.setValue('categoryId', value, { shouldValidate: true });
											form.setValue('categoryName', '');
											setShowCustomCategoryInput(false);
										}
									}}
									value={watchedCategoryId || ''}
								>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder='Select category or create new' />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{categories.map((category) => (
											<SelectItem
												key={category.id}
												value={category.id}
											>
												{category.name}
											</SelectItem>
										))}
										<SelectItem value='__custom__'>
											+ Create Custom Category
										</SelectItem>
									</SelectContent>
								</Select>

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

				{/* Month Picker - Month and Year only */}
				<FormField
					control={form.control}
					name='month'
					render={({ field }) => {
						const selectedDate = field.value || new Date();
						const selectedMonth = selectedDate.getMonth();
						const selectedYear = selectedDate.getFullYear();

						const months = [
							'January',
							'February',
							'March',
							'April',
							'May',
							'June',
							'July',
							'August',
							'September',
							'October',
							'November',
							'December',
						];

						// Generate year options (current year + 4 more = 5 years)
						const currentYear = new Date().getFullYear();
						const years = Array.from(
							{ length: 5 },
							(_, i) => currentYear + i
						);

						const handleMonthChange = (monthIndex: string) => {
							const newDate = new Date(
								selectedYear,
								parseInt(monthIndex),
								1
							);
							field.onChange(newDate);
						};

						// Check if current year is outside dropdown range
						const isCustomYear = !years.includes(selectedYear);

						return (
							<FormItem>
								<FormLabel>Budget Month</FormLabel>
								<div className='flex gap-2'>
									<Select
										value={selectedMonth.toString()}
										onValueChange={handleMonthChange}
									>
										<FormControl>
											<SelectTrigger className='flex-1'>
												<SelectValue placeholder='Month' />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{months.map((month, index) => (
												<SelectItem
													key={month}
													value={index.toString()}
												>
													{month}
												</SelectItem>
											))}
										</SelectContent>
									</Select>

									{/* Year: Dropdown or Custom Input */}
									{showCustomYearInput || isCustomYear ? (
										<div className='flex gap-1'>
											<Input
												type='number'
												className='w-[100px]'
												placeholder='Year'
												min={1900}
												max={2100}
												value={selectedYear}
												onChange={(e) => {
													const year = parseInt(
														e.target.value
													);
													if (
														!isNaN(year) &&
														year >= 1900 &&
														year <= 2100
													) {
														const newDate =
															new Date(
																year,
																selectedMonth,
																1
															);
														field.onChange(newDate);
													}
												}}
											/>
											<Button
												type='button'
												variant='ghost'
												size='icon'
												className='h-9 w-9'
												onClick={() => {
													setShowCustomYearInput(
														false
													);
													// Reset to current year if outside range
													if (
														!years.includes(
															selectedYear
														)
													) {
														const newDate =
															new Date(
																currentYear,
																selectedMonth,
																1
															);
														field.onChange(newDate);
													}
												}}
											>
												<span className='text-xs'>
													×
												</span>
											</Button>
										</div>
									) : (
										<Select
											value={selectedYear.toString()}
											onValueChange={(value) => {
												if (value === '__custom__') {
													setShowCustomYearInput(
														true
													);
												} else {
													const newDate = new Date(
														parseInt(value),
														selectedMonth,
														1
													);
													field.onChange(newDate);
												}
											}}
										>
											<FormControl>
												<SelectTrigger className='w-[120px]'>
													<SelectValue placeholder='Year' />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{years.map((year) => (
													<SelectItem
														key={year}
														value={year.toString()}
													>
														{year}
													</SelectItem>
												))}
												<SelectItem value='__custom__'>
													Other...
												</SelectItem>
											</SelectContent>
										</Select>
									)}
								</div>
								<FormDescription>
									Select the month this budget applies to
								</FormDescription>
								<FormMessage />
							</FormItem>
						);
					}}
				/>

				<Button type='submit' disabled={isPending} className='w-full'>
					{isPending ? 'Creating...' : 'Create Budget'}
				</Button>
			</form>
		</Form>
	);
}
