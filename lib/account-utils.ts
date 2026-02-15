import { AccountType, Account } from '@prisma/client';
import {
	Wallet,
	PiggyBank,
	CreditCard,
	Target,
} from 'lucide-react';

export type AccountClass = 'liquid' | 'savings' | 'liability' | 'fund';

export const ACCOUNT_CLASS_MAP: Record<AccountType, AccountClass> = {
	BANK: 'liquid',
	CASH: 'liquid',
	SAVINGS: 'savings',
	INVESTMENT: 'savings',
	CREDIT: 'liability',
	LOAN: 'liability',
	EMERGENCY_FUND: 'fund',
	FUND: 'fund',
	TITHE: 'fund',
};

export const ACCOUNT_CLASS_META: Record<
	AccountClass,
	{ label: string; icon: typeof Wallet; color: string }
> = {
	liquid: { label: 'Liquid Assets', icon: Wallet, color: 'emerald' },
	savings: { label: 'Savings & Investments', icon: PiggyBank, color: 'blue' },
	liability: { label: 'Liabilities', icon: CreditCard, color: 'red' },
	fund: { label: 'Funds & Goals', icon: Target, color: 'violet' },
};

export const ACCOUNT_CLASS_ORDER: AccountClass[] = [
	'liquid',
	'savings',
	'liability',
	'fund',
];

export function groupAccountsByClass(accounts: Account[]) {
	const groups: Record<AccountClass, Account[]> = {
		liquid: [],
		savings: [],
		liability: [],
		fund: [],
	};

	for (const account of accounts) {
		const cls = ACCOUNT_CLASS_MAP[account.type];
		groups[cls].push(account);
	}

	return groups;
}
