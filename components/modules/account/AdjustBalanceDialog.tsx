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
} from '@/components/ui/form';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Calculator } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { z } from 'zod';

interface AdjustBalanceDialogProps {
	account: Account;
}

export function AdjustBalanceDialog({ account }: AdjustBalanceDialogProps) {
	const [open, setOpen] = useState(false);
	const [isPending, setIsPending] = useState(false);

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
	const isIncome = difference > 0;
	const hasChange = Math.abs(difference) >= 0.01;

	async function onSubmit(data: z.infer<typeof adjustBalanceSchema>) {
		setIsPending(true);
		const formData = new FormData();
		formData.append('accountId', data.accountId);
		formData.append('newBalance', data.newBalance.toString());

		const result = await adjustAccountBalanceAction(formData);
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
					<Calculator className='h-4 w-4' />
					Adjust Balance
				</Button>
			</DialogTrigger>
			<DialogContent className='sm:max-w-[425px]'>
				<DialogHeader>
					<DialogTitle>Adjust Balance</DialogTitle>
					<DialogDescription>
						Manually set the correct balance. The system will create
						an adjustment transaction to reconcile the difference.
					</DialogDescription>
				</DialogHeader>
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
									<FormLabel>Correct Balance</FormLabel>
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

						{/* Adjustment Preview */}
						{hasChange && (
							<div className='flex flex-col space-y-2 rounded-md bg-muted p-3 border'>
								<div className='flex justify-between text-sm'>
									<span className='text-muted-foreground'>
										Current Balance:
									</span>
									<span>
										{formatCurrency(currentBalance)}
									</span>
								</div>
								<div className='flex justify-between text-sm font-medium'>
									<span>New Balance:</span>
									<span>{formatCurrency(newBalance)}</span>
								</div>
								<div className='border-t my-1'></div>
								<div className='flex justify-between text-sm font-bold items-center'>
									<span>Adjustment:</span>
									<span
										className={cn(
											isIncome
												? 'text-green-600'
												: 'text-red-600'
										)}
									>
										{isIncome ? '+' : '-'}
										{formatCurrency(Math.abs(difference))}
										<span className='ml-1 text-xs font-normal text-muted-foreground'>
											({isIncome ? 'Income' : 'Expense'})
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
