'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { adjustBalanceSchema } from '@/server/modules/account/account.types';
import { adjustAccountBalanceAction } from '@/server/modules/account/account.controller';
import { Account } from '@prisma/client';
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
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	FormDescription,
} from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Calculator, AlertTriangle, CreditCard, Wallet } from 'lucide-react';
import { useCurrency } from '@/lib/contexts/currency-context';
import { cn } from '@/lib/utils';
import { z } from 'zod';

export interface AdjustBalanceCategoryOption {
	id: string;
	name: string;
}

export interface AdjustBalanceBudgetOption {
	id: string;
	name: string;
	categoryId: string;
	categoryName: string;
}

interface AdjustBalanceDialogProps {
	account: Account;
	incomeCategories: AdjustBalanceCategoryOption[];
	expenseCategories: AdjustBalanceCategoryOption[];
	budgets: AdjustBalanceBudgetOption[];
}

export function AdjustBalanceDialog({
	account,
	incomeCategories,
	expenseCategories,
	budgets,
}: AdjustBalanceDialogProps) {
	const { formatCurrency } = useCurrency();
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const [showCustomCategory, setShowCustomCategory] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const isLiability = account.isLiability;

	const form = useForm<z.infer<typeof adjustBalanceSchema>>({
		resolver: zodResolver(adjustBalanceSchema),
		defaultValues: {
			accountId: account.id,
			newBalance: Number(account.balance),
			description: '',
			categoryId: undefined,
			categoryName: '',
			budgetId: undefined,
		},
	});

	const newBalance = form.watch('newBalance');
	const currentBalance = Number(account.balance);
	const difference = newBalance - currentBalance;

	// For liabilities: increasing balance means MORE debt (bad), decreasing means LESS debt (good)
	// For assets: increasing balance means MORE money (good), decreasing means LESS money (bad)
	const postsAsIncome = isLiability ? difference < 0 : difference > 0;
	const isPositiveChange = postsAsIncome;
	const hasChange = Math.abs(difference) >= 0.01;
	const categories = postsAsIncome ? incomeCategories : expenseCategories;

	const selectedBudgetId = form.watch('budgetId');
	const hasSelectedBudget = Boolean(
		selectedBudgetId && selectedBudgetId !== '__none__'
	);

	useEffect(() => {
		form.setValue('categoryId', undefined);
		form.setValue('categoryName', '');
		form.setValue('budgetId', undefined);
		setShowCustomCategory(false);
	}, [form, postsAsIncome]);

	function resetForm(balance = Number(account.balance)) {
		form.reset({
			accountId: account.id,
			newBalance: balance,
			description: '',
			categoryId: undefined,
			categoryName: '',
			budgetId: undefined,
		});
		setShowCustomCategory(false);
		setSubmitError(null);
	}

	function handleOpenChange(nextOpen: boolean, balance?: number) {
		setOpen(nextOpen);
		if (!nextOpen) {
			resetForm(balance);
		}
	}

	// Adjustment labels based on account type
	const getAdjustmentLabel = () => {
		if (isLiability) {
			return difference > 0 ? 'Increased Debt' : 'Paid Off';
		} else {
			return difference > 0 ? 'Income' : 'Expense';
		}
	};

	function onSubmit(data: z.infer<typeof adjustBalanceSchema>) {
		setSubmitError(null);
		startTransition(async () => {
			const result = await adjustAccountBalanceAction({
				...data,
				budgetId:
					data.budgetId === '__none__' ? undefined : data.budgetId,
			});

			if (result?.error) {
				setSubmitError(result.error);
			} else {
				handleOpenChange(false, data.newBalance);
				router.refresh();
			}
		});
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button variant='outline' size='sm' className='gap-2'>
					<Calculator className='h-4 w-4' />
					{isLiability ? 'Adjust Debt' : 'Adjust Balance'}
				</Button>
			</DialogTrigger>
			<DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-[425px]'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2'>
						{isLiability ? (
							<>
								<CreditCard className='h-5 w-5 text-red-500' />
								Adjust Debt Amount
							</>
						) : (
							<>
								<Wallet className='h-5 w-5 text-green-500' />
								Adjust Balance
							</>
						)}
					</DialogTitle>
					<DialogDescription>
						{isLiability
							? 'Update how much you currently owe on this account. The system will create an adjustment transaction.'
							: 'Manually set the correct balance. The system will create an adjustment transaction to reconcile the difference.'}
					</DialogDescription>
				</DialogHeader>

				{/* Liability Context Alert */}
				{isLiability && (
					<Alert className='border-amber-500 bg-amber-50 dark:bg-amber-950/30'>
						<AlertTriangle className='h-4 w-4 text-amber-600' />
						<AlertDescription className='text-amber-600 dark:text-amber-300 text-sm'>
							Enter the total amount you currently OWE, not
							available credit.
						</AlertDescription>
					</Alert>
				)}

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className='space-y-4'
					>
						<FormField
							control={form.control}
							name='newBalance'
							render={({ field }) => (
								<FormItem>
									<FormLabel className='flex items-center gap-2'>
										{isLiability ? (
											<>
												<AlertTriangle className='h-4 w-4 text-red-500' />
												<span className='text-red-600 font-semibold'>
													Correct Debt Amount
												</span>
											</>
										) : (
											<>
												<Wallet className='h-4 w-4 text-green-500' />
												<span>Correct Balance</span>
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
											? 'How much do you currently owe on this account?'
											: 'What is the actual balance in this account?'}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name='description'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Description (optional)</FormLabel>
									<FormControl>
										<Input
											placeholder='Cash spent at the market'
											maxLength={120}
											{...field}
										/>
									</FormControl>
									<FormDescription>
										{'Leave blank and we\'ll label it "Manual Balance Adjustment".'}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						{hasChange && (
							<>
								<FormField
									control={form.control}
									name='categoryId'
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												Category (optional)
											</FormLabel>
											<Select
												disabled={hasSelectedBudget}
												onValueChange={(value) => {
													if (value === '__custom__') {
														field.onChange(undefined);
														form.setValue(
															'categoryName',
															''
														);
														setShowCustomCategory(true);
													} else {
														field.onChange(value);
														form.setValue(
															'categoryName',
															''
														);
														setShowCustomCategory(false);
													}
												}}
												value={
													showCustomCategory
														? '__custom__'
														: field.value || ''
												}
											>
												<FormControl>
													<SelectTrigger className='w-full'>
														<SelectValue placeholder='Select a category' />
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
														+ Create custom category
													</SelectItem>
												</SelectContent>
											</Select>
											<FormDescription>
												{'Defaults to "Initial Balance/Adjustment".'}
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>

								{showCustomCategory && !hasSelectedBudget && (
									<FormField
										control={form.control}
										name='categoryName'
										render={({ field }) => (
											<FormItem>
												<FormControl>
													<Input
														placeholder='New category name'
														maxLength={100}
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								)}

								{!postsAsIncome && (
									<FormField
										control={form.control}
										name='budgetId'
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													Count against a budget (optional)
												</FormLabel>
												<Select
													onValueChange={(value) => {
														field.onChange(value);
														if (value === '__none__') {
															return;
														}

														const budget = budgets.find(
															(item) => item.id === value
														);
														if (budget) {
															form.setValue(
																'categoryId',
																budget.categoryId
															);
															form.setValue(
																'categoryName',
																''
															);
															setShowCustomCategory(false);
														}
													}}
													value={field.value || '__none__'}
												>
													<FormControl>
														<SelectTrigger className='w-full'>
															<SelectValue />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														<SelectItem value='__none__'>
															No budget
														</SelectItem>
														{budgets.map((budget) => (
															<SelectItem
																key={budget.id}
																value={budget.id}
															>
																{budget.name}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<FormDescription>
													{'Links this adjustment to that envelope so its remaining amount reflects the real spend.'}
												</FormDescription>
												<FormMessage />
											</FormItem>
										)}
									/>
								)}
							</>
						)}

						{/* Adjustment Preview */}
						{hasChange && (
							<div className='flex flex-col space-y-2 rounded-md bg-muted p-3 border'>
								<div className='flex justify-between text-sm'>
									<span className='text-muted-foreground'>
										{isLiability
											? 'Current Debt:'
											: 'Current Balance:'}
									</span>
									<span
										className={
											isLiability ? 'text-red-600' : ''
										}
									>
										{formatCurrency(currentBalance)}
									</span>
								</div>
								<div className='flex justify-between text-sm font-medium'>
									<span>
										{isLiability
											? 'New Debt:'
											: 'New Balance:'}
									</span>
									<span
										className={
											isLiability ? 'text-red-600' : ''
										}
									>
										{formatCurrency(newBalance)}
									</span>
								</div>
								<div className='border-t my-1'></div>
								<div className='flex justify-between text-sm font-bold items-center'>
									<span>Adjustment:</span>
									<span
										className={cn(
											isPositiveChange
												? 'text-green-600'
												: 'text-red-600'
										)}
									>
										{difference > 0 ? '+' : '-'}
										{formatCurrency(Math.abs(difference))}
										<span className='ml-1 text-xs font-normal text-muted-foreground'>
											({getAdjustmentLabel()})
										</span>
									</span>
								</div>
							</div>
						)}

						{submitError && (
							<Alert variant='destructive'>
								<AlertTriangle className='h-4 w-4' />
								<AlertDescription>
									{submitError}
								</AlertDescription>
							</Alert>
						)}

						<DialogFooter>
							<Button
								type='submit'
								disabled={isPending || !hasChange}
							>
								{isPending
									? 'Adjusting...'
									: 'Confirm Adjustment'}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
