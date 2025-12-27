'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
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
import {
	createTransferSchema,
	CreateTransferInput,
} from '@/server/modules/transfer/transfer.types';
import { createTransferAction } from '@/server/modules/transfer/transfer.controller';
import { useState } from 'react';
import { Account } from '@prisma/client';

interface TransferFormProps {
	accounts: Account[];
}

export function TransferForm({ accounts }: TransferFormProps) {
	const [isPending, setIsPending] = useState(false);

	const form = useForm<CreateTransferInput>({
		resolver: zodResolver(createTransferSchema),
		defaultValues: {
			amount: 0,
			description: '',
			date: new Date(),
			fromAccountId: '',
			toAccountId: '',
		},
	});

	// Watch values for cross-disabling
	const fromAccountId = form.watch('fromAccountId');
	const toAccountId = form.watch('toAccountId');

	async function onSubmit(data: CreateTransferInput) {
		setIsPending(true);
		const formData = new FormData();
		formData.append('amount', data.amount.toString());
		formData.append('description', data.description || '');
		formData.append('date', data.date.toISOString());
		formData.append('fromAccountId', data.fromAccountId);
		formData.append('toAccountId', data.toAccountId);

		const result = await createTransferAction(formData);
		setIsPending(false);

		if (result?.error) {
			console.error(result.error);
			// Handle error
		} else {
			form.reset({
				amount: 0,
				description: '',
				date: new Date(),
				fromAccountId: '', // Reset to empty string
				toAccountId: '', // Reset to empty string
			});
			// Handle success
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

				<div className='grid gap-4 md:grid-cols-2'>
					<FormField
						control={form.control}
						name='fromAccountId'
						render={({ field }) => (
							<FormItem>
								<FormLabel>From Account</FormLabel>
								<Select
									onValueChange={field.onChange}
									value={field.value}
								>
									<FormControl>
										<SelectTrigger className='w-full overflow-hidden'>
											<span className='truncate'>
												<SelectValue placeholder='Select source' />
											</span>
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{accounts.map((account) => (
											<SelectItem
												key={account.id}
												value={account.id}
												disabled={
													account.id === toAccountId
												}
												className='truncate'
											>
												<span className='truncate'>
													{account.name} ($
													{Number(
														account.balance
													).toFixed(2)}
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
						name='toAccountId'
						render={({ field }) => (
							<FormItem>
								<FormLabel>To Account</FormLabel>
								<Select
									onValueChange={field.onChange}
									value={field.value}
								>
									<FormControl>
										<SelectTrigger className='w-full overflow-hidden'>
											<span className='truncate'>
												<SelectValue placeholder='Select destination' />
											</span>
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{accounts.map((account) => (
											<SelectItem
												key={account.id}
												value={account.id}
												disabled={
													account.id === fromAccountId
												}
												className='truncate'
											>
												<span className='truncate'>
													{account.name}
												</span>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<FormField
					control={form.control}
					name='description'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Description</FormLabel>
							<FormControl>
								<Input
									placeholder='Transfer details...'
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

				<Button type='submit' disabled={isPending}>
					{isPending ? 'Processing...' : 'Transfer Money'}
				</Button>
			</form>
		</Form>
	);
}
