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
import {
	Trash2,
	FileText,
	Landmark,
	Wallet,
	PiggyBank,
	TrendingUp,
	CreditCard,
	Church,
} from 'lucide-react';
import { deleteAccountAction } from '@/server/modules/account/account.controller';
import { useCurrency } from '@/lib/contexts/currency-context';
import { Account } from '@prisma/client';
import Link from 'next/link';
import {
	groupAccountsByClass,
	ACCOUNT_CLASS_ORDER,
	ACCOUNT_CLASS_META,
	type AccountClass,
} from '@/lib/account-utils';
import { cn } from '@/lib/utils';

const ACCOUNT_TYPE_ICON: Record<string, React.ElementType> = {
	BANK: Landmark,
	CASH: Wallet,
	SAVINGS: PiggyBank,
	INVESTMENT: TrendingUp,
	CREDIT: CreditCard,
	LOAN: FileText,
	TITHE: Church,
};

const ACCOUNT_COLOR_MAP: Record<string, string> = {
	blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
	green: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
	purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400',
	orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400',
	red: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
	emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400',
};

interface AccountListProps {
	accounts: Account[];
}

export function AccountList({ accounts }: AccountListProps) {
	const groups = groupAccountsByClass(accounts);

	async function handleDelete(id: string) {
		if (
			confirm(
				'Are you sure you want to delete this account? This action cannot be undone if there are related transactions.'
			)
		) {
			const result = await deleteAccountAction(id);
			if (result?.error) {
				alert(result.error);
			}
		}
	}

	if (accounts.length === 0) {
		return (
			<div className='rounded-md border bg-card p-8 text-center text-muted-foreground'>
				No accounts found.
			</div>
		);
	}

	return (
		<div className='space-y-6'>
			{ACCOUNT_CLASS_ORDER.map((cls) => {
				const groupAccounts = groups[cls];
				if (groupAccounts.length === 0) return null;

				const meta = ACCOUNT_CLASS_META[cls];
				const Icon = meta.icon;
				const subtotal = groupAccounts.reduce(
					(sum, a) => sum + Number(a.balance),
					0
				);

				return (
					<AccountGroup
						key={cls}
						cls={cls}
						label={meta.label}
						icon={<Icon className='h-4 w-4' />}
						color={meta.color}
						subtotal={subtotal}
						accounts={groupAccounts}
						onDelete={handleDelete}
					/>
				);
			})}
		</div>
	);
}

function AccountGroup({
	cls,
	label,
	icon,
	color,
	subtotal,
	accounts,
	onDelete,
}: {
	cls: AccountClass;
	label: string;
	icon: React.ReactNode;
	color: string;
	subtotal: number;
	accounts: Account[];
	onDelete: (id: string) => void;
}) {
	const { formatCurrency } = useCurrency();
	const isLiability = cls === 'liability';

	return (
		<div className='space-y-2'>
			<div className='flex items-center justify-between px-1'>
				<h3
					className={cn(
						'text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5',
						color === 'emerald' && 'text-emerald-600',
						color === 'blue' && 'text-blue-600',
						color === 'red' && 'text-red-600'
					)}
				>
					{icon}
					{label}
				</h3>
				<span
					className={cn(
						'text-sm font-bold',
						isLiability ? 'text-red-600' : 'text-foreground'
					)}
				>
					{formatCurrency(subtotal)}
				</span>
			</div>
			<div className='rounded-md border bg-card'>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Type</TableHead>
							<TableHead className='text-right'>Balance</TableHead>
							<TableHead className='w-[100px] text-right'>
								Actions
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{accounts.map((account) => (
							<AccountRow
								key={account.id}
								account={account}
								onDelete={onDelete}
							/>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

function AccountRow({
	account,
	onDelete,
}: {
	account: Account;
	onDelete: (id: string) => void;
}) {
	const { formatCurrency } = useCurrency();
	const TypeIcon = ACCOUNT_TYPE_ICON[account.type] || Landmark;

	return (
		<TableRow>
			<TableCell className='font-medium'>
				<span className='flex items-center gap-2'>
					<span className={cn(
						'flex h-6 w-6 items-center justify-center rounded-full shrink-0',
						account.color && ACCOUNT_COLOR_MAP[account.color]
							? ACCOUNT_COLOR_MAP[account.color]
							: 'text-muted-foreground'
					)}>
						<TypeIcon className='h-3.5 w-3.5' />
					</span>
					{account.name}
				</span>
			</TableCell>
			<TableCell>
				<span className='inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary hover:bg-primary/20'>
					{account.type}
				</span>
			</TableCell>
			<TableCell className='text-right'>
				<div className='font-bold ml-auto'>
					{formatCurrency(Number(account.balance))}
				</div>
				{account.type === 'CREDIT' && account.creditLimit && (
					<CreditUtilization account={account} />
				)}
			</TableCell>
			<TableCell>
				<div className='flex justify-end gap-2'>
					<Button
						variant='ghost'
						size='icon'
						className='h-8 w-8 text-muted-foreground hover:text-primary'
						asChild
					>
						<Link href={`/accounts/${account.id}`}>
							<FileText className='h-4 w-4' />
						</Link>
					</Button>
					<Button
						variant='ghost'
						size='icon'
						className='h-8 w-8 text-destructive'
						onClick={() => onDelete(account.id)}
					>
						<Trash2 className='h-4 w-4' />
					</Button>
				</div>
			</TableCell>
		</TableRow>
	);
}

function CreditUtilization({ account }: { account: Account }) {
	const { formatCurrency } = useCurrency();
	const creditLimit = Number(account.creditLimit);
	const balance = Number(account.balance);
	const utilization = balance / creditLimit;
	const availableCredit = creditLimit - balance;
	const utilizationPercent = Math.round(utilization * 100);

	let barColor = 'bg-green-400';
	if (utilization >= 0.9) barColor = 'bg-red-600';
	else if (utilization >= 0.7) barColor = 'bg-red-500';
	else if (utilization >= 0.5) barColor = 'bg-orange-500';
	else if (utilization >= 0.3) barColor = 'bg-yellow-500';
	else if (utilization >= 0.1) barColor = 'bg-green-500';

	return (
		<div className='flex flex-col items-end gap-1 mt-1'>
			<div className='flex justify-between w-full text-xs'>
				<span
					className={
						utilization >= 0.7
							? 'text-red-600 dark:text-red-400'
							: utilization >= 0.5
							? 'text-orange-600 dark:text-orange-400'
							: utilization >= 0.3
							? 'text-yellow-600 dark:text-yellow-400'
							: 'text-green-600 dark:text-green-400'
					}
				>
					{utilizationPercent}% Used
				</span>
				<span className='text-green-600 dark:text-green-400'>
					Avail: {formatCurrency(availableCredit)}
				</span>
			</div>
			<div className='w-full h-1.5 bg-secondary rounded-full overflow-hidden'>
				<div
					className={`h-full ${barColor}`}
					style={{
						width: `${Math.min(utilizationPercent, 100)}%`,
					}}
				/>
			</div>
		</div>
	);
}
