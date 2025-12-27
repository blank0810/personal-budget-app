import prisma from '@/lib/prisma';
import {
	CreateAccountInput,
	GetAccountsInput,
	UpdateAccountInput,
} from './account.types';

export const AccountService = {
	/**
	 * Create a new account
	 */
	async createAccount(userId: string, data: CreateAccountInput) {
		return await prisma.account.create({
			data: {
				...data,
				userId,
			},
		});
	},

	/**
	 * Get all accounts for a user
	 */
	async getAccounts(userId: string, filters?: GetAccountsInput) {
		return await prisma.account.findMany({
			where: {
				userId,
				type: filters?.type,
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
					include: { toAccount: true },
					orderBy: { date: 'desc' },
				}),
				prisma.transfer.findMany({
					where: { toAccountId: accountId, userId },
					include: { fromAccount: true },
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
			...transfersFrom.map((t) => ({
				id: t.id,
				date: t.date,
				amount: t.amount,
				type: 'TRANSFER_OUT' as const,
				description: t.description,
				categoryName: 'Transfer Out',
				relatedAccountName: t.toAccount.name,
			})),
			...transfersTo.map((t) => ({
				id: t.id,
				date: t.date,
				amount: t.amount,
				type: 'TRANSFER_IN' as const,
				description: t.description,
				categoryName: 'Transfer In',
				relatedAccountName: t.fromAccount.name,
			})),
		].sort((a, b) => b.date.getTime() - a.date.getTime());

		// Calculate running balance
		let currentBalance = account.balance;
		const transactionsWithBalance = transactions.map((t) => {
			const runningBalance = currentBalance;
			// Reverse calculation to find balance before this transaction (for the next iteration)
			if (['EXPENSE', 'TRANSFER_OUT'].includes(t.type)) {
				currentBalance = currentBalance.plus(t.amount);
			} else {
				currentBalance = currentBalance.minus(t.amount);
			}
			return { ...t, runningBalance };
		});

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
	 * Delete an account
	 * WARNING: This might fail if there are related transactions (Restrict)
	 */
	async deleteAccount(userId: string, accountId: string) {
		return await prisma.account.delete({
			where: { id: accountId, userId },
		});
	},
};
