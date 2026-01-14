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
	const [showReview, setShowReview] = useState(false);
	const [formData, setFormData] = useState<CreateTransferInput | null>(null);

	const form = useForm<CreateTransferInput>({
		resolver: zodResolver(createTransferSchema),
		defaultValues: {
			amount: 0,
			fee: 0,
			description: '',
			date: new Date(),
			fromAccountId: '',
			toAccountId: '',
		},
	});

	// Watch values for cross-disabling
	const fromAccountId = form.watch('fromAccountId');
	const toAccountId = form.watch('toAccountId');

	// Step 1: Validate and open Review
	function onSubmit(data: CreateTransferInput) {
		setFormData(data);
		setShowReview(true);
	}

	// Step 2: Confirm and Execute
	async function onConfirm() {
		if (!formData) return;
		setIsPending(true);

		const payload = new FormData();
		payload.append('amount', formData.amount.toString());
		payload.append('fee', (formData.fee || 0).toString()); // Handle fee
		payload.append('description', formData.description || '');
		payload.append('date', formData.date.toISOString());
		payload.append('fromAccountId', formData.fromAccountId);
		payload.append('toAccountId', formData.toAccountId);

		const result = await createTransferAction(payload);
		setIsPending(false);
		setShowReview(false);

		if (result?.error) {
			console.error(result.error);
			// Ideally show toast error
		} else {
			form.reset({
				amount: 0,
				fee: 0,
				description: '',
				date: new Date(),
				fromAccountId: '',
				toAccountId: '',
			});
			setFormData(null);
			// Ideally show toast success
		}
	}

	const fromAccountName = accounts.find(
		(a) => a.id === formData?.fromAccountId
	)?.name;
	const toAccountName = accounts.find(
		(a) => a.id === formData?.toAccountId
	)?.name;

	return (
		<>
			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className='space-y-4'
				>
					{/* 1. From/To Accounts - First, so user can see balances */}
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
														account.id ===
														toAccountId
													}
													className='truncate'
												>
													<span className='truncate'>
														{account.name} (
														{formatCurrency(
															Number(
																account.balance
															)
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
														account.id ===
														fromAccountId
													}
													className='truncate'
												>
													<span className='truncate'>
														{account.name} (
														{formatCurrency(
															Number(
																account.balance
															)
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
					</div>

					{/* 2. Amount + Fee */}
					<div className='grid gap-4 md:grid-cols-2'>
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
							name='fee'
							render={({ field }) => (
								<FormItem>
									<FormLabel title='Optional transaction fee'>
										Transaction Fee{' '}
										<span className='text-muted-foreground font-normal'>
											(?)
										</span>
									</FormLabel>
									<FormControl>
										<CurrencyInput
											placeholder='0.00'
											value={field.value ?? 0}
											onChange={field.onChange}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					{/* 3. Date */}
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
											initialFocus
										/>
									</PopoverContent>
								</Popover>
								<FormMessage />
							</FormItem>
						)}
					/>

					{/* 4. Description - Optional, last */}
					<FormField
						control={form.control}
						name='description'
						render={({ field }) => (
							<FormItem>
								<FormLabel>Description (Optional)</FormLabel>
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

					<Button type='submit' className='w-full'>
						Review Transfer
					</Button>
				</form>
			</Form>

			{/* Review Dialog */}
			{showReview && formData && (
				<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
					<div className='w-full max-w-md rounded-lg bg-background p-6 shadow-lg space-y-4'>
						<div className='space-y-2'>
							<h3 className='text-lg font-semibold'>
								Confirm Transfer
							</h3>
							<p className='text-sm text-muted-foreground'>
								Please review the details below.
							</p>
						</div>

						<div className='space-y-3 rounded-md border p-4 text-sm'>
							<div className='flex justify-between'>
								<span className='text-muted-foreground'>
									From
								</span>
								<span className='font-medium'>
									{fromAccountName}
								</span>
							</div>
							<div className='flex justify-between'>
								<span className='text-muted-foreground'>
									To
								</span>
								<span className='font-medium'>
									{toAccountName}
								</span>
							</div>
							<div className='border-t my-2'></div>
							<div className='flex justify-between'>
								<span className='text-muted-foreground'>
									Transfer Amount
								</span>
								<span>
									{formatCurrency(Number(formData.amount))}
								</span>
							</div>
							<div className='flex justify-between text-yellow-600'>
								<span>Bank Fee</span>
								<span>
									+{formatCurrency(Number(formData.fee || 0))}
								</span>
							</div>
							<div className='border-t my-2'></div>
							<div className='flex justify-between font-bold'>
								<span>Total Debit</span>
								<span>
									{formatCurrency(
										Number(formData.amount) +
											Number(formData.fee || 0)
									)}
								</span>
							</div>
						</div>

						<div className='flex gap-3 justify-end'>
							<Button
								variant='outline'
								onClick={() => setShowReview(false)}
								disabled={isPending}
							>
								Cancel
							</Button>
							<Button onClick={onConfirm} disabled={isPending}>
								{isPending ? 'Processing...' : 'Confirm & Send'}
							</Button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
