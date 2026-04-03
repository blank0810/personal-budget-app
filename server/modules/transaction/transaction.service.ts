import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
	type TransactionFilterInput,
	type UnifiedTransaction,
	type TransactionSummary,
	type PaginatedTransactions,
} from './transaction.types';

export const TransactionService = {
	/**
	 * Fetch unified transactions across Income, Expense, and Transfer tables.
	 * Type filter optimization: only queries the relevant table(s).
	 * Payment = transfer where toAccount.isLiability === true.
	 */
	async getUnifiedTransactions(
		userId: string,
		filters: TransactionFilterInput
	): Promise<PaginatedTransactions> {
		const {
			type,
			categoryId,
			accountId,
			search,
			source,
			amountMin,
			amountMax,
			startDate,
			endDate,
			page,
			pageSize,
			sortBy,
			sortOrder,
		} = filters;

		const dateFilter = {
			...(startDate && { gte: startDate }),
			...(endDate && { lte: endDate }),
		};
		const hasDateFilter = startDate || endDate;

		const amountFilter: Prisma.DecimalFilter | undefined =
			amountMin !== undefined || amountMax !== undefined
				? {
						...(amountMin !== undefined && { gte: amountMin }),
						...(amountMax !== undefined && { lte: amountMax }),
					}
				: undefined;

		const searchFilter = search
			? { contains: search, mode: 'insensitive' as const }
			: undefined;

		// ---------------------------------------------------------------
		// Determine which tables to query based on type filter
		// ---------------------------------------------------------------
		const queryIncome = !type || type === 'income';
		const queryExpense = !type || type === 'expense';
		const queryTransfer = !type || type === 'transfer' || type === 'payment';

		// ---------------------------------------------------------------
		// Build queries in parallel
		// ---------------------------------------------------------------
		const [incomes, expenses, transfers] = await Promise.all([
			queryIncome
				? prisma.income.findMany({
						where: {
							userId,
							...(hasDateFilter && { date: dateFilter }),
							...(categoryId && { categoryId }),
							...(accountId && { accountId }),
							...(searchFilter && { description: searchFilter }),
							...(source && { source }),
							...(amountFilter && { amount: amountFilter }),
						},
						include: { category: true, account: true },
						orderBy: { date: 'desc' },
					})
				: [],
			queryExpense
				? prisma.expense.findMany({
						where: {
							userId,
							...(hasDateFilter && { date: dateFilter }),
							...(categoryId && { categoryId }),
							...(accountId && { accountId }),
							...(searchFilter && { description: searchFilter }),
							...(source && { source }),
							...(amountFilter && { amount: amountFilter }),
						},
						include: { category: true, account: true, budget: true },
						orderBy: { date: 'desc' },
					})
				: [],
			queryTransfer
				? prisma.transfer.findMany({
						where: {
							userId,
							...(hasDateFilter && { date: dateFilter }),
							...(accountId && {
								OR: [
									{ fromAccountId: accountId },
									{ toAccountId: accountId },
								],
							}),
							...(searchFilter && { description: searchFilter }),
							...(amountFilter && { amount: amountFilter }),
							// Payment filter: only transfers to liability accounts
							...(type === 'payment' && {
								toAccount: { isLiability: true },
							}),
						},
						include: { fromAccount: true, toAccount: true },
						orderBy: { date: 'desc' },
					})
				: [],
		]);

		// ---------------------------------------------------------------
		// Map to UnifiedTransaction
		// ---------------------------------------------------------------
		const unified: UnifiedTransaction[] = [];

		for (const i of incomes) {
			unified.push({
				kind: 'income',
				id: i.id,
				amount: Number(i.amount),
				date: i.date.toISOString(),
				description: i.description,
				accountName: i.account?.name ?? null,
				categoryName: i.category.name,
				source: i.source,
			});
		}

		for (const e of expenses) {
			unified.push({
				kind: 'expense',
				id: e.id,
				amount: Number(e.amount),
				date: e.date.toISOString(),
				description: e.description,
				accountName: e.account?.name ?? null,
				categoryName: e.category.name,
				budgetName: e.budget?.name ?? null,
				source: e.source,
			});
		}

		for (const t of transfers) {
			const isPayment = t.toAccount.isLiability;
			// If filtering by 'transfer' only (not 'payment'), skip payments
			if (type === 'transfer' && isPayment) continue;
			unified.push({
				kind: 'transfer',
				id: t.id,
				amount: Number(t.amount),
				date: t.date.toISOString(),
				description: t.description,
				fromAccountName: t.fromAccount.name,
				toAccountName: t.toAccount.name,
				fee: Number(t.fee),
				isPayment,
			});
		}

		// ---------------------------------------------------------------
		// Sort
		// ---------------------------------------------------------------
		const multiplier = sortOrder === 'asc' ? 1 : -1;
		unified.sort((a, b) => {
			if (sortBy === 'date') {
				return multiplier * (new Date(a.date).getTime() - new Date(b.date).getTime());
			}
			if (sortBy === 'amount') {
				return multiplier * (a.amount - b.amount);
			}
			// description
			const aDesc = a.description ?? '';
			const bDesc = b.description ?? '';
			return multiplier * aDesc.localeCompare(bDesc);
		});

		// ---------------------------------------------------------------
		// Paginate (over-fetch-and-slice)
		// ---------------------------------------------------------------
		const total = unified.length;
		const start = (page - 1) * pageSize;
		const data = unified.slice(start, start + pageSize);

		return { data, total, page, pageSize };
	},

	/**
	 * Aggregate KPI summary for the date range.
	 * Ignores type/category filters — always shows full picture.
	 */
	async getTransactionSummary(
		userId: string,
		startDate?: Date,
		endDate?: Date
	): Promise<TransactionSummary> {
		const dateFilter = {
			...(startDate && { gte: startDate }),
			...(endDate && { lte: endDate }),
		};
		const hasDateFilter = startDate || endDate;

		const [incomeAgg, expenseAgg, incomeCount, expenseCount, transferCount] =
			await Promise.all([
				prisma.income.aggregate({
					where: { userId, ...(hasDateFilter && { date: dateFilter }) },
					_sum: { amount: true },
				}),
				prisma.expense.aggregate({
					where: { userId, ...(hasDateFilter && { date: dateFilter }) },
					_sum: { amount: true },
				}),
				prisma.income.count({
					where: { userId, ...(hasDateFilter && { date: dateFilter }) },
				}),
				prisma.expense.count({
					where: { userId, ...(hasDateFilter && { date: dateFilter }) },
				}),
				prisma.transfer.count({
					where: { userId, ...(hasDateFilter && { date: dateFilter }) },
				}),
			]);

		const totalIncome = Number(incomeAgg._sum.amount ?? 0);
		const totalExpenses = Number(expenseAgg._sum.amount ?? 0);
		const netFlow = totalIncome - totalExpenses;
		const transactionCount = incomeCount + expenseCount + transferCount;
		const averageAmount =
			transactionCount > 0 ? (totalIncome + totalExpenses) / transactionCount : 0;

		return { totalIncome, totalExpenses, netFlow, averageAmount, transactionCount };
	},
};
