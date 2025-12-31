'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
	updateBudgetSchema,
	UpdateBudgetInput,
} from '@/server/modules/budget/budget.types';
import { updateBudgetAction } from '@/server/modules/budget/budget.controller';
import { Budget, Category } from '@prisma/client';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Settings2 } from 'lucide-react';
import { format } from 'date-fns';

// Extended Budget type with name field (matches Prisma schema)
interface BudgetWithName extends Budget {
	name: string;
	category: Category;
}

interface EditBudgetDialogProps {
	budget: BudgetWithName;
	categories: Category[];
}

export function EditBudgetDialog({ budget, categories }: EditBudgetDialogProps) {
	const [open, setOpen] = useState(false);
	const [isPending, setIsPending] = useState(false);
	const [showCustomYearInput, setShowCustomYearInput] = useState(false);

	const budgetDate = new Date(budget.month);
	const currentYear = new Date().getFullYear();
	const years = Array.from({ length: 5 }, (_, i) => currentYear + i);

	const form = useForm<UpdateBudgetInput>({
		resolver: zodResolver(updateBudgetSchema),
		defaultValues: {
			id: budget.id,
			name: budget.name,
			amount: Number(budget.amount),
			categoryId: budget.categoryId,
			month: budgetDate,
		},
	});

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

	async function onSubmit(data: UpdateBudgetInput) {
		setIsPending(true);
		const formData = new FormData();
		formData.append('id', data.id);
		if (data.name) formData.append('name', data.name);
		if (data.amount) formData.append('amount', data.amount.toString());
		if (data.categoryId) formData.append('categoryId', data.categoryId);
		if (data.month) formData.append('month', data.month.toISOString());

		const result = await updateBudgetAction(formData);
		setIsPending(false);

		if (result?.error) {
			console.error(result.error);
		} else {
			setOpen(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant='outline' size='sm' className='gap-2'>
					<Settings2 className='h-4 w-4' />
					Edit Budget
				</Button>
			</DialogTrigger>
			<DialogContent className='sm:max-w-[425px]'>
				<DialogHeader>
					<DialogTitle>Edit Budget</DialogTitle>
					<DialogDescription>
						Update budget details. Changes will affect tracking for{' '}
						{format(budgetDate, 'MMMM yyyy')}.
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className='space-y-4'
					>
						<FormField
							control={form.control}
							name='name'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Budget Name</FormLabel>
									<FormControl>
										<Input
											placeholder='e.g., Groceries Budget'
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

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

						<FormField
							control={form.control}
							name='categoryId'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Category</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder='Select category' />
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
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name='month'
							render={({ field }) => {
								const selectedDate = field.value || budgetDate;
								const selectedMonth = selectedDate.getMonth();
								const selectedYear =
									selectedDate.getFullYear();

								const isCustomYear =
									!years.includes(selectedYear);

								const handleMonthChange = (
									monthIndex: string
								) => {
									const newDate = new Date(
										selectedYear,
										parseInt(monthIndex),
										1
									);
									field.onChange(newDate);
								};

								return (
									<FormItem>
										<FormLabel>Budget Month</FormLabel>
										<div className='flex gap-2'>
											<Select
												value={selectedMonth.toString()}
												onValueChange={
													handleMonthChange
												}
											>
												<FormControl>
													<SelectTrigger className='flex-1'>
														<SelectValue placeholder='Month' />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{months.map(
														(month, index) => (
															<SelectItem
																key={month}
																value={index.toString()}
															>
																{month}
															</SelectItem>
														)
													)}
												</SelectContent>
											</Select>

											{showCustomYearInput ||
											isCustomYear ? (
												<div className='flex gap-1'>
													<Input
														type='number'
														className='w-[100px]'
														placeholder='Year'
														min={1900}
														max={2100}
														value={selectedYear}
														onChange={(e) => {
															const year =
																parseInt(
																	e.target
																		.value
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
																field.onChange(
																	newDate
																);
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
																field.onChange(
																	newDate
																);
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
														if (
															value ===
															'__custom__'
														) {
															setShowCustomYearInput(
																true
															);
														} else {
															const newDate =
																new Date(
																	parseInt(
																		value
																	),
																	selectedMonth,
																	1
																);
															field.onChange(
																newDate
															);
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
											Select the month this budget applies
											to
										</FormDescription>
										<FormMessage />
									</FormItem>
								);
							}}
						/>

						<DialogFooter>
							<Button type='submit' disabled={isPending}>
								{isPending ? 'Saving...' : 'Save Changes'}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
