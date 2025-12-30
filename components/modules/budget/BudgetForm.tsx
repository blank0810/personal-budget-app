'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { CalendarIcon, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import {
	createBudgetSchema,
	CreateBudgetInput,
} from '@/server/modules/budget/budget.types';
import { createBudgetAction } from '@/server/modules/budget/budget.controller';
import { useState } from 'react';
import { Category } from '@prisma/client';

interface BudgetFormProps {
	categories: Category[];
}

export function BudgetForm({ categories }: BudgetFormProps) {
	const [isPending, setIsPending] = useState(false);
	const [showCustomCategoryInput, setShowCustomCategoryInput] =
		useState(false);

	const form = useForm<CreateBudgetInput>({
		resolver: zodResolver(createBudgetSchema),
		defaultValues: {
			name: '',
			amount: 0,
			categoryId: undefined,
			categoryName: '',
			month: new Date(),
		},
	});

	async function onSubmit(data: CreateBudgetInput) {
		setIsPending(true);
		const formData = new FormData();
		formData.append('name', data.name);
		formData.append('amount', data.amount.toString());

		// Handle category: pass either categoryId or categoryName
		if (data.categoryId) {
			formData.append('categoryId', data.categoryId);
		} else if (data.categoryName) {
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
											form.setValue(
												'categoryId',
												undefined
											);
											field.onChange('');
											setShowCustomCategoryInput(true);
										} else {
											form.setValue('categoryId', value);
											field.onChange('');
											setShowCustomCategoryInput(false);
										}
									}}
									defaultValue={form.getValues('categoryId')}
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
											➕ Create Custom Category
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

				{/* Month Picker */}
				<FormField
					control={form.control}
					name='month'
					render={({ field }) => (
						<FormItem className='flex flex-col'>
							<FormLabel>Month</FormLabel>
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
												format(field.value, 'MMMM yyyy')
											) : (
												<span>Pick a month</span>
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
										initialFocus
									/>
								</PopoverContent>
							</Popover>
							<FormMessage />
						</FormItem>
					)}
				/>

				<Button type='submit' disabled={isPending} className='w-full'>
					{isPending ? 'Creating...' : 'Create Budget'}
				</Button>
			</form>
		</Form>
	);
}
