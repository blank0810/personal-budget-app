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
	SelectGroup,
	SelectLabel,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
	createAccountSchema,
	CreateAccountInput,
} from '@/server/modules/account/account.types';
import { createAccountAction } from '@/server/modules/account/account.controller';
import { useState, useEffect } from 'react';
import { AccountType } from '@prisma/client';
import {
	Landmark,
	Wallet,
	PiggyBank,
	TrendingUp,
	CreditCard,
	FileText,
	AlertTriangle,
	CheckCircle2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

// Account type metadata for better UX
const ACCOUNT_TYPE_META = {
	BANK: { icon: Landmark, label: 'Bank Account', category: 'asset' },
	CASH: { icon: Wallet, label: 'Cash', category: 'asset' },
	SAVINGS: { icon: PiggyBank, label: 'Savings', category: 'asset' },
	INVESTMENT: { icon: TrendingUp, label: 'Investment', category: 'asset' },
	CREDIT: { icon: CreditCard, label: 'Credit Card', category: 'liability' },
	LOAN: { icon: FileText, label: 'Loan', category: 'liability' },
} as const;

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

	const type = useWatch({ control: form.control, name: 'type' });
	const balance = useWatch({ control: form.control, name: 'balance' });
	const creditLimit = useWatch({
		control: form.control,
		name: 'creditLimit',
	});

	const isLiability = type === 'CREDIT' || type === 'LOAN';
	const isCredit = type === 'CREDIT';
	const typeMeta = ACCOUNT_TYPE_META[type as keyof typeof ACCOUNT_TYPE_META];

	// Calculate credit card metrics
	const amountOwed = Number(balance) || 0;
	const limit = Number(creditLimit) || 0;
	const availableCredit = limit > 0 ? limit - amountOwed : 0;
	const utilization = limit > 0 ? (amountOwed / limit) * 100 : 0;

	// Auto-set isLiability for Credit/Loan
	useEffect(() => {
		if (isLiability) {
			form.setValue('isLiability', true);
		} else {
			form.setValue('isLiability', false);
		}
	}, [isLiability, form]);

	async function onSubmit(data: CreateAccountInput) {
		setIsPending(true);
		const formData = new FormData();
		formData.append('name', data.name);
		formData.append('type', data.type);
		formData.append('balance', data.balance.toString());

		// Auto-determine liability from type
		if (isLiability) {
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

	// Get utilization status
	const getUtilizationStatus = () => {
		if (utilization < 30)
			return {
				color: 'text-green-600',
				bg: 'bg-green-500',
				label: 'Excellent',
			};
		if (utilization < 50)
			return {
				color: 'text-yellow-600',
				bg: 'bg-yellow-500',
				label: 'Good',
			};
		if (utilization < 70)
			return {
				color: 'text-orange-600',
				bg: 'bg-orange-500',
				label: 'Fair',
			};
		return { color: 'text-red-600', bg: 'bg-red-500', label: 'High' };
	};

	const utilizationStatus = getUtilizationStatus();

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-5'>
				{/* Account Name */}
				<FormField
					control={form.control}
					name='name'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Account Name</FormLabel>
							<FormControl>
								<Input
									placeholder={
										isLiability
											? 'Chase Sapphire, Car Loan, etc.'
											: 'Chase Checking, Cash Wallet, etc.'
									}
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Account Type with Grouped Options */}
				<FormField
					control={form.control}
					name='type'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Account Type</FormLabel>
							<Select
								onValueChange={field.onChange}
								value={field.value}
							>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder='Select account type'>
											{field.value && (
												<span className='flex items-center gap-2'>
													{typeMeta && (
														<typeMeta.icon className='h-4 w-4' />
													)}
													{typeMeta?.label ||
														field.value}
												</span>
											)}
										</SelectValue>
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									<SelectGroup>
										<SelectLabel className='text-green-600 font-semibold flex items-center gap-1'>
											<Wallet className='h-4 w-4' />
											Asset Accounts
										</SelectLabel>
										<SelectItem value='BANK'>
											<span className='flex items-center gap-2'>
												<Landmark className='h-4 w-4' />{' '}
												Bank Account
											</span>
										</SelectItem>
										<SelectItem value='CASH'>
											<span className='flex items-center gap-2'>
												<Wallet className='h-4 w-4' />{' '}
												Cash
											</span>
										</SelectItem>
										<SelectItem value='SAVINGS'>
											<span className='flex items-center gap-2'>
												<PiggyBank className='h-4 w-4' />{' '}
												Savings
											</span>
										</SelectItem>
										<SelectItem value='INVESTMENT'>
											<span className='flex items-center gap-2'>
												<TrendingUp className='h-4 w-4' />{' '}
												Investment
											</span>
										</SelectItem>
									</SelectGroup>
									<SelectGroup>
										<SelectLabel className='text-red-600 font-semibold'>
											💳 Liability Accounts
										</SelectLabel>
										<SelectItem value='CREDIT'>
											<span className='flex items-center gap-2'>
												<CreditCard className='h-4 w-4' />{' '}
												Credit Card
											</span>
										</SelectItem>
										<SelectItem value='LOAN'>
											<span className='flex items-center gap-2'>
												<FileText className='h-4 w-4' />{' '}
												Loan
											</span>
										</SelectItem>
									</SelectGroup>
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Liability Warning Banner */}
				{isLiability && (
					<Alert
						variant='destructive'
						className='border-amber-500 bg-amber-50 dark:bg-amber-950/30'
					>
						<AlertTriangle className='h-4 w-4 text-amber-600' />
						<AlertTitle className='text-amber-700 dark:text-amber-400'>
							Liability Account
						</AlertTitle>
						<AlertDescription className='text-amber-600 dark:text-amber-300'>
							{isCredit
								? 'Enter the amount you currently OWE on this card, NOT your available credit.'
								: 'Enter the remaining balance you still OWE on this loan.'}
						</AlertDescription>
					</Alert>
				)}

				{/* Credit Limit (for Credit Cards) */}
				{isCredit && (
					<FormField
						control={form.control}
						name='creditLimit'
						render={({ field }) => (
							<FormItem>
								<FormLabel className='flex items-center gap-2'>
									<CreditCard className='h-4 w-4 text-muted-foreground' />
									Credit Limit
								</FormLabel>
								<FormControl>
									<CurrencyInput
										placeholder='0.00'
										value={field.value ?? undefined}
										onChange={field.onChange}
									/>
								</FormControl>
								<FormDescription>
									Your total credit line (maximum you can
									borrow)
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}

				{/* Balance / Amount Owed Field */}
				<FormField
					control={form.control}
					name='balance'
					render={({ field }) => (
						<FormItem>
							<FormLabel className='flex items-center gap-2'>
								{isLiability ? (
									<>
										<AlertTriangle className='h-4 w-4 text-red-500' />
										<span className='text-red-600 font-semibold'>
											Amount You Owe (Debt)
										</span>
									</>
								) : (
									<>
										<CheckCircle2 className='h-4 w-4 text-green-500' />
										<span>Current Balance</span>
									</>
								)}
							</FormLabel>
							<FormControl>
								<CurrencyInput
									placeholder='0.00'
									value={field.value}
									onChange={field.onChange}
								/>
							</FormControl>
							<FormDescription>
								{isLiability
									? 'How much do you currently owe? This will be counted as debt.'
									: 'How much money is currently in this account?'}
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Credit Card Summary Preview */}
				{isCredit && limit > 0 && (
					<div className='rounded-lg border bg-card p-4 space-y-3'>
						<h4 className='text-sm font-semibold flex items-center gap-2'>
							<CreditCard className='h-4 w-4' />
							Credit Card Summary
						</h4>

						<div className='grid grid-cols-2 gap-3 text-sm'>
							<div>
								<p className='text-muted-foreground'>
									Credit Limit
								</p>
								<p className='font-medium'>
									{formatCurrency(limit)}
								</p>
							</div>
							<div>
								<p className='text-muted-foreground'>
									Amount Owed
								</p>
								<p className='font-medium text-red-600'>
									{formatCurrency(amountOwed)}
								</p>
							</div>
							<div>
								<p className='text-muted-foreground'>
									Available Credit
								</p>
								<p className='font-medium text-green-600'>
									{formatCurrency(availableCredit)}
								</p>
							</div>
							<div>
								<p className='text-muted-foreground'>
									Utilization
								</p>
								<p
									className={`font-medium ${utilizationStatus.color}`}
								>
									{utilization.toFixed(1)}% (
									{utilizationStatus.label})
								</p>
							</div>
						</div>

						<div className='space-y-1'>
							<div className='flex justify-between text-xs text-muted-foreground'>
								<span>0%</span>
								<span>30%</span>
								<span>100%</span>
							</div>
							<Progress
								value={Math.min(utilization, 100)}
								className='h-2'
							/>
							<p className='text-xs text-muted-foreground text-center'>
								{utilization < 30
									? '✓ Excellent! Keep utilization under 30% for best credit score.'
									: utilization < 50
									? 'Good, but try to keep under 30% when possible.'
									: 'Consider paying down this balance to improve credit score.'}
							</p>
						</div>
					</div>
				)}

				{/* Submit Button with Context */}
				<Button type='submit' disabled={isPending} className='w-full'>
					{isPending
						? 'Creating...'
						: isLiability
						? `Add ${isCredit ? 'Credit Card' : 'Loan'} Account`
						: `Add ${typeMeta?.label || 'Account'}`}
				</Button>
			</form>
		</Form>
	);
}
