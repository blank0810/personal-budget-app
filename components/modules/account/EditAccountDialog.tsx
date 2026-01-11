'use client';

import { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Checkbox } from '@/components/ui/checkbox';
import {
	updateAccountSchema,
	UpdateAccountInput,
} from '@/server/modules/account/account.types';
import { updateAccountAction } from '@/server/modules/account/account.controller';
import { Account, AccountType } from '@prisma/client';
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
import { formatCurrency } from '@/lib/formatters';

interface EditAccountDialogProps {
	account: Account;
}

export function EditAccountDialog({ account }: EditAccountDialogProps) {
	const [open, setOpen] = useState(false);
	const [isPending, setIsPending] = useState(false);

	const form = useForm<UpdateAccountInput>({
		resolver: zodResolver(updateAccountSchema),
		defaultValues: {
			id: account.id,
			name: account.name,
			type: account.type,
			balance: Number(account.balance), // Read-only but required by schema
			isLiability: account.isLiability,
			creditLimit: account.creditLimit
				? Number(account.creditLimit)
				: null,
			icon: account.icon,
			color: account.color,
			// Fund defaults
			targetAmount: account.targetAmount
				? Number(account.targetAmount)
				: null,
			fundCalculationMode: account.fundCalculationMode as 'MONTHS_COVERAGE' | 'TARGET_PROGRESS' | null,
			fundThresholdLow: account.fundThresholdLow ?? 2,
			fundThresholdMid: account.fundThresholdMid ?? 4,
			fundThresholdHigh: account.fundThresholdHigh ?? 6,
		},
	});

	const accountType = useWatch({
		control: form.control,
		name: 'type',
	});
	const fundCalculationMode = useWatch({
		control: form.control,
		name: 'fundCalculationMode',
	});
	const isCredit = accountType === 'CREDIT';
	const isCreditOrLoan = accountType === 'CREDIT' || accountType === 'LOAN';
	const isFund = accountType === 'EMERGENCY_FUND' || accountType === 'FUND';

	// Auto-set isLiability for Credit/Loan
	useEffect(() => {
		if (isCreditOrLoan) {
			form.setValue('isLiability', true);
		}
	}, [isCreditOrLoan, form]);

	async function onSubmit(data: UpdateAccountInput) {
		setIsPending(true);
		const formData = new FormData();
		Object.entries(data).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				formData.append(key, value.toString());
			}
		});

		// Force true if credit/loan, otherwise use form value
		if (isCreditOrLoan || data.isLiability) {
			formData.append('isLiability', 'on');
		}

		const result = await updateAccountAction(formData);
		setIsPending(false);

		if (result?.error) {
			console.error(result.error);
			// Show toast error
		} else {
			setOpen(false);
			// Show toast success
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant='outline' size='sm' className='gap-2'>
					<Settings2 className='h-4 w-4' />
					Edit Account
				</Button>
			</DialogTrigger>
			<DialogContent className='sm:max-w-[425px]'>
				<DialogHeader>
					<DialogTitle>Edit Account</DialogTitle>
					<DialogDescription>
						Update account details. Balance changes must be made via
						adjustment transactions.
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
									<FormLabel>Account Name</FormLabel>
									<FormControl>
										<Input
											placeholder='My Account'
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
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder='Select type' />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{Object.values(AccountType).map(
												(type) => (
													<SelectItem
														key={type}
														value={type}
													>
														{type}
													</SelectItem>
												)
											)}
										</SelectContent>
									</Select>
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
											Set the credit limit for utilization
											tracking.
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}

						{/* Fund-specific fields */}
						{isFund && (
							<>
								<FormField
									control={form.control}
									name='fundCalculationMode'
									render={({ field }) => (
										<FormItem>
											<FormLabel>Tracking Method</FormLabel>
											<Select
												onValueChange={field.onChange}
												value={field.value || 'MONTHS_COVERAGE'}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder='Select tracking method' />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value='MONTHS_COVERAGE'>
														Months of Coverage
													</SelectItem>
													<SelectItem value='TARGET_PROGRESS'>
														Target Amount
													</SelectItem>
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>

								{fundCalculationMode === 'TARGET_PROGRESS' && (
									<FormField
										control={form.control}
										name='targetAmount'
										render={({ field }) => (
											<FormItem>
												<FormLabel>Target Amount</FormLabel>
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
												<FormMessage />
											</FormItem>
										)}
									/>
								)}

								{fundCalculationMode === 'MONTHS_COVERAGE' && (
									<div className='space-y-3 p-3 border rounded-md'>
										<span className='text-sm font-medium'>
											Health Thresholds (Months)
										</span>
										<div className='grid grid-cols-3 gap-2'>
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
																		Number(e.target.value)
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
																		Number(e.target.value)
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
																		Number(e.target.value)
																	)
																}
															/>
														</FormControl>
													</FormItem>
												)}
											/>
										</div>
									</div>
								)}
							</>
						)}

						<FormField
							control={form.control}
							name='isLiability'
							render={({ field }) => (
								<FormItem className='flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3'>
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
										<FormDescription>
											{isCreditOrLoan
												? 'Credit and Loan accounts are always liabilities.'
												: 'Enable if this account represents debt.'}
										</FormDescription>
									</div>
								</FormItem>
							)}
						/>

						<div className='flex flex-col space-y-2 rounded-md bg-muted p-3'>
							<span className='text-sm font-medium text-muted-foreground'>
								{isCreditOrLoan
									? 'Current Owed Amount (Read Only)'
									: 'Current Balance (Read Only)'}
							</span>
							<span className='text-lg font-bold'>
								{formatCurrency(Number(account.balance))}
							</span>
							<span className='text-xs text-muted-foreground'>
								To change this, use the &quot;Adjust
								Balance&quot; feature.
							</span>
						</div>

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
