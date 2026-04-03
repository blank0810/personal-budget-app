'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, CreditCard, Loader2 } from 'lucide-react';
import { CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/lib/contexts/currency-context';
import { createTransferAction } from '@/server/modules/transfer/transfer.controller';
import { createPaymentAction } from '@/server/modules/payment/payment.controller';
import { toast } from 'sonner';

interface Account {
	id: string;
	name: string;
	type: string;
	balance: number;
	isLiability: boolean;
}

interface QuickTransferPaymentProps {
	accounts: Account[];
}

type Mode = 'transfer' | 'payment';

export function QuickTransferPayment({
	accounts,
}: QuickTransferPaymentProps) {
	const { formatCurrency } = useCurrency();
	const router = useRouter();
	const [mode, setMode] = useState<Mode>('transfer');
	const [fromId, setFromId] = useState('');
	const [toId, setToId] = useState('');
	const [amount, setAmount] = useState('');
	const [fee, setFee] = useState('');
	const [loading, setLoading] = useState(false);

	const assetAccounts = accounts.filter((a) => !a.isLiability);
	const liabilityAccounts = accounts.filter((a) => a.isLiability);
	const allAccounts = accounts;

	function handleModeChange(next: Mode) {
		setMode(next);
		setFromId('');
		setToId('');
		setAmount('');
		setFee('');
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!fromId || !toId || !amount || Number(amount) <= 0) return;

		setLoading(true);

		try {
			if (mode === 'transfer') {
				const result = await createTransferAction({
					amount: Number(amount),
					date: new Date(),
					fromAccountId: fromId,
					toAccountId: toId,
					description: 'Quick transfer from dashboard',
					fee: fee ? Number(fee) : undefined,
				});

				if (result?.error) {
					toast.error(result.error);
				} else {
					toast.success('Transfer completed');
					setFromId('');
					setToId('');
					setAmount('');
					setFee('');
					router.refresh();
				}
			} else {
				const result = await createPaymentAction({
					amount: Number(amount),
					date: new Date(),
					fromAccountId: fromId,
					toLiabilityId: toId,
					description: 'Quick payment from dashboard',
					fee: fee ? Number(fee) : 0,
				});

				if (result?.error) {
					toast.error(result.error);
				} else {
					toast.success('Payment completed');
					setFromId('');
					setToId('');
					setAmount('');
					setFee('');
					router.refresh();
				}
			}
		} catch {
			toast.error('Something went wrong');
		} finally {
			setLoading(false);
		}
	}

	const toOptions = mode === 'transfer' ? allAccounts : liabilityAccounts;
	const isValid = fromId && toId && amount && Number(amount) > 0 && !loading;

	return (
		<div>
			<div className='flex items-center justify-between mb-4'>
				<CardTitle className='text-base font-semibold'>
					Quick Transfer
				</CardTitle>
				<div className='flex items-center rounded-lg border p-0.5 gap-0.5'>
					<button
						type='button'
						onClick={() => handleModeChange('transfer')}
						className={cn(
							'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
							mode === 'transfer'
								? 'bg-primary text-primary-foreground shadow-sm'
								: 'text-muted-foreground hover:text-foreground'
						)}
					>
						<ArrowLeftRight className='h-3 w-3' />
						Transfer
					</button>
					<button
						type='button'
						onClick={() => handleModeChange('payment')}
						className={cn(
							'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
							mode === 'payment'
								? 'bg-primary text-primary-foreground shadow-sm'
								: 'text-muted-foreground hover:text-foreground'
						)}
					>
						<CreditCard className='h-3 w-3' />
						Payment
					</button>
				</div>
			</div>

			{mode === 'payment' && liabilityAccounts.length === 0 ? (
				<div className='py-8 text-center text-sm text-muted-foreground'>
					<CreditCard className='mx-auto mb-2 h-8 w-8 opacity-40' />
					<p>No liability accounts found.</p>
					<p className='mt-1 text-xs'>
						Add a credit card or loan to make payments.
					</p>
				</div>
			) : assetAccounts.length === 0 ? (
				<div className='py-8 text-center text-sm text-muted-foreground'>
					<p>No asset accounts found.</p>
				</div>
			) : (
				<form onSubmit={handleSubmit} className='space-y-3'>
					<div className='space-y-1.5'>
						<Label className='text-xs font-medium text-muted-foreground'>
							From
						</Label>
						<Select value={fromId} onValueChange={setFromId}>
							<SelectTrigger className='w-full'>
								<SelectValue placeholder='Select source account' />
							</SelectTrigger>
							<SelectContent>
								{assetAccounts.map((account) => (
									<SelectItem
										key={account.id}
										value={account.id}
										disabled={account.id === toId}
									>
										<span className='truncate'>
											{account.name}{' '}
											<span className='text-muted-foreground'>
												({formatCurrency(account.balance)})
											</span>
										</span>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className='space-y-1.5'>
						<Label className='text-xs font-medium text-muted-foreground'>
							{mode === 'transfer' ? 'To' : 'Pay off'}
						</Label>
						<Select value={toId} onValueChange={setToId}>
							<SelectTrigger className='w-full'>
								<SelectValue
									placeholder={
										mode === 'transfer'
											? 'Select destination'
											: 'Select liability to pay'
									}
								/>
							</SelectTrigger>
							<SelectContent>
								{toOptions.map((account) => (
									<SelectItem
										key={account.id}
										value={account.id}
										disabled={account.id === fromId}
									>
										<span className='truncate'>
											{account.name}{' '}
											<span className='text-muted-foreground'>
												({formatCurrency(account.balance)}
												{account.isLiability ? ' owed' : ''})
											</span>
										</span>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className='space-y-1.5'>
						<Label className='text-xs font-medium text-muted-foreground'>
							Amount
						</Label>
						<Input
							type='number'
							min='0.01'
							step='0.01'
							placeholder='0.00'
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							className='tabular-nums'
						/>
					</div>

					<div className='space-y-1.5'>
						<Label className='text-xs font-medium text-muted-foreground'>
							Transaction Fee (optional)
						</Label>
						<Input
							type='number'
							min='0'
							step='0.01'
							placeholder='0.00'
							value={fee}
							onChange={(e) => setFee(e.target.value)}
							className='tabular-nums'
						/>
					</div>

					<Button
						type='submit'
						className='mt-1 w-full'
						disabled={!isValid}
					>
						{loading ? (
							<>
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
								Processing...
							</>
						) : (
							mode === 'transfer' ? 'Transfer' : 'Pay'
						)}
					</Button>
				</form>
			)}
		</div>
	);
}
