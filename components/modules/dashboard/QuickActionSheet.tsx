'use client';

import React, { createContext, useContext, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { useCurrency } from '@/lib/contexts/currency-context';

import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
	SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
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
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';

import {
	createIncomeSchema,
	type CreateIncomeInput,
} from '@/server/modules/income/income.types';
import {
	createExpenseSchema,
	type CreateExpenseInput,
} from '@/server/modules/expense/expense.types';
import {
	createTransferSchema,
	type CreateTransferInput,
} from '@/server/modules/transfer/transfer.types';
import {
	createPaymentSchema,
	type CreatePaymentInput,
} from '@/server/modules/payment/payment.types';

import { createIncomeAction } from '@/server/modules/income/income.controller';
import { createExpenseAction } from '@/server/modules/expense/expense.controller';
import { createTransferAction } from '@/server/modules/transfer/transfer.controller';
import { createPaymentAction } from '@/server/modules/payment/payment.controller';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QuickAction = 'income' | 'expense' | 'transfer' | 'payment';

interface AccountOption {
	id: string;
	name: string;
	type: string;
	balance: number;
	isLiability: boolean;
}

interface CategoryOption {
	id: string;
	name: string;
}

interface BudgetOption {
	id: string;
	name: string;
	categoryId: string;
	categoryName: string;
}

export interface QuickActionSheetProps {
	accounts: AccountOption[];
	incomeCategories: CategoryOption[];
	expenseCategories: CategoryOption[];
	budgets: BudgetOption[];
	children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface QuickActionContextValue {
	openSheet: (action: QuickAction) => void;
}

const QuickActionContext = createContext<QuickActionContextValue | null>(null);

export function useQuickAction() {
	const ctx = useContext(QuickActionContext);
	if (!ctx) {
		throw new Error('useQuickAction must be used inside QuickActionProvider');
	}
	return ctx;
}

// ---------------------------------------------------------------------------
// Individual form components
// ---------------------------------------------------------------------------

function DatePickerField({
	value,
	onChange,
}: {
	value: Date;
	onChange: (date: Date) => void;
}) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					type='button'
					variant='outline'
					className={cn('w-full pl-3 text-left font-normal')}
				>
					<span suppressHydrationWarning>{format(value, 'PPP')}</span>
					<CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
				</Button>
			</PopoverTrigger>
			<PopoverContent className='w-auto p-0' align='start'>
				<Calendar
					mode='single'
					selected={value}
					onSelect={(date) => date && onChange(date)}
					disabled={(date) =>
						date > new Date() || date < new Date('1900-01-01')
					}
					initialFocus
				/>
			</PopoverContent>
		</Popover>
	);
}

// ---------------------------------------------------------------------------
// Income quick form
// ---------------------------------------------------------------------------

