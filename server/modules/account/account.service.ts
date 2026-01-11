import prisma from '@/lib/prisma';
import {
	CreateAccountInput,
	GetAccountsInput,
	UpdateAccountInput,
} from './account.types';
import { AccountType, Prisma } from '@prisma/client';

// System category name for opening balances
const OPENING_BALANCE_CATEGORY = '💰 Opening Balance';

export const AccountService = {
	/**
	 * Create a new account with optional Opening Balance income entry
	 *
	 * For asset accounts with balance > 0, creates an "Opening Balance" income
	 * to ensure financial statements are accurate from day one.
	 *
	 * For liability accounts, the balance IS the debt - no income entry needed.
	 */
	async createAccount(userId: string, data: CreateAccountInput) {
		const balance = data.balance || 0;
		const isLiability = data.isLiability || false;
		// Fund accounts should NOT create opening balance entries (like TITHE)
		const isFundAccount =
			data.type === AccountType.EMERGENCY_FUND ||
			data.type === AccountType.FUND;
		const needsOpeningBalanceEntry = balance > 0 && !isLiability && !isFundAccount;

		// Use transaction to ensure both account and income are created together
		return await prisma.$transaction(async (tx) => {
			// 1. Create the account
			const account = await tx.account.create({
				data: {
					...data,
					userId,
				},
			});

			// 2. For asset accounts with balance, create Opening Balance income
			if (needsOpeningBalanceEntry) {
				// Get or create the Opening Balance category
				let category = await tx.category.findFirst({
					where: {
						userId,
						name: OPENING_BALANCE_CATEGORY,
						type: 'INCOME',
					},
				});

				if (!category) {
					category = await tx.category.create({
						data: {
							name: OPENING_BALANCE_CATEGORY,
							type: 'INCOME',
							icon: '💰',
							color: '#16a34a', // Green
							userId,
						},
					});
				}

				// Create the opening balance income entry
				await tx.income.create({
					data: {
						amount: new Prisma.Decimal(balance),
						description: `Opening balance for ${data.name}`,
						date: new Date(),
						categoryId: category.id,
						accountId: account.id,
						userId,
					},
				});
			}

			return account;
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
