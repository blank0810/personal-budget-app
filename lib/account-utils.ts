import { AccountType, Account } from '@prisma/client';
import {
	Wallet,
	PiggyBank,
	CreditCard,
} from 'lucide-react';

export type AccountClass = 'liquid' | 'savings' | 'liability';

export const ACCOUNT_CLASS_MAP: Record<AccountType, AccountClass> = {
	BANK: 'liquid',
	CASH: 'liquid',
	SAVINGS: 'savings',
	INVESTMENT: 'savings',
	TITHE: 'savings',
	CREDIT: 'liability',
	LOAN: 'liability',
};

export const ACCOUNT_CLASS_META: Record<
	AccountClass,
	{ label: string; icon: typeof Wallet; color: string }
> = {
	liquid: { label: 'Liquid Assets', icon: Wallet, color: 'emerald' },
	savings: { label: 'Savings & Investments', icon: PiggyBank, color: 'blue' },
	liability: { label: 'Liabilities', icon: CreditCard, color: 'red' },
};

export const ACCOUNT_CLASS_ORDER: AccountClass[] = [
	'liquid',
	'savings',
	'liability',
];

export function groupAccountsByClass(accounts: Account[]) {
	const groups: Record<AccountClass, Account[]> = {
		liquid: [],
		savings: [],
		liability: [],
	};

	for (const account of accounts) {
		const cls = ACCOUNT_CLASS_MAP[account.type];
		groups[cls].push(account);
	}

	return groups;
}
