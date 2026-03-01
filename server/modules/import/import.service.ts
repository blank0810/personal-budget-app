import prisma from '@/lib/prisma';
import { ImportTransaction, ImportResult } from './import.types';
import { createId } from '@paralleldrive/cuid2';

export const ImportService = {
	/**
	 * Batch import transactions atomically.
	 * Entire operation wrapped in a single $transaction — if anything fails, all roll back.
	 * Sets source: 'IMPORT' and a shared importBatchId on all records.
	 */
	async batchImport(
		userId: string,
		accountId: string,
		transactions: ImportTransaction[]
	): Promise<ImportResult> {
		const importBatchId = createId();

		const account = await prisma.account.findUnique({
			where: { id: accountId, userId },
			select: { isLiability: true },
		});

		if (!account) throw new Error('Account not found');

		const incomes = transactions.filter((t) => t.type === 'INCOME');
		const expenses = transactions.filter((t) => t.type === 'EXPENSE');

		await prisma.$transaction(async (tx) => {
			// Create income records
			if (incomes.length > 0) {
				await tx.income.createMany({
					data: incomes.map((t) => ({
						amount: t.amount,
						description: t.description,
						date: t.date,
						categoryId: t.categoryId,
						accountId: t.accountId,
						userId,
						source: 'IMPORT' as const,
						importBatchId,
					})),
				});
			}

			// Create expense records
			if (expenses.length > 0) {
				await tx.expense.createMany({
					data: expenses.map((t) => ({
						amount: t.amount,
						description: t.description,
						date: t.date,
						categoryId: t.categoryId,
						accountId: t.accountId,
						userId,
						source: 'IMPORT' as const,
						importBatchId,
					})),
				});
			}

			// Recalculate account balance
			const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);
			const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);

			if (account.isLiability) {
				// Liability: income reduces debt, expense increases debt
				await tx.account.update({
					where: { id: accountId },
					data: {
						balance: {
							increment: totalExpense - totalIncome,
						},
					},
				});
			} else {
				// Asset: income increases balance, expense decreases balance
				await tx.account.update({
					where: { id: accountId },
					data: {
						balance: {
							increment: totalIncome - totalExpense,
						},
					},
				});
			}
		});

		return {
			imported: transactions.length,
			skipped: 0,
			importBatchId,
		};
	},

	/**
	 * Detect potential duplicates by matching date + amount + accountId.
	 */
	async detectDuplicates(
		userId: string,
		accountId: string,
		transactions: ImportTransaction[]
	): Promise<Set<number>> {
		const duplicateIndices = new Set<number>();

		// Fetch existing transactions for the date range
		const dates = transactions.map((t) => t.date);
		const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
		const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

		const [existingIncomes, existingExpenses] = await Promise.all([
			prisma.income.findMany({
				where: {
					userId,
					accountId,
					date: { gte: minDate, lte: maxDate },
				},
				select: { date: true, amount: true },
			}),
			prisma.expense.findMany({
				where: {
					userId,
					accountId,
					date: { gte: minDate, lte: maxDate },
				},
				select: { date: true, amount: true },
			}),
		]);

		// Build a set of existing date+amount keys
		const existingKeys = new Set<string>();
		for (const inc of existingIncomes) {
			existingKeys.add(
				`${inc.date.toISOString().slice(0, 10)}|${Number(inc.amount)}`
			);
		}
		for (const exp of existingExpenses) {
			existingKeys.add(
				`${exp.date.toISOString().slice(0, 10)}|${Number(exp.amount)}`
			);
		}

		// Check each transaction
		for (let i = 0; i < transactions.length; i++) {
			const t = transactions[i];
			const key = `${t.date.toISOString().slice(0, 10)}|${t.amount}`;
			if (existingKeys.has(key)) {
				duplicateIndices.add(i);
			}
		}

		return duplicateIndices;
	},

	/**
	 * Undo an import by deleting all records with the given importBatchId.
	 * Wrapped in $transaction to atomically delete + recalculate balance.
	 */
	async undoImport(userId: string, importBatchId: string): Promise<number> {
		return prisma.$transaction(async (tx) => {
			// Find all imported incomes and expenses
			const [incomes, expenses] = await Promise.all([
				tx.income.findMany({
					where: { userId, importBatchId },
					select: { amount: true, accountId: true },
				}),
				tx.expense.findMany({
					where: { userId, importBatchId },
					select: { amount: true, accountId: true },
				}),
			]);

			const totalRecords = incomes.length + expenses.length;
			if (totalRecords === 0) return 0;

			// Delete records
			await Promise.all([
				tx.income.deleteMany({ where: { userId, importBatchId } }),
				tx.expense.deleteMany({ where: { userId, importBatchId } }),
			]);

			// Reverse balance changes per account
			const balanceChanges = new Map<
				string,
				{ income: number; expense: number }
			>();

			for (const inc of incomes) {
				if (!inc.accountId) continue;
				const entry = balanceChanges.get(inc.accountId) || {
					income: 0,
					expense: 0,
				};
				entry.income += Number(inc.amount);
				balanceChanges.set(inc.accountId, entry);
			}

			for (const exp of expenses) {
				if (!exp.accountId) continue;
				const entry = balanceChanges.get(exp.accountId) || {
					income: 0,
					expense: 0,
				};
				entry.expense += Number(exp.amount);
				balanceChanges.set(exp.accountId, entry);
			}

			// Reverse balance for each affected account
			for (const [accountId, changes] of balanceChanges) {
				const account = await tx.account.findUnique({
					where: { id: accountId },
					select: { isLiability: true },
				});

				if (account?.isLiability) {
					await tx.account.update({
						where: { id: accountId },
						data: {
							balance: {
								decrement: changes.expense - changes.income,
							},
						},
					});
				} else {
					await tx.account.update({
						where: { id: accountId },
						data: {
							balance: {
								decrement: changes.income - changes.expense,
							},
						},
					});
				}
			}

			return totalRecords;
		});
	},
};
