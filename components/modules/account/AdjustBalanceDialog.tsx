'use client';

import { useState } from 'react';
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
import { Calculator, AlertTriangle, CreditCard, Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { z } from 'zod';

interface AdjustBalanceDialogProps {
	account: Account;
}

export function AdjustBalanceDialog({ account }: AdjustBalanceDialogProps) {
	const [open, setOpen] = useState(false);
	const [isPending, setIsPending] = useState(false);

	const isLiability = account.isLiability;

	const form = useForm<z.infer<typeof adjustBalanceSchema>>({
		resolver: zodResolver(adjustBalanceSchema),
		defaultValues: {
			accountId: account.id,
			newBalance: Number(account.balance),
		},
	});

	const newBalance = form.watch('newBalance');
	const currentBalance = Number(account.balance);
	const difference = newBalance - currentBalance;

	// For liabilities: increasing balance means MORE debt (bad), decreasing means LESS debt (good)
	// For assets: increasing balance means MORE money (good), decreasing means LESS money (bad)
	const isPositiveChange = isLiability ? difference < 0 : difference > 0;
	const hasChange = Math.abs(difference) >= 0.01;

	// Adjustment labels based on account type
	const getAdjustmentLabel = () => {
		if (isLiability) {
			return difference > 0 ? 'Increased Debt' : 'Paid Off';
		} else {
			return difference > 0 ? 'Income' : 'Expense';
		}
	};

	async function onSubmit(data: z.infer<typeof adjustBalanceSchema>) {
		setIsPending(true);
		const formData = new FormData();
		formData.append('accountId', data.accountId);
		formData.append('newBalance', data.newBalance.toString());

		const result = await adjustAccountBalanceAction(formData);
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
					<Calculator className='h-4 w-4' />
					{isLiability ? 'Adjust Debt' : 'Adjust Balance'}
				</Button>
			</DialogTrigger>
			<DialogContent className='sm:max-w-[425px]'>
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
