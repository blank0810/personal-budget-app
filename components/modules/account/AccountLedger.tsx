'use client';

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import {
	Download,
	ArrowLeft,
	ArrowUpRight,
	ArrowDownLeft,
	ArrowRightLeft,
} from 'lucide-react';
import { Decimal } from '@prisma/client/runtime/library';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { formatCurrency } from '@/lib/formatters';

interface Transaction {
	id: string;
	date: Date;
	amount: Decimal;
	type: 'INCOME' | 'EXPENSE' | 'TRANSFER_IN' | 'TRANSFER_OUT';
	description: string | null;
	categoryName?: string;
	relatedAccountName?: string;
	runningBalance?: Decimal | number | string;
}

import { EditAccountDialog } from './EditAccountDialog';
import { AdjustBalanceDialog } from './AdjustBalanceDialog';
import { Account } from '@prisma/client';

interface AccountLedgerProps {
	account: Account;
	transactions: Transaction[];
}

export function AccountLedger({ account, transactions }: AccountLedgerProps) {
	const handleExportCSV = () => {
		const headers = [
			'Date',
			'Type',
			'Description',
			'Category/Account',
			'Amount',
		];
		const csvContent = [
			headers.join(','),
			...transactions.map((t) => {
				const typeLabel = t.type.replace('_', ' ');
				const categoryOrAccount = t.relatedAccountName
					? `Transfer with ${t.relatedAccountName}`
					: t.categoryName || '-';

				return [
					format(new Date(t.date), 'yyyy-MM-dd'),
					typeLabel,
					`"${(t.description || '').replace(/"/g, '""')}"`,
					`"${categoryOrAccount}"`,
					t.amount.toString(),
				].join(',');
			}),
		].join('\n');

		const blob = new Blob([csvContent], { type: 'text/csv' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${account.name.replace(/\s+/g, '_')}_ledger.csv`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		window.URL.revokeObjectURL(url);
	};

	const getTypeBadge = (type: Transaction['type']) => {
		switch (type) {
			case 'INCOME':
				return (
					<Badge className='bg-green-100 text-green-800 hover:bg-green-100 border-green-200'>
						INCOME
					</Badge>
				);
			case 'EXPENSE':
				return (
					<Badge className='bg-red-100 text-red-800 hover:bg-red-100 border-red-200'>
						EXPENSE
					</Badge>
				);
			case 'TRANSFER_IN':
				return (
					<Badge className='bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200'>
						TRANSFER IN
					</Badge>
				);
			case 'TRANSFER_OUT':
				return (
					<Badge className='bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200'>
						TRANSFER OUT
					</Badge>
				);
		}
	};

	const getTypeIcon = (type: Transaction['type']) => {
		switch (type) {
			case 'INCOME':
				return <ArrowDownLeft className='h-4 w-4 text-green-600' />;
			case 'EXPENSE':
				return <ArrowUpRight className='h-4 w-4 text-red-600' />;
			case 'TRANSFER_IN':
				return <ArrowRightLeft className='h-4 w-4 text-blue-600' />;
			case 'TRANSFER_OUT':
				return <ArrowRightLeft className='h-4 w-4 text-orange-600' />;
		}
	};

	return (
		<div className='space-y-6'>
			<div className='flex items-center gap-4'>
				<Button variant='outline' size='icon' asChild>
					<Link href='/accounts'>
						<ArrowLeft className='h-4 w-4' />
					</Link>
				</Button>
				<div>
					<h1 className='text-3xl font-bold tracking-tight'>
						{account.name}
					</h1>
					<div className='flex items-center gap-2 text-muted-foreground'>
						<Badge variant='outline'>{account.type}</Badge>
						<span>
							Current Balance:{' '}
							<span className='font-bold text-foreground'>
								{formatCurrency(Number(account.balance))}
							</span>
						</span>
					</div>
				</div>
				<div className='ml-auto flex items-center gap-2'>
					<AdjustBalanceDialog account={account} />
					<EditAccountDialog account={account} />
					<Button
						onClick={handleExportCSV}
						variant='outline'
						size='sm'
					>
						<Download className='mr-2 h-4 w-4' />
						Export CSV
					</Button>
				</div>
			</div>

			<div className='rounded-md border bg-card'>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className='w-[120px]'>Date</TableHead>
							<TableHead className='w-[140px]'>Type</TableHead>
							<TableHead>Description</TableHead>
							<TableHead>Category / Account</TableHead>
							<TableHead className='text-right'>Amount</TableHead>
							<TableHead className='text-right'>
								Balance
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{transactions.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={6}
									className='text-center h-24 text-muted-foreground'
								>
									No transactions found.
								</TableCell>
							</TableRow>
						) : (
							transactions.map((t) => (
								<TableRow key={t.id}>
									<TableCell>
										{format(
											new Date(t.date),
											'MMM d, yyyy'
										)}
									</TableCell>
									<TableCell>
										<div className='flex items-center gap-2'>
											{getTypeIcon(t.type)}
											{getTypeBadge(t.type)}
										</div>
									</TableCell>
									<TableCell>
										{t.description || '-'}
									</TableCell>
									<TableCell>
										{t.relatedAccountName ? (
											<span className='text-muted-foreground italic'>
												Transfer: {t.relatedAccountName}
											</span>
										) : (
											t.categoryName || '-'
										)}
									</TableCell>
									<TableCell
										className={`text-right font-bold ${
											['INCOME', 'TRANSFER_IN'].includes(
												t.type
											)
												? 'text-green-600'
												: 'text-red-600'
										}`}
									>
										{['INCOME', 'TRANSFER_IN'].includes(
											t.type
										)
											? '+'
											: '-'}
										{formatCurrency(Number(t.amount))}
									</TableCell>
									<TableCell className='text-right font-medium text-muted-foreground'>
										{t.runningBalance !== undefined
											? formatCurrency(
													Number(t.runningBalance)
											  )
											: '-'}
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
