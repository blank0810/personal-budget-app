'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	FormDescription,
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
import { Checkbox } from '@/components/ui/checkbox';
import {
	createAccountSchema,
	CreateAccountInput,
} from '@/server/modules/account/account.types';
import { createAccountAction } from '@/server/modules/account/account.controller';
import { useState, useEffect } from 'react';
import { AccountType } from '@prisma/client';

export function AccountForm() {
	const [isPending, setIsPending] = useState(false);

	const form = useForm<CreateAccountInput>({
		resolver: zodResolver(createAccountSchema),
		defaultValues: {
			name: '',
			type: AccountType.BANK,
			balance: 0,
			isLiability: false,
			creditLimit: null,
		},
	});

	const type = useWatch({
		control: form.control,
		name: 'type',
	});

	const isCreditOrLoan = type === 'CREDIT' || type === 'LOAN';
	const isCredit = type === 'CREDIT';

	// Auto-set isLiability for Credit/Loan
	useEffect(() => {
		if (isCreditOrLoan) {
			form.setValue('isLiability', true);
		}
	}, [isCreditOrLoan, form]);

	async function onSubmit(data: CreateAccountInput) {
		setIsPending(true);
		const formData = new FormData();
		// ... (rest is handled, just Ensure values are correct)
		formData.append('name', data.name);
		formData.append('type', data.type);
		formData.append('balance', data.balance.toString());

		// Force true if credit/loan, otherwise use form value
		if (isCreditOrLoan || data.isLiability) {
			formData.append('isLiability', 'on');
		}

		if (data.creditLimit) {
			formData.append('creditLimit', data.creditLimit.toString());
		}

		if (data.icon) formData.append('icon', data.icon);
		if (data.color) formData.append('color', data.color);

		const result = await createAccountAction(formData);
		setIsPending(false);

		if (result?.error) {
			console.error(result.error);
		} else {
			form.reset();
		}
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
				<FormField
					control={form.control}
					name='name'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Account Name</FormLabel>
							<FormControl>
								<Input
									placeholder='Chase Checking, Amex, etc.'
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name='type'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Type</FormLabel>
							<Select
								onValueChange={field.onChange}
								value={field.value}
							>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder='Select type' />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{Object.values(AccountType).map((type) => (
										<SelectItem key={type} value={type}>
											{type}
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
					name='balance'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Initial Balance</FormLabel>
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

				{isCredit && (
					<FormField
						control={form.control}
						name='creditLimit'
						render={({ field }) => (
							<FormItem>
								<FormLabel>Credit Limit</FormLabel>
								<FormControl>
									<CurrencyInput
										placeholder='0.00'
										value={field.value ?? undefined}
										onChange={field.onChange}
									/>
								</FormControl>
								<FormDescription>
									Set the credit limit to track utilization.
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}

				<FormField
					control={form.control}
					name='isLiability'
					render={({ field }) => (
						<FormItem className='flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4'>
							<FormControl>
								<Checkbox
									checked={field.value}
									onCheckedChange={field.onChange}
									disabled={isCreditOrLoan}
								/>
							</FormControl>
							<div className='space-y-1 leading-none'>
								<FormLabel>
									{isCreditOrLoan
										? 'Liability (Enforced)'
										: 'Treat as Liability'}
								</FormLabel>
								<p className='text-sm text-muted-foreground'>
									{isCreditOrLoan
										? 'Credit and Loan accounts are always liabilities.'
										: 'Enable this if this account represents debt (e.g. Credit Card, Loan)'}
								</p>
							</div>
						</FormItem>
					)}
				/>

				<Button type='submit' disabled={isPending}>
					{isPending ? 'Saving...' : 'Create Account'}
				</Button>
			</form>
		</Form>
	);
}