function IncomeQuickForm({
	accounts,
	categories,
	onClose,
}: {
	accounts: AccountOption[];
	categories: CategoryOption[];
	onClose: () => void;
}) {
	const router = useRouter();
	const { formatCurrency } = useCurrency();
	const [isPending, startTransition] = useTransition();
	const [showCustomCategory, setShowCustomCategory] = useState(false);

	const form = useForm({
		resolver: zodResolver(createIncomeSchema),
		defaultValues: {
			amount: undefined,
			description: '',
			date: new Date(),
			categoryId: undefined,
			categoryName: '',
			accountId: accounts.length === 1 ? accounts[0].id : undefined,
			isRecurring: false,
			titheEnabled: true,
			tithePercentage: 10,
			emergencyFundEnabled: false,
			emergencyFundPercentage: 10,
		},
	});

	function onSubmit(data: CreateIncomeInput) {
		startTransition(async () => {
			const result = await createIncomeAction(data);
			if (result?.error) {
				toast.error(result.error);
			} else {
				toast.success('Income added');
				onClose();
				router.refresh();
			}
		});
	}

	const assetAccounts = accounts.filter((a) => !a.isLiability);

	return (
		<Form {...form}>
			<form
				id='quick-income-form'
				onSubmit={form.handleSubmit(onSubmit)}
				className='flex flex-col gap-4 px-4'
			>
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
					name='description'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Description</FormLabel>
							<FormControl>
								<Input placeholder='Paycheck, Freelance, etc.' {...field} />
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
								onValueChange={(val) => {
									if (val === '__custom__') {
										field.onChange(undefined);
										form.setValue('categoryName', '');
										setShowCustomCategory(true);
									} else {
										field.onChange(val);
										form.setValue('categoryName', '');
										setShowCustomCategory(false);
									}
								}}
								value={showCustomCategory ? '__custom__' : (field.value || '')}
							>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder='Select a category' />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{categories.map((cat) => (
										<SelectItem key={cat.id} value={cat.id}>
											{cat.name}
										</SelectItem>
									))}
									<SelectItem value='__custom__'>+ Create custom category</SelectItem>
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>

				{showCustomCategory && (
					<FormField
						control={form.control}
						name='categoryName'
						render={({ field }) => (
							<FormItem>
								<FormControl>
									<Input placeholder='New category name' {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}

				<FormField
					control={form.control}
					name='accountId'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Account</FormLabel>
							<Select
								onValueChange={field.onChange}
								value={field.value || ''}
							>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder='Select an account' />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{assetAccounts.map((account) => (
										<SelectItem key={account.id} value={account.id}>
											{account.name}{' '}
											<span className='text-muted-foreground'>
												({formatCurrency(account.balance, { decimals: 0 })})
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
					name='date'
					render={({ field }) => (
						<FormItem className='flex flex-col'>
							<FormLabel>Date</FormLabel>
							<FormControl>
								<DatePickerField
									value={field.value}
									onChange={field.onChange}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Tithe toggle */}
				<FormField
					control={form.control}
					name='titheEnabled'
					render={({ field }) => (
						<FormItem className='flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3'>
							<FormControl>
								<Checkbox
									checked={field.value}
									onCheckedChange={field.onChange}
								/>
							</FormControl>
							<div className='space-y-0.5 leading-none'>
								<FormLabel className='text-sm'>Deduct Church Tithe</FormLabel>
								<p className='text-xs text-muted-foreground'>
									Auto-transfer to Tithes account
								</p>
							</div>
						</FormItem>
					)}
				/>

				{form.watch('titheEnabled') && (
					<FormField
						control={form.control}
						name='tithePercentage'
						render={({ field }) => (
							<FormItem>
								<FormLabel>Tithe Percentage (%)</FormLabel>
								<FormControl>
									<CurrencyInput
										value={field.value}
										onChange={field.onChange}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}

				{/* Emergency Fund toggle */}
				<FormField
					control={form.control}
					name='emergencyFundEnabled'
					render={({ field }) => (
						<FormItem className='flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3'>
							<FormControl>
								<Checkbox
									checked={field.value}
									onCheckedChange={field.onChange}
								/>
							</FormControl>
							<div className='space-y-0.5 leading-none'>
								<FormLabel className='text-sm'>Emergency Fund Contribution</FormLabel>
								<p className='text-xs text-muted-foreground'>
									Auto-transfer to Emergency Fund
								</p>
							</div>
						</FormItem>
					)}
				/>

				{form.watch('emergencyFundEnabled') && (
					<FormField
						control={form.control}
						name='emergencyFundPercentage'
						render={({ field }) => (
							<FormItem>
								<FormLabel>Emergency Fund Percentage (%)</FormLabel>
								<FormControl>
									<CurrencyInput
										value={field.value}
										onChange={field.onChange}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}
			</form>

			<SheetFooter className='px-4'>
				<Button type='button' variant='outline' onClick={onClose}>
					Cancel
				</Button>
				<Button
					type='submit'
					form='quick-income-form'
					disabled={isPending}
				>
					{isPending ? (
						<>
							<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							Saving...
						</>
					) : (
						'Add Income'
					)}
				</Button>
			</SheetFooter>
		</Form>
	);
}

// ---------------------------------------------------------------------------
// Expense quick form
// ---------------------------------------------------------------------------

function ExpenseQuickForm({
	accounts,
	categories,
	budgets,
	onClose,
}: {
	accounts: AccountOption[];
	categories: CategoryOption[];
	budgets: BudgetOption[];
	onClose: () => void;
}) {
	const router = useRouter();
	const { formatCurrency } = useCurrency();
	const [isPending, startTransition] = useTransition();
	const [showCustomCategory, setShowCustomCategory] = useState(false);
	const [categoryLocked, setCategoryLocked] = useState(false);

	// Sort: spending accounts first
	const sortedAccounts = [...accounts]
		.filter((a) => !a.isLiability)
		.sort((a, b) => {
			const isASpending = ['BANK', 'CASH', 'CREDIT'].includes(a.type);
			const isBSpending = ['BANK', 'CASH', 'CREDIT'].includes(b.type);
			if (isASpending && !isBSpending) return -1;
			if (!isASpending && isBSpending) return 1;
			return a.name.localeCompare(b.name);
		});

	const form = useForm({
		resolver: zodResolver(createExpenseSchema),
		defaultValues: {
			amount: undefined,
			description: '',
			date: new Date(),
			categoryId: undefined,
			categoryName: '',
			accountId: undefined,
			budgetId: undefined,
			notes: undefined,
			isRecurring: false,
		},
	});

	function onSubmit(data: CreateExpenseInput) {
		startTransition(async () => {
			const result = await createExpenseAction(data);
			if (result?.error) {
				toast.error(result.error);
			} else {
				toast.success('Expense added');
				onClose();
				router.refresh();
			}
		});
	}

	return (
		<Form {...form}>
			<form
				id='quick-expense-form'
				onSubmit={form.handleSubmit(onSubmit)}
				className='flex flex-col gap-4 px-4'
			>
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
					name='description'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Description</FormLabel>
							<FormControl>
								<Input placeholder='Groceries, Rent, etc.' {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{budgets.length > 0 && (
					<FormField
						control={form.control}
						name='budgetId'
						render={({ field }) => (
							<FormItem>
								<FormLabel>Budget (Optional)</FormLabel>
								<Select
									onValueChange={(val) => {
										if (val === '__none__') {
											field.onChange(undefined);
											setCategoryLocked(false);
										} else {
											field.onChange(val);
											const budget = budgets.find((b) => b.id === val);
											if (budget) {
												form.setValue('categoryId', budget.categoryId);
												form.setValue('categoryName', '');
												setShowCustomCategory(false);
											}
											setCategoryLocked(true);
										}
									}}
									value={field.value || ''}
								>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder='Select a budget' />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										<SelectItem value='__none__'>None</SelectItem>
										{budgets.map((b) => (
											<SelectItem key={b.id} value={b.id}>
												{b.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}

				<FormField
					control={form.control}
					name='categoryId'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Category</FormLabel>
							<Select
								disabled={categoryLocked}
								onValueChange={(val) => {
									if (val === '__custom__') {
										field.onChange(undefined);
										form.setValue('categoryName', '');
										setShowCustomCategory(true);
									} else {
										field.onChange(val);
										form.setValue('categoryName', '');
										setShowCustomCategory(false);
									}
								}}
								value={showCustomCategory ? '__custom__' : (field.value || '')}
							>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder={categoryLocked ? categories.find((c) => c.id === field.value)?.name ?? 'Select a category' : 'Select a category'} />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{categories.map((cat) => (
										<SelectItem key={cat.id} value={cat.id}>
											{cat.name}
										</SelectItem>
									))}
									{!categoryLocked && (
										<SelectItem value='__custom__'>+ Create custom category</SelectItem>
									)}
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>

				{showCustomCategory && !categoryLocked && (
					<FormField
						control={form.control}
						name='categoryName'
						render={({ field }) => (
							<FormItem>
								<FormControl>
									<Input placeholder='New category name' {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}

				<FormField
					control={form.control}
					name='accountId'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Account</FormLabel>
							<Select
								onValueChange={field.onChange}
								value={field.value || ''}
							>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder='Select an account' />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{sortedAccounts.map((account) => (
										<SelectItem key={account.id} value={account.id}>
											{account.name}{' '}
											<span className='text-muted-foreground'>
												({formatCurrency(account.balance, { decimals: 0 })})
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
					name='date'
					render={({ field }) => (
						<FormItem className='flex flex-col'>
							<FormLabel>Date</FormLabel>
							<FormControl>
								<DatePickerField
									value={field.value}
									onChange={field.onChange}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			</form>

			<SheetFooter className='px-4'>
				<Button type='button' variant='outline' onClick={onClose}>
					Cancel
				</Button>
				<Button
					type='submit'
					form='quick-expense-form'
					disabled={isPending}
				>
					{isPending ? (
						<>
							<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							Saving...
						</>
					) : (
						'Add Expense'
					)}
				</Button>
			</SheetFooter>
		</Form>
	);
}

// ---------------------------------------------------------------------------
// Transfer quick form
// ---------------------------------------------------------------------------

function TransferQuickForm({
	accounts,
	onClose,
}: {
	accounts: AccountOption[];
	onClose: () => void;
}) {
	const router = useRouter();
	const { formatCurrency } = useCurrency();
	const [isPending, startTransition] = useTransition();

	const form = useForm({
		resolver: zodResolver(createTransferSchema),
		defaultValues: {
			amount: undefined,
			fee: undefined,
			date: new Date(),
			fromAccountId: '',
			toAccountId: '',
			description: '',
		},
	});

	// eslint-disable-next-line react-hooks/incompatible-library
	const fromAccountId = form.watch('fromAccountId');
	// eslint-disable-next-line react-hooks/incompatible-library
	const toAccountId = form.watch('toAccountId');

	function onSubmit(data: CreateTransferInput) {
		startTransition(async () => {
			const result = await createTransferAction(data);
			if (result?.error) {
				toast.error(result.error);
			} else {
				toast.success('Transfer completed');
				onClose();
				router.refresh();
			}
		});
	}

	return (
		<Form {...form}>
			<form
				id='quick-transfer-form'
				onSubmit={form.handleSubmit(onSubmit)}
				className='flex flex-col gap-4 px-4'
			>
				<FormField
					control={form.control}
					name='fromAccountId'
					render={({ field }) => (
						<FormItem>
							<FormLabel>From Account</FormLabel>
							<Select
								onValueChange={field.onChange}
								value={field.value || ''}
							>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder='Select source account' />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{accounts.map((account) => (
										<SelectItem
											key={account.id}
											value={account.id}
											disabled={account.id === toAccountId}
										>
											{account.name}{' '}
											<span className='text-muted-foreground'>
												({formatCurrency(account.balance, { decimals: 0 })})
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
								value={field.value || ''}
							>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder='Select destination account' />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{accounts.map((account) => (
										<SelectItem
											key={account.id}
											value={account.id}
											disabled={account.id === fromAccountId}
										>
											{account.name}{' '}
											<span className='text-muted-foreground'>
												({formatCurrency(account.balance, { decimals: 0 })})
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
					name='date'
					render={({ field }) => (
						<FormItem className='flex flex-col'>
							<FormLabel>Date</FormLabel>
							<FormControl>
								<DatePickerField
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
							<FormLabel>Transaction Fee (optional)</FormLabel>
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
			</form>

			<SheetFooter className='px-4'>
				<Button type='button' variant='outline' onClick={onClose}>
					Cancel
				</Button>
				<Button
					type='submit'
					form='quick-transfer-form'
					disabled={isPending}
				>
					{isPending ? (
						<>
							<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							Processing...
						</>
					) : (
						'Initiate Transfer'
					)}
				</Button>
			</SheetFooter>
		</Form>
	);
}

// ---------------------------------------------------------------------------
// Payment quick form
// ---------------------------------------------------------------------------

function PaymentQuickForm({
	accounts,
	onClose,
}: {
	accounts: AccountOption[];
	onClose: () => void;
}) {
	const router = useRouter();
	const { formatCurrency } = useCurrency();
	const [isPending, startTransition] = useTransition();

	const assetAccounts = accounts.filter((a) => !a.isLiability);
	const liabilityAccounts = accounts.filter((a) => a.isLiability);

	const form = useForm({
		resolver: zodResolver(createPaymentSchema),
		defaultValues: {
			amount: undefined,
			fee: undefined,
			date: new Date(),
			fromAccountId: '',
			toLiabilityId: '',
			description: '',
		},
	});

	function onSubmit(data: CreatePaymentInput) {
		startTransition(async () => {
			const result = await createPaymentAction(data);
			if (result?.error) {
				toast.error(result.error);
			} else {
				toast.success('Payment completed');
				onClose();
				router.refresh();
			}
		});
	}

	if (liabilityAccounts.length === 0) {
		return (
			<>
				<div className='flex flex-1 flex-col items-center justify-center gap-2 px-4 py-12 text-center text-sm text-muted-foreground'>
					<p>No liability accounts found.</p>
					<p className='text-xs'>
						Add a credit card or loan to make payments.
					</p>
				</div>
				<SheetFooter className='px-4'>
					<Button type='button' variant='outline' onClick={onClose}>
						Cancel
					</Button>
				</SheetFooter>
			</>
		);
	}

	return (
		<Form {...form}>
			<form
				id='quick-payment-form'
				onSubmit={form.handleSubmit(onSubmit)}
				className='flex flex-col gap-4 px-4'
			>
				<FormField
					control={form.control}
					name='fromAccountId'
					render={({ field }) => (
						<FormItem>
							<FormLabel>From Account</FormLabel>
							<Select
								onValueChange={field.onChange}
								value={field.value || ''}
							>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder='Select source account' />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{assetAccounts.map((account) => (
										<SelectItem key={account.id} value={account.id}>
											{account.name}{' '}
											<span className='text-muted-foreground'>
												({formatCurrency(account.balance, { decimals: 0 })})
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
					name='toLiabilityId'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Pay Off</FormLabel>
							<Select
								onValueChange={field.onChange}
								value={field.value || ''}
							>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder='Select liability to pay' />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{liabilityAccounts.map((account) => (
										<SelectItem key={account.id} value={account.id}>
											{account.name}{' '}
											<span className='text-muted-foreground'>
												({formatCurrency(account.balance, { decimals: 0 })} owed)
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
					name='date'
					render={({ field }) => (
						<FormItem className='flex flex-col'>
							<FormLabel>Date</FormLabel>
							<FormControl>
								<DatePickerField
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
							<FormLabel>Transaction Fee (optional)</FormLabel>
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
			</form>

			<SheetFooter className='px-4'>
				<Button type='button' variant='outline' onClick={onClose}>
					Cancel
				</Button>
				<Button
					type='submit'
					form='quick-payment-form'
					disabled={isPending}
				>
					{isPending ? (
						<>
							<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							Processing...
						</>
					) : (
						'Make Payment'
					)}
				</Button>
			</SheetFooter>
		</Form>
	);
}

// ---------------------------------------------------------------------------
// Sheet metadata
// ---------------------------------------------------------------------------

const SHEET_META: Record<
	QuickAction,
	{ title: string; description: string }
> = {
	income: {
		title: 'Add Income',
		description: 'Record a new income transaction.',
	},
	expense: {
		title: 'Add Expense',
		description: 'Record a new expense transaction.',
	},
	transfer: {
		title: 'Quick Transfer',
		description: 'Move funds between your accounts.',
	},
	payment: {
		title: 'Make a Payment',
		description: 'Pay down a liability from an asset account.',
	},
};

// ---------------------------------------------------------------------------
// Provider + Sheet renderer
// ---------------------------------------------------------------------------

export function QuickActionProvider({
	accounts,
	incomeCategories,
	expenseCategories,
	budgets,
	children,
}: QuickActionSheetProps) {
	const [activeSheet, setActiveSheet] = useState<QuickAction | null>(null);

	function openSheet(action: QuickAction) {
		setActiveSheet(action);
	}

	function closeSheet() {
		setActiveSheet(null);
	}

	const meta = activeSheet ? SHEET_META[activeSheet] : null;

	return (
		<QuickActionContext.Provider value={{ openSheet }}>
			{children}

			<Sheet open={activeSheet !== null} onOpenChange={(open) => !open && closeSheet()}>
				<SheetContent side='right' className='w-full sm:max-w-md flex flex-col gap-0 p-0'>
					{meta && (
						<SheetHeader className='border-b px-4 py-4'>
							<SheetTitle>{meta.title}</SheetTitle>
							<SheetDescription>{meta.description}</SheetDescription>
						</SheetHeader>
					)}

					<div className='flex flex-1 flex-col overflow-y-auto py-4 gap-0'>
						{activeSheet === 'income' && (
							<IncomeQuickForm
								accounts={accounts}
								categories={incomeCategories}
								onClose={closeSheet}
							/>
						)}
						{activeSheet === 'expense' && (
							<ExpenseQuickForm
								accounts={accounts}
								categories={expenseCategories}
								budgets={budgets}
								onClose={closeSheet}
							/>
						)}
						{activeSheet === 'transfer' && (
							<TransferQuickForm
								accounts={accounts}
								onClose={closeSheet}
							/>
						)}
						{activeSheet === 'payment' && (
							<PaymentQuickForm
								accounts={accounts}
								onClose={closeSheet}
							/>
						)}
					</div>
				</SheetContent>
			</Sheet>
		</QuickActionContext.Provider>
	);
}
