import prisma from '@/lib/prisma';
import {
	CreateAccountInput,
	GetAccountsInput,
	UpdateAccountInput,
} from './account.types';
import { Prisma } from '@prisma/client';

export const AccountService = {
	/**
	 * Create a new account.
	 *
	 * If `balance > 0`, the starting value is also stored in `openingBalance`.
	 * The ledger renders a synthetic "Opening Balance" row based on that column
	 * via getAccountWithTransactions, so no real Income/Expense row is written.
	 * This keeps opening balances out of reports, KPIs, and budget aggregates.
	 */
	async createAccount(userId: string, data: CreateAccountInput) {
		const balance = data.balance || 0;

		return await prisma.account.create({
			data: {
				...data,
				userId,
				openingBalance:
					balance > 0 ? new Prisma.Decimal(balance) : null,
			},
		});
	},

	/**
	 * Get all active (non-archived) accounts for a user
	 */
	async getAccounts(userId: string, filters?: GetAccountsInput) {
		return await prisma.account.findMany({
			where: {
				userId,
				type: filters?.type,
				isArchived: false, // Only show active accounts
			},
			orderBy: {
				name: 'asc',
			},
		});
	},

	/**
	 * Get account KPI summary (Net Worth, Total Balance, Total Debt, Credit Utilization)
	 */
	async getAccountSummary(userId: string) {
		const accounts = await prisma.account.findMany({
			where: { userId, isArchived: false },
			select: { balance: true, isLiability: true, creditLimit: true },
		});

		let totalBalance = 0;
		let totalDebt = 0;
		let totalCreditUsed = 0;
		let totalCreditLimit = 0;

		for (const account of accounts) {
			const balance = Number(account.balance);
			if (account.isLiability) {
				totalDebt += balance;
				const limit = Number(account.creditLimit ?? 0);
				if (limit > 0) {
					totalCreditUsed += balance;
					totalCreditLimit += limit;
				}
			} else {
				totalBalance += balance;
			}
		}

		return {
			totalBalance,
			totalDebt,
			netWorth: totalBalance - totalDebt,
			creditUtilization:
				totalCreditLimit > 0
					? (totalCreditUsed / totalCreditLimit) * 100
					: null,
		};
	},

	/**
	 * Get all archived accounts for a user
	 */
	async getArchivedAccounts(userId: string) {
		return await prisma.account.findMany({
			where: {
				userId,
				isArchived: true,
			},
			orderBy: {
				name: 'asc',
			},
		});
	},

	/**
	 * Get a single account by ID
	 */
	async getAccountById(userId: string, accountId: string) {
		return await prisma.account.findUnique({
			where: { id: accountId, userId },
		});
	},

	/**
	 * Get account details with all related transactions (Ledger)
	 */
	async getAccountWithTransactions(userId: string, accountId: string) {
		const account = await prisma.account.findUnique({
			where: { id: accountId, userId },
		});

		if (!account) return null;

		const [incomes, expenses, transfersFrom, transfersTo] =
			await Promise.all([
				prisma.income.findMany({
					where: { accountId, userId },
					include: { category: true },
					orderBy: { date: 'desc' },
				}),
				prisma.expense.findMany({
					where: { accountId, userId },
					include: { category: true },
					orderBy: { date: 'desc' },
				}),
				prisma.transfer.findMany({
					where: { fromAccountId: accountId, userId },
					include: { toAccount: { select: { name: true, isLiability: true } } },
					orderBy: { date: 'desc' },
				}),
				prisma.transfer.findMany({
					where: { toAccountId: accountId, userId },
					include: { fromAccount: { select: { name: true, isLiability: true } } },
					orderBy: { date: 'desc' },
				}),
			]);

		// Normalize and merge transactions
		const transactions = [
			...incomes.map((i) => ({
				id: i.id,
				date: i.date,
				amount: i.amount,
				type: 'INCOME' as const,
				description: i.description,
				categoryName: i.category.name,
				relatedAccountName: undefined,
			})),
			...expenses.map((e) => ({
				id: e.id,
				date: e.date,
				amount: e.amount,
				type: 'EXPENSE' as const,
				description: e.description,
				categoryName: e.category.name,
				relatedAccountName: undefined,
			})),
			...transfersFrom.map((t) => {
				// If transferring TO a liability, it's a debt payment
				const isPayment = t.toAccount.isLiability;
				return {
					id: t.id,
					date: t.date,
					amount: t.amount,
					type: isPayment ? ('PAYMENT_OUT' as const) : ('TRANSFER_OUT' as const),
					description: t.description,
					categoryName: isPayment ? 'Debt Payment' : 'Transfer Out',
					relatedAccountName: t.toAccount.name,
				};
			}),
			...transfersTo.map((t) => {
				// If receiving FROM an asset to this liability, it's a payment received
				const isPayment = account.isLiability && !t.fromAccount.isLiability;
				return {
					id: t.id,
					date: t.date,
					amount: t.amount,
					type: isPayment ? ('PAYMENT_IN' as const) : ('TRANSFER_IN' as const),
					description: t.description,
					categoryName: isPayment ? 'Payment Received' : 'Transfer In',
					relatedAccountName: t.fromAccount.name,
				};
			}),
		].sort((a, b) => b.date.getTime() - a.date.getTime());

		// Calculate running balance
		let currentBalance = account.balance;
		const isLiability = account.isLiability;
		type LedgerTransaction = (typeof transactions)[number] & {
			runningBalance: Prisma.Decimal;
		};
		type LedgerRow =
			| LedgerTransaction
			| {
					id: string;
					date: Date;
					amount: Prisma.Decimal;
					type: 'OPENING';
					description: string | null;
					categoryName: undefined;
					relatedAccountName: undefined;
					runningBalance: Prisma.Decimal;
			  };
		const transactionsWithBalance: LedgerRow[] = transactions.map((t) => {
			const runningBalance = currentBalance;
			// Reverse calculation to find balance before this transaction (for the next iteration)
			// For liabilities: expense INCREASES debt, income/transfer-in DECREASES debt
			// For assets: expense DECREASES balance, income/transfer-in INCREASES balance
			if (isLiability) {
				if (['EXPENSE', 'TRANSFER_OUT', 'PAYMENT_OUT'].includes(t.type)) {
					currentBalance = currentBalance.minus(t.amount);
				} else {
					currentBalance = currentBalance.plus(t.amount);
				}
			} else {
				if (['EXPENSE', 'TRANSFER_OUT', 'PAYMENT_OUT'].includes(t.type)) {
					currentBalance = currentBalance.plus(t.amount);
				} else {
					currentBalance = currentBalance.minus(t.amount);
				}
			}
			return { ...t, runningBalance };
		});

		// Append synthetic OPENING row at the end (oldest position) so users can
		// see the starting balance without writing a real Income/Expense row.
		if (account.openingBalance !== null) {
			transactionsWithBalance.push({
				id: `opening-${account.id}`,
				type: 'OPENING' as const,
				amount: account.openingBalance,
				description: 'Opening Balance',
				date: account.createdAt,
				categoryName: undefined,
				relatedAccountName: undefined,
				runningBalance: account.openingBalance,
			});
		}

		return {
			...account,
			transactions: transactionsWithBalance,
		};
	},

	/**
	 * Update an account
	 */
	async updateAccount(userId: string, data: UpdateAccountInput) {
		const { id, ...updateData } = data;
		return await prisma.account.update({
			where: { id, userId },
			data: updateData,
		});
	},

	/**
	 * Archive an account (soft delete)
	 * Preserves transaction history while hiding from active views
	 */
	async archiveAccount(userId: string, accountId: string) {
		return await prisma.account.update({
			where: { id: accountId, userId },
			data: { isArchived: true },
		});
	},

	/**
	 * Restore an archived account
	 */
	async restoreAccount(userId: string, accountId: string) {
		return await prisma.account.update({
			where: { id: accountId, userId },
			data: { isArchived: false },
		});
	},

	/**
	 * Permanently delete an account
	 * WARNING: Use archiveAccount instead for data integrity
	 * This will fail if there are related transactions (Restrict)
	 */
	async deleteAccount(userId: string, accountId: string) {
		return await prisma.account.delete({
			where: { id: accountId, userId },
		});
	},
};
