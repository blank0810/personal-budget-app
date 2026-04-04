'use client';

import { useState } from 'react';
import {
	Wallet,
	PiggyBank,
	CreditCard,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/lib/contexts/currency-context';
import { Account } from '@prisma/client';
import { AccountCard } from '@/components/modules/dashboard/AccountCard';
import {
	groupAccountsByClass,
	ACCOUNT_CLASS_ORDER,
	ACCOUNT_CLASS_META,
	type AccountClass,
} from '@/lib/account-utils';
import { cn } from '@/lib/utils';

function getMaskedCardNumber(id: string): string {
	const chars = id.replace(/-/g, '');
	let num = 0;
	for (let i = 0; i < chars.length; i++) {
		num = (num * 31 + chars.charCodeAt(i)) >>> 0;
	}
	const suffix = String(num % 10000).padStart(4, '0');
	return `•••• •••• •••• ${suffix}`;
}

const TYPE_CHIPS = [
	{ value: null, label: 'All', icon: null },
	{ value: 'liquid' as AccountClass, label: 'Liquid Assets', icon: Wallet },
	{ value: 'savings' as AccountClass, label: 'Savings & Investments', icon: PiggyBank },
	{ value: 'liability' as AccountClass, label: 'Liabilities', icon: CreditCard },
] as const;

interface AccountChipsProps {
	accounts: Account[];
	activeGroup: AccountClass | null;
	onGroupChange: (group: AccountClass | null) => void;
}

export function AccountChips({ accounts, activeGroup, onGroupChange }: AccountChipsProps) {
	const groups = groupAccountsByClass(accounts);

	return (
		<div className='flex items-center gap-2 flex-wrap'>
			{TYPE_CHIPS.map((chip) => {
				const count = chip.value ? groups[chip.value]?.length ?? 0 : accounts.length;
				if (chip.value && count === 0) return null;
				const Icon = chip.icon;

				return (
					<button
						key={chip.label}
						type='button'
						onClick={() => onGroupChange(chip.value)}
						className={cn(
							'rounded-full border px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1.5',
							activeGroup === chip.value ||
								(chip.value === null && activeGroup === null)
								? 'border-primary bg-primary text-primary-foreground'
								: 'border-border bg-background text-muted-foreground hover:bg-accent'
						)}
					>
						{Icon && <Icon className='h-3 w-3' />}
						{chip.label}
						<span className='opacity-70'>({count})</span>
					</button>
				);
			})}
		</div>
	);
}

interface AccountListProps {
	accounts: Account[];
	selectedId: string | null;
	onSelect: (id: string) => void;
	activeGroup: AccountClass | null;
}

export function AccountList({ accounts, selectedId, onSelect, activeGroup }: AccountListProps) {
	const groups = groupAccountsByClass(accounts);

	if (accounts.length === 0) {
		return (
			<div className='rounded-md border bg-card p-8 text-center text-muted-foreground'>
				No accounts found. Add your first account to get started.
			</div>
		);
	}

	// Determine which groups to show
	const visibleGroups = activeGroup
		? [activeGroup]
		: ACCOUNT_CLASS_ORDER.filter((cls) => groups[cls].length > 0);

	return (
		<div className='space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'>
			{visibleGroups.map((cls) => {
					const groupAccounts = groups[cls];
					if (groupAccounts.length === 0) return null;
					const meta = ACCOUNT_CLASS_META[cls];

					return (
						<div key={cls} className='space-y-3'>
							{groupAccounts.map((account) => (
								<AccountRow
									key={account.id}
									account={account}
									isSelected={selectedId === account.id}
									onSelect={onSelect}
								/>
							))}
						</div>
					);
				})}
		</div>
	);
}

function GroupHeader({
	cls,
	label,
	accounts,
}: {
	cls: AccountClass;
	label: string;
	accounts: Account[];
}) {
	const { formatCurrency } = useCurrency();
	const meta = ACCOUNT_CLASS_META[cls];
	const Icon = meta.icon;
	const subtotal = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
	const isLiability = cls === 'liability';

	return (
		<div className='flex items-center justify-between py-2'>
			<h3
				className={cn(
					'text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5',
					meta.color === 'emerald' && 'text-emerald-600 dark:text-emerald-400',
					meta.color === 'blue' && 'text-blue-600 dark:text-blue-400',
					meta.color === 'red' && 'text-red-600 dark:text-red-400'
				)}
			>
				<Icon className='h-4 w-4' />
				{label}
				<span className='opacity-70'>({accounts.length})</span>
			</h3>
			<span
				className={cn(
					'text-sm font-bold tabular-nums',
					isLiability
						? 'text-red-600 dark:text-red-400'
						: 'text-foreground'
				)}
			>
				{formatCurrency(subtotal)}
			</span>
		</div>
	);
}

function AccountRow({
	account,
	isSelected,
	onSelect,
}: {
	account: Account;
	isSelected: boolean;
	onSelect: (id: string) => void;
}) {
	const { formatCurrency } = useCurrency();
	const balance = Number(account.balance);
	const creditLimit = Number(account.creditLimit ?? 0);
	const isCredit = account.type === 'CREDIT' && creditLimit > 0;
	const utilization = isCredit ? Math.min(balance / creditLimit, 1) : 0;
	const utilizationPercent = Math.round(utilization * 100);
	const availableCredit = isCredit ? creditLimit - balance : 0;

	const cardAccount = {
		id: account.id,
		name: account.name,
		type: account.type,
		balance,
		color: account.color,
		isLiability: account.isLiability,
		creditLimit: account.creditLimit ? creditLimit : null,
	};

	return (
		<div
			role='button'
			tabIndex={0}
			onClick={() => onSelect(account.id)}
			onKeyDown={(e) => e.key === 'Enter' && onSelect(account.id)}
			className={cn(
				'flex w-full cursor-pointer flex-col sm:flex-row items-stretch gap-4 rounded-xl border bg-card p-4 text-left transition-all',
				isSelected
					? 'ring-2 ring-primary border-primary'
					: 'hover:bg-accent/50'
			)}
		>
			{/* Left: Card graphic */}
			<div className='shrink-0 sm:w-[260px] pointer-events-none'>
				<AccountCard
					account={cardAccount}
					isSelected={false}
					onClick={() => {}}
				/>
			</div>

			{/* Right: 2x2 detail grid */}
			<div className='flex flex-1 flex-col justify-center gap-3 min-w-0'>
				<div className='flex items-center gap-2'>
					<h3 className='text-sm font-semibold truncate'>
						{account.name}
					</h3>
					<Badge
						variant='secondary'
						className='text-[10px] font-medium shrink-0'
					>
						{account.type}
					</Badge>
				</div>

				<div className='grid grid-cols-2 gap-x-4 gap-y-3'>
					{/* Row 1: Balance | Account Number */}
					<div>
						<p className='text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5'>
							{account.isLiability ? 'Amount Owed' : 'Balance'}
						</p>
						<p className='text-sm font-bold tabular-nums'>
							{formatCurrency(balance)}
						</p>
					</div>
					<div>
						<p className='text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5'>
							Account Number
						</p>
						<p className='font-mono text-xs font-medium text-muted-foreground'>
							{getMaskedCardNumber(account.id)}
						</p>
					</div>

					{/* Row 2: Type | Credit info or placeholder */}
					<div>
						<p className='text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5'>
							Account Type
						</p>
						<p className='text-xs font-medium'>{account.type}</p>
					</div>
					<div>
						{isCredit ? (
							<>
								<p className='text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5'>
									Available Credit
								</p>
								<p
									className={cn(
										'text-xs font-medium tabular-nums',
										utilization >= 0.7
											? 'text-red-600 dark:text-red-400'
											: utilization >= 0.3
												? 'text-yellow-600 dark:text-yellow-400'
												: 'text-green-600 dark:text-green-400'
									)}
								>
									{formatCurrency(availableCredit)}
								</p>
							</>
						) : (
							<>
								<p className='text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5'>
									Status
								</p>
								<p className='text-xs font-medium text-green-600 dark:text-green-400'>
									Active
								</p>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
