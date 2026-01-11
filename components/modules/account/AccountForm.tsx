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
	Shield,
	Target,
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
	EMERGENCY_FUND: { icon: Shield, label: 'Emergency Fund', category: 'fund' },
	FUND: { icon: Target, label: 'Savings Goal', category: 'fund' },
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
			// Fund defaults
			targetAmount: null,
			fundCalculationMode: null,
			fundThresholdLow: 2,
			fundThresholdMid: 4,
			fundThresholdHigh: 6,
		},
	});

	const type = useWatch({ control: form.control, name: 'type' });
	const balance = useWatch({ control: form.control, name: 'balance' });
	const creditLimit = useWatch({
		control: form.control,
		name: 'creditLimit',
	});

	const fundCalculationMode = useWatch({
		control: form.control,
		name: 'fundCalculationMode',
	});

	const isLiability = type === 'CREDIT' || type === 'LOAN';
	const isCredit = type === 'CREDIT';
	const isFund = type === 'EMERGENCY_FUND' || type === 'FUND';
	const isEmergencyFund = type === 'EMERGENCY_FUND';
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

	// Auto-set fundCalculationMode based on fund type
	useEffect(() => {
		if (isFund && !fundCalculationMode) {
			form.setValue(
				'fundCalculationMode',
				isEmergencyFund ? 'MONTHS_COVERAGE' : 'TARGET_PROGRESS'
			);
		}
	}, [isFund, isEmergencyFund, fundCalculationMode, form]);

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

		// Fund-specific fields
		if (isFund) {
			if (data.targetAmount) {
				formData.append('targetAmount', data.targetAmount.toString());
			}
			if (data.fundCalculationMode) {
				formData.append('fundCalculationMode', data.fundCalculationMode);
			}
			if (data.fundThresholdLow) {
				formData.append(
					'fundThresholdLow',
					data.fundThresholdLow.toString()
				);
			}
			if (data.fundThresholdMid) {
				formData.append(
					'fundThresholdMid',
					data.fundThresholdMid.toString()
				);
			}
			if (data.fundThresholdHigh) {
				formData.append(
					'fundThresholdHigh',
					data.fundThresholdHigh.toString()
				);
			}
		}

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
									<SelectGroup>
										<SelectLabel className='text-blue-600 font-semibold flex items-center gap-1'>
											<Shield className='h-4 w-4' />
											Fund Accounts
										</SelectLabel>
										<SelectItem value='EMERGENCY_FUND'>
											<span className='flex items-center gap-2'>
												<Shield className='h-4 w-4' />{' '}
												Emergency Fund
											</span>
										</SelectItem>
										<SelectItem value='FUND'>
											<span className='flex items-center gap-2'>
												<Target className='h-4 w-4' />{' '}
												Savings Goal
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

				{/* Fund Info Banner */}
				{isFund && (
					<Alert className='border-blue-500 bg-blue-50 dark:bg-blue-950/30'>
						<Shield className='h-4 w-4 text-blue-600' />
						<AlertTitle className='text-blue-700 dark:text-blue-400'>
							{isEmergencyFund ? 'Emergency Fund' : 'Savings Goal'}
						</AlertTitle>
						<AlertDescription className='text-blue-600 dark:text-blue-300'>
							{isEmergencyFund
								? 'This fund tracks your financial runway. It will be excluded from Net Worth and replace the Runway metric on your dashboard.'
								: 'Track progress toward a specific savings goal. This account is excluded from Net Worth calculations.'}
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

				{/* Fund-specific fields */}
				{isFund && (
					<>
						{/* Calculation Mode Selection */}
						<FormField
							control={form.control}
							name='fundCalculationMode'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Tracking Method</FormLabel>
									<Select
										onValueChange={field.onChange}
										value={
											field.value ||
											(isEmergencyFund
												? 'MONTHS_COVERAGE'
												: 'TARGET_PROGRESS')
										}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder='Select tracking method' />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value='MONTHS_COVERAGE'>
												Months of Coverage (based on
												budget)
											</SelectItem>
											<SelectItem value='TARGET_PROGRESS'>
												Target Amount (specific goal)
											</SelectItem>
										</SelectContent>
									</Select>
									<FormDescription>
										{fundCalculationMode === 'MONTHS_COVERAGE'
											? 'Progress measured by how many months of expenses this fund covers.'
											: 'Progress measured as percentage toward your goal amount.'}
									</FormDescription>
								</FormItem>
							)}
						/>

						{/* Target Amount (only for TARGET_PROGRESS mode) */}
						{fundCalculationMode === 'TARGET_PROGRESS' && (
							<FormField
								control={form.control}
								name='targetAmount'
								render={({ field }) => (
									<FormItem>
										<FormLabel className='flex items-center gap-2'>
											<Target className='h-4 w-4 text-blue-500' />
											Target Amount
										</FormLabel>
										<FormControl>
											<CurrencyInput
												placeholder='10000.00'
												value={field.value ?? undefined}
												onChange={field.onChange}
											/>
										</FormControl>
										<FormDescription>
											Your savings goal for this fund
										</FormDescription>
									</FormItem>
								)}
							/>
						)}

						{/* Health Thresholds (for MONTHS_COVERAGE mode) */}
						{fundCalculationMode === 'MONTHS_COVERAGE' && (
							<div className='space-y-4 p-4 border rounded-lg bg-muted/30'>
								<h4 className='text-sm font-medium'>
									Health Thresholds (Months)
								</h4>
								<div className='grid grid-cols-3 gap-4'>
									<FormField
										control={form.control}
										name='fundThresholdLow'
										render={({ field }) => (
											<FormItem>
												<FormLabel className='text-xs text-red-600'>
													Critical
												</FormLabel>
												<FormControl>
													<Input
														type='number'
														min={1}
														{...field}
														value={field.value ?? 2}
														onChange={(e) =>
															field.onChange(
																Number(
																	e.target.value
																)
															)
														}
													/>
												</FormControl>
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name='fundThresholdMid'
										render={({ field }) => (
											<FormItem>
												<FormLabel className='text-xs text-yellow-600'>
													Underfunded
												</FormLabel>
												<FormControl>
													<Input
														type='number'
														min={1}
														{...field}
														value={field.value ?? 4}
														onChange={(e) =>
															field.onChange(
																Number(
																	e.target.value
																)
															)
														}
													/>
												</FormControl>
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name='fundThresholdHigh'
										render={({ field }) => (
											<FormItem>
												<FormLabel className='text-xs text-green-600'>
													Funded
												</FormLabel>
												<FormControl>
													<Input
														type='number'
														min={1}
														{...field}
														value={field.value ?? 6}
														onChange={(e) =>
															field.onChange(
																Number(
																	e.target.value
																)
															)
														}
													/>
												</FormControl>
											</FormItem>
										)}
									/>
								</div>
								<p className='text-xs text-muted-foreground'>
									Below{' '}
									{form.watch('fundThresholdLow') || 2}mo =
									Critical,{' '}
									{form.watch('fundThresholdLow') || 2}-
									{form.watch('fundThresholdMid') || 4}mo =
									Underfunded,{' '}
									{form.watch('fundThresholdMid') || 4}-
									{form.watch('fundThresholdHigh') || 6}mo =
									Building,{' '}
									{form.watch('fundThresholdHigh') || 6}+ mo =
									Funded
								</p>
							</div>
						)}
					</>
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
