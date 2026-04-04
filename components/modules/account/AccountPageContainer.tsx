'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, ExternalLink, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
} from '@/components/ui/sheet';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AccountForm } from './AccountForm';
import { AccountList, AccountChips } from './AccountList';
import { AccountKPICards, type AccountKPIData } from './AccountKPICards';
import type { AccountClass } from '@/lib/account-utils';
import { deleteAccountAction } from '@/server/modules/account/account.controller';
import { useCurrency } from '@/lib/contexts/currency-context';
import { Account } from '@prisma/client';

function getMaskedNumber(id: string): string {
	const chars = id.replace(/-/g, '');
	let num = 0;
	for (let i = 0; i < chars.length; i++) {
		num = (num * 31 + chars.charCodeAt(i)) >>> 0;
	}
	return `•••• •••• •••• ${String(num % 10000).padStart(4, '0')}`;
}

interface AccountPageContainerProps {
	accounts: Account[];
	summary: AccountKPIData;
}

export function AccountPageContainer({ accounts, summary }: AccountPageContainerProps) {
	const router = useRouter();
	const { formatCurrency } = useCurrency();
	const [sheetOpen, setSheetOpen] = useState(false);
	const [selectedId, setSelectedId] = useState<string | null>(
		accounts.length > 0 ? accounts[0].id : null
	);
	const [activeGroup, setActiveGroup] = useState<AccountClass | null>(null);

	const selectedAccount = accounts.find((a) => a.id === selectedId) ?? null;

	const handleSuccess = useCallback(() => {
		setSheetOpen(false);
		router.refresh();
	}, [router]);

	const handleDelete = useCallback(
		async (id: string) => {
			const result = await deleteAccountAction(id);
			if (result?.error) {
				toast.error(result.error);
			} else {
				toast.success('Account deleted');
				if (selectedId === id) {
					setSelectedId(accounts.find((a) => a.id !== id)?.id ?? null);
				}
				router.refresh();
			}
		},
		[router, selectedId, accounts]
	);

	return (
		<>
			<div className='flex items-center justify-between'>
				<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>Accounts</h1>
				<Button size='sm' className='gap-2 text-xs' onClick={() => setSheetOpen(true)}>
					<Plus className='h-3.5 w-3.5' />
					Add Account
				</Button>
			</div>

			<AccountKPICards {...summary} />

			{/* Type chips — above the grid so right panel aligns with cards */}
			<AccountChips
				accounts={accounts}
				activeGroup={activeGroup}
				onGroupChange={setActiveGroup}
			/>

			{/* Two-column layout: card list (left) + detail panel (right) */}
			<div className='grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr] items-start'>
				{/* Left: Account list */}
				<div className='min-w-0 overflow-hidden'>
				<AccountList
					accounts={accounts}
					selectedId={selectedId}
					onSelect={setSelectedId}
					activeGroup={activeGroup}
				/>
				</div>

				{/* Right: Account detail panel */}
				{selectedAccount && (
					<div className='hidden lg:block'>
						<Card className='sticky top-4'>
							<CardHeader className='pb-3'>
								<CardTitle className='text-base'>Account Details</CardTitle>
							</CardHeader>
							<CardContent className='space-y-4'>
								{/* Balance */}
								<div className='rounded-lg border p-4'>
									<p className='text-xs text-muted-foreground'>
										{selectedAccount.isLiability ? 'Amount Owed' : 'Current Balance'}
									</p>
									<p className='text-2xl font-bold tabular-nums mt-1'>
										{formatCurrency(Number(selectedAccount.balance))}
									</p>
								</div>

								{/* Details rows */}
								<div className='divide-y text-sm'>
									<div className='flex items-center justify-between py-3'>
										<span className='text-muted-foreground'>Account Type</span>
										<Badge variant='secondary' className='text-xs'>
											{selectedAccount.type}
										</Badge>
									</div>
									<div className='flex items-center justify-between py-3'>
										<span className='text-muted-foreground'>Account Name</span>
										<span className='font-medium truncate max-w-[160px]'>
											{selectedAccount.name}
										</span>
									</div>
									<div className='flex items-center justify-between py-3'>
										<span className='text-muted-foreground'>Account Number</span>
										<span className='font-mono text-xs'>
											{getMaskedNumber(selectedAccount.id)}
										</span>
									</div>
									{selectedAccount.type === 'CREDIT' && selectedAccount.creditLimit && (
										<>
											<div className='flex items-center justify-between py-3'>
												<span className='text-muted-foreground'>Credit Limit</span>
												<span className='font-medium tabular-nums'>
													{formatCurrency(Number(selectedAccount.creditLimit))}
												</span>
											</div>
											<div className='flex items-center justify-between py-3'>
												<span className='text-muted-foreground'>Available Credit</span>
												<span className='font-medium tabular-nums text-green-600 dark:text-green-400'>
													{formatCurrency(
														Number(selectedAccount.creditLimit) - Number(selectedAccount.balance)
													)}
												</span>
											</div>
										</>
									)}
								</div>

								{/* Quick Actions */}
								<div className='space-y-2 pt-2'>
									<p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
										Quick Actions
									</p>
									<Button
										variant='outline'
										size='sm'
										className='w-full gap-2 justify-center'
										asChild
									>
										<Link href={`/accounts/${selectedAccount.id}`}>
											<ExternalLink className='h-3.5 w-3.5' />
											View Account Details
										</Link>
									</Button>
									<AlertDialog>
										<AlertDialogTrigger asChild>
											<Button
												variant='outline'
												size='sm'
												className='w-full gap-2 justify-center text-destructive hover:text-destructive'
											>
												<Trash2 className='h-3.5 w-3.5' />
												Delete Account
											</Button>
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>Delete {selectedAccount.name}?</AlertDialogTitle>
												<AlertDialogDescription>
													This action cannot be undone if the account has related transactions.
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>Cancel</AlertDialogCancel>
												<AlertDialogAction
													onClick={() => handleDelete(selectedAccount.id)}
													className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
												>
													Delete
												</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								</div>
							</CardContent>
						</Card>
					</div>
				)}
			</div>

			<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
				<SheetContent side='right' className='w-full sm:max-w-md flex flex-col gap-0 p-0'>
					<SheetHeader className='border-b px-4 py-4'>
						<SheetTitle>Add Account</SheetTitle>
						<SheetDescription>
							Create a new bank account, credit card, or loan
						</SheetDescription>
					</SheetHeader>
					<div className='flex flex-1 flex-col overflow-y-auto px-4 py-4'>
						<AccountForm onSuccess={handleSuccess} />
					</div>
				</SheetContent>
			</Sheet>
		</>
	);
}
