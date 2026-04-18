import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
	type TransactionFilterInput,
	type UnifiedTransaction,
	type TransactionSummary,
	type PaginatedTransactions,
	type BulkDeleteInput,
	type BulkCategorizeInput,
	type BulkOperationResult,
} from './transaction.types';
import { IncomeService } from '../income/income.service';
import { ExpenseService } from '../expense/expense.service';
import { TransferService } from '../transfer/transfer.service';

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

	/**
	 * Bulk delete transactions. Atomic — any single failure rolls back the
	 * entire batch. See docs/plans/2026-04-17-bulk-actions-transactions-pilot-design.md.
	 *
	 * Defense-in-depth filters applied BEFORE the Prisma transaction opens:
	 *   - INCOME rows with linked child transfers (tithe / EF) are skipped
	 *   - TRANSFER rows with fee > 0 are skipped
	 * Skipped rows are reported back so the UI can show a "N items skipped"
	 * banner.
	 */
	async bulkDelete(
		userId: string,
		input: BulkDeleteInput
	): Promise<BulkOperationResult> {
		const requestedCount = input.items.length;

		const incomeIds = input.items
			.filter((i) => i.kind === 'income')
			.map((i) => i.id);
		const expenseIds = input.items
			.filter((i) => i.kind === 'expense')
			.map((i) => i.id);
		const transferIds = input.items
			.filter((i) => i.kind === 'transfer')
			.map((i) => i.id);

		// Pre-flight: identify ineligible rows for the defense filters.
		//
		// For INCOME rows we have to catch TWO populations:
		//   (a) incomes with real linked child transfers via parentIncomeId
		//       (post-P0-1 code path)
		//   (b) pre-P0-1 incomes whose child transfers exist in the DB but
		//       couldn't be backfilled unambiguously — their parentIncomeId
		//       stays null. Query the description-suffix signature on the
		//       same (userId, fromAccountId, date) the backfill used so these
		//       "orphan candidates" are skipped too.
		const [protectedIncomesLinked, orphanCandidates, feeTransfers] =
			await Promise.all([
				incomeIds.length > 0
					? prisma.income.findMany({
							where: {
								id: { in: incomeIds },
								userId,
								childTransfers: { some: {} },
							},
							select: { id: true },
						})
					: [],
				incomeIds.length > 0
					? prisma.income.findMany({
							where: {
								id: { in: incomeIds },
								userId,
								childTransfers: { none: {} },
							},
							select: {
								id: true,
								accountId: true,
								date: true,
							},
						})
					: [],
				transferIds.length > 0
					? prisma.transfer.findMany({
							where: {
								id: { in: transferIds },
								userId,
								fee: { gt: 0 },
							},
							select: { id: true },
						})
					: [],
			]);

		// For each candidate without a linked childTransfer, check whether a
		// tithe/EF-signature transfer exists on the same (userId, fromAccount,
		// date). If yes, it's a backfill-orphan and we skip.
		const protectedOrphanIds: string[] = [];
		for (const candidate of orphanCandidates) {
			if (!candidate.accountId) continue;
			const orphan = await prisma.transfer.findFirst({
				where: {
					userId,
					fromAccountId: candidate.accountId,
					date: candidate.date,
					parentIncomeId: null,
					OR: [
						{ description: { startsWith: 'Tithe for ' } },
						{
							description: {
								startsWith: 'Emergency Fund contribution for ',
							},
						},
					],
				},
				select: { id: true },
			});
			if (orphan) protectedOrphanIds.push(candidate.id);
		}

		const protectedIncomes = [
			...protectedIncomesLinked,
			...protectedOrphanIds.map((id) => ({ id })),
		];

		const skippedReasons: Array<{ id: string; reason: string }> = [
			...protectedIncomes.map((r) => ({
				id: r.id,
				reason: 'linked tithe or emergency fund allocation',
			})),
			...feeTransfers.map((r) => ({
				id: r.id,
				reason: 'transfer has a fee',
			})),
		];
		const skippedIds = new Set(skippedReasons.map((r) => r.id));

		const eligibleIncomeIds = incomeIds.filter((id) => !skippedIds.has(id));
		const eligibleExpenseIds = expenseIds;
		const eligibleTransferIds = transferIds.filter(
			(id) => !skippedIds.has(id)
		);
		const processedCount =
			eligibleIncomeIds.length +
			eligibleExpenseIds.length +
			eligibleTransferIds.length;

		if (processedCount === 0) {
			return {
				requestedCount,
				processedCount: 0,
				skippedCount: skippedReasons.length,
				skippedReasons,
			};
		}

		await prisma.$transaction(
			async (tx) => {
				for (const id of eligibleIncomeIds) {
					await IncomeService._deleteIncomeInTx(tx, userId, id);
				}
				for (const id of eligibleExpenseIds) {
					await ExpenseService._deleteExpenseInTx(tx, userId, id);
				}
				for (const id of eligibleTransferIds) {
					await TransferService._deleteTransferInTx(tx, userId, id);
				}

				// Audit row — foundation for future undo; not read anywhere yet.
				await tx.bulkOperation.create({
					data: {
						userId,
						kind: 'DELETE',
						itemCount: processedCount,
						payload: {
							income: eligibleIncomeIds,
							expense: eligibleExpenseIds,
							transfer: eligibleTransferIds,
							skipped: skippedReasons,
						} as Prisma.InputJsonValue,
					},
				});
			},
			{ timeout: 30000 }
		);

		return {
			requestedCount,
			processedCount,
			skippedCount: skippedReasons.length,
			skippedReasons,
		};
	},

	/**
	 * Bulk reassign categoryId on INCOME / EXPENSE rows. Transfers have no
	 * category and are silently skipped.
	 */
	async bulkCategorize(
		userId: string,
		input: BulkCategorizeInput
	): Promise<BulkOperationResult> {
		const requestedCount = input.items.length;

		// Category ownership check — prevents a malicious client from moving
		// rows into another user's category via id enumeration.
		const category = await prisma.category.findUnique({
			where: { id: input.categoryId, userId },
			select: { id: true, type: true },
		});
		if (!category) {
			throw new Error('Category not found');
		}

		const incomeIds = input.items
			.filter((i) => i.kind === 'income')
			.map((i) => i.id);
		const expenseIds = input.items
			.filter((i) => i.kind === 'expense')
			.map((i) => i.id);
		const transferIds = input.items
			.filter((i) => i.kind === 'transfer')
			.map((i) => i.id);

		const skippedReasons: Array<{ id: string; reason: string }> =
			transferIds.map((id) => ({
				id,
				reason: 'transfers have no category',
			}));

		// Mismatched category type (INCOME category on EXPENSE row, etc.)
		// is a user error — block the whole batch rather than silently split.
		if (category.type === 'INCOME' && expenseIds.length > 0) {
			throw new Error(
				'Cannot assign an Income category to Expense rows'
			);
		}
		if (category.type === 'EXPENSE' && incomeIds.length > 0) {
			throw new Error(
				'Cannot assign an Expense category to Income rows'
			);
		}

		const processedCount = incomeIds.length + expenseIds.length;

		if (processedCount === 0) {
			return {
				requestedCount,
				processedCount: 0,
				skippedCount: skippedReasons.length,
				skippedReasons,
			};
		}

		await prisma.$transaction(
			async (tx) => {
				if (incomeIds.length > 0) {
					await tx.income.updateMany({
						where: { id: { in: incomeIds }, userId },
						data: { categoryId: input.categoryId },
					});
				}
				if (expenseIds.length > 0) {
					await tx.expense.updateMany({
						where: { id: { in: expenseIds }, userId },
						data: { categoryId: input.categoryId },
					});
				}

				await tx.bulkOperation.create({
					data: {
						userId,
						kind: 'CATEGORIZE',
						itemCount: processedCount,
						payload: {
							income: incomeIds,
							expense: expenseIds,
							categoryId: input.categoryId,
							skipped: skippedReasons,
						} as Prisma.InputJsonValue,
					},
				});
			},
			{ timeout: 30000 }
		);

		return {
			requestedCount,
			processedCount,
			skippedCount: skippedReasons.length,
			skippedReasons,
		};
	},
};
