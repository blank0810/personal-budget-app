import prisma from '@/lib/prisma';
import {
	CategoryBreakdown,
	MonthlySummary,
	FinancialStatement,
	DashboardKPIs,
	NetWorthHistoryPoint,
} from './report.types';
import {
	endOfMonth,
	eachMonthOfInterval,
	format,
	differenceInDays,
	subDays,
	isSameDay,
	startOfDay,
	isAfter,
	isBefore,
	endOfDay,
} from 'date-fns';

export const ReportService = {
	/**
	 * Get spending breakdown by category for a specific period
	 */
	async getCategoryBreakdown(
		userId: string,
		startDate: Date,
		endDate: Date
	): Promise<CategoryBreakdown[]> {
		const expenses = await prisma.expense.groupBy({
			by: ['categoryId'],
			where: {
				userId,
				date: {
					gte: startDate,
					lte: endDate,
				},
			},
			_sum: {
				amount: true,
			},
		});

		const totalExpense = expenses.reduce(
			(sum, item) => sum + (item._sum.amount?.toNumber() || 0),
			0
		);

		// Fetch category details
		const categories = await prisma.category.findMany({
			where: {
				id: { in: expenses.map((e) => e.categoryId) },
			},
		});

		const breakdown = expenses.map((item) => {
			const category = categories.find((c) => c.id === item.categoryId);
			const amount = item._sum.amount?.toNumber() || 0;
			return {
				categoryId: item.categoryId,
				categoryName: category?.name || 'Unknown',
				color: category?.color,
				icon: category?.icon,
				amount,
				percentage:
					totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
			};
		});

		return breakdown.sort((a, b) => b.amount - a.amount);
	},

	/**
	 * Get monthly income vs expense summary for a range
	 */
	async getMonthlyComparison(
		userId: string,
		startDate: Date,
		endDate: Date
	): Promise<MonthlySummary[]> {
		const months = eachMonthOfInterval({ start: startDate, end: endDate });
		const summary: MonthlySummary[] = [];

		for (const monthStart of months) {
			const monthEnd = endOfMonth(monthStart);

			const [income, expense] = await Promise.all([
				prisma.income.aggregate({
					where: {
						userId,
						date: { gte: monthStart, lte: monthEnd },
					},
					_sum: { amount: true },
				}),
				prisma.expense.aggregate({
					where: {
						userId,
						date: { gte: monthStart, lte: monthEnd },
					},
					_sum: { amount: true },
				}),
			]);

			const incomeAmount = income._sum.amount?.toNumber() || 0;
			const expenseAmount = expense._sum.amount?.toNumber() || 0;

			summary.push({
				month: format(monthStart, 'MMM yyyy'),
				income: incomeAmount,
				expense: expenseAmount,
				savings: incomeAmount - expenseAmount,
			});
		}

		return summary;
	},

	/**
	 * Get Budget vs Actual spending for a specific month
	 */
	async getBudgetVsActual(userId: string, month: Date) {
		const start = new Date(month.getFullYear(), month.getMonth(), 1);
		const end = endOfMonth(start);

		// 1. Fetch Budgets for this month
		const budgets = await prisma.budget.findMany({
			where: {
				userId,
				month: start,
			},
			include: { category: true },
		});

		// 2. Fetch Expenses for this month, grouped by category
		const expenses = await prisma.expense.groupBy({
			by: ['categoryId'],
			where: {
				userId,
				date: { gte: start, lte: end },
			},
			_sum: { amount: true },
		});

		// 3. Merge and Calculate Variance
		const report = budgets.map((budget) => {
			const expenseEntry = expenses.find(
				(e) => e.categoryId === budget.categoryId
			);
			const actual = expenseEntry?._sum.amount?.toNumber() || 0;
			const budgeted = budget.amount.toNumber();

			return {
				categoryId: budget.categoryId,
				categoryName: budget.category.name,
				color: budget.category.color,
				icon: budget.category.icon,
				budgeted,
				actual,
				variance: budgeted - actual, // Positive = Under budget (Good), Negative = Over budget (Bad)
				percentUsed: budgeted > 0 ? (actual / budgeted) * 100 : 0,
			};
		});

		// Add categories with expenses but NO budget? (Optional improvement for later)
		// For now, focusing on "Budget Performance" implies tracking what *was* budgeted.

		return report.sort((a, b) => b.percentUsed - a.percentUsed);
	},

	/**
	 * Get detailed Financial Statement (Income Statement) for a period
	 */
	async getFinancialStatement(
		userId: string,
		startDate: Date,
		endDate: Date
	): Promise<FinancialStatement> {
		// 1. Fetch Income
		const incomeGroups = await prisma.income.groupBy({
			by: ['categoryId'],
			where: {
				userId,
				date: { gte: startDate, lte: endDate },
			},
			_sum: { amount: true },
		});

		// 2. Fetch Expenses
		const expenseGroups = await prisma.expense.groupBy({
			by: ['categoryId'],
			where: {
				userId,
				date: { gte: startDate, lte: endDate },
			},
			_sum: { amount: true },
		});

		// 3. Fetch Category Details (for both income and expense)
		const categoryIds = [
			...incomeGroups.map((i) => i.categoryId),
			...expenseGroups.map((e) => e.categoryId),
		];
		const categories = await prisma.category.findMany({
			where: { id: { in: categoryIds } },
		});

		// 4. Format Income Items
		let totalIncome = 0;
		const incomeItems = incomeGroups
			.map((group) => {
				const category = categories.find(
					(c) => c.id === group.categoryId
				);
				const amount = group._sum.amount?.toNumber() || 0;
				totalIncome += amount;
				return {
					categoryId: group.categoryId,
					categoryName: category?.name || 'Unknown',
					amount,
					color: category?.color,
					icon: category?.icon,
				};
			})
			.sort((a, b) => b.amount - a.amount);

		// 5. Format Expense Items
		let totalExpense = 0;
		const expenseItems = expenseGroups
			.map((group) => {
				const category = categories.find(
					(c) => c.id === group.categoryId
				);
				const amount = group._sum.amount?.toNumber() || 0;
				totalExpense += amount;
				return {
					categoryId: group.categoryId,
					categoryName: category?.name || 'Unknown',
					amount,
					color: category?.color,
					icon: category?.icon,
				};
			})
			.sort((a, b) => b.amount - a.amount);

		const netIncome = totalIncome - totalExpense;
		const savingsRate =
			totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0;

		return {
			income: incomeItems,
			totalIncome,
			expenses: expenseItems,
			totalExpense,
			netIncome,
			savingsRate,
		};
	},

	async getDashboardKPIs(
		userId: string,
		startDate: Date,
		endDate: Date
	): Promise<DashboardKPIs> {
		// Calculate previous period
		const daysDiff = differenceInDays(endDate, startDate) + 1;
		const prevEndDate = subDays(startDate, 1);
		const prevStartDate = subDays(prevEndDate, daysDiff - 1);

		// Helper to get metrics for a specific range
		const getMetrics = async (start: Date, end: Date) => {
			const [income, expense] = await Promise.all([
				prisma.income.aggregate({
					where: { userId, date: { gte: start, lte: end } },
					_sum: { amount: true },
				}),
				prisma.expense.aggregate({
					where: { userId, date: { gte: start, lte: end } },
					_sum: { amount: true },
				}),
			]);

			const incomeVal = income._sum.amount?.toNumber() || 0;
			const expenseVal = expense._sum.amount?.toNumber() || 0;
			const netVal = incomeVal - expenseVal;
			const savingsRate = incomeVal > 0 ? (netVal / incomeVal) * 100 : 0;

			return {
				income: incomeVal,
				expense: expenseVal,
				net: netVal,
				savingsRate,
			};
		};

		const current = await getMetrics(startDate, endDate);
		const previous = await getMetrics(prevStartDate, prevEndDate);

		// Helper to calculate change and sparkline
		const calcMetric = (
			curr: number,
			prev: number
		): { change: number; trend: 'up' | 'down' | 'neutral' } => {
			const change =
				prev !== 0 ? ((curr - prev) / Math.abs(prev)) * 100 : 0;
			const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
			return { change, trend };
		};

		// 6-period History for Sparklines (monthly granularity roughly inferred from range)
		// For simplicity, we'll just pull last 6 months equivalent segments relative to end date
		const historyPoints = [];
		for (let i = 5; i >= 0; i--) {
			// Create 6 equally sized buckets going back
			const end = subDays(endDate, i * daysDiff);
			const start = subDays(end, daysDiff - 1);
			const metrics = await getMetrics(start, end);
			historyPoints.push(metrics);
		}

		return {
			netIncome: {
				value: current.net,
				...calcMetric(current.net, previous.net),
				history: historyPoints.map((h) => h.net),
			},
			totalIncome: {
				value: current.income,
				...calcMetric(current.income, previous.income),
				history: historyPoints.map((h) => h.income),
			},
			totalExpenses: {
				value: current.expense,
				...calcMetric(current.expense, previous.expense),
				history: historyPoints.map((h) => h.expense),
			},
			savingsRate: {
				value: current.savingsRate,
				change: current.savingsRate - previous.savingsRate, // Absolute point change for %
				trend:
					current.savingsRate > previous.savingsRate ? 'up' : 'down',
				history: historyPoints.map((h) => h.savingsRate),
			},
		};
	},

	/**
	 * Get Net Worth History by daily intervals
	 * Calculates historical balances by reverse-playing transactions from current state
	 */
	async getNetWorthHistory(
		userId: string,
		startDate: Date,
		endDate: Date
	): Promise<NetWorthHistoryPoint[]> {
		// 1. Get Current Account Balances
		const accounts = await prisma.account.findMany({
			where: { userId },
		});

		// Map to track running balances: [accountId]: balance (number)
		const balances = new Map<string, number>();
		accounts.forEach((acc) => {
			balances.set(acc.id, acc.balance.toNumber());
		});

		// 2. Fetch ALL transactions from Now backwards to startDate
		// We need everything > startDate to reverse-engineer the starting point
		const [incomes, expenses, transfers] = await Promise.all([
			prisma.income.findMany({
				where: { userId, date: { gte: startDate } },
				select: {
					amount: true,
					accountId: true,
					date: true,
				},
			}),
			prisma.expense.findMany({
				where: { userId, date: { gte: startDate } },
				select: {
					amount: true,
					accountId: true,
					date: true,
				},
			}),
			prisma.transfer.findMany({
				where: { userId, date: { gte: startDate } },
				select: {
					amount: true,
					fromAccountId: true,
					toAccountId: true,
					date: true,
				},
			}),
		]);

		// Combined Transaction Log
		type Tx = {
			type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
			amount: number;
			date: Date;
			accountId?: string | null;
			fromId?: string;
			toId?: string;
		};

		const allTxs: Tx[] = [
			...incomes.map((i) => ({
				type: 'INCOME' as const,
				amount: i.amount.toNumber(),
				date: i.date,
				accountId: i.accountId,
			})),
			...expenses.map((e) => ({
				type: 'EXPENSE' as const,
				amount: e.amount.toNumber(),
				date: e.date,
				accountId: e.accountId,
			})),
			...transfers.map((t) => ({
				type: 'TRANSFER' as const,
				amount: t.amount.toNumber(),
				date: t.date,
				fromId: t.fromAccountId,
				toId: t.toAccountId,
			})),
		].sort((a, b) => b.date.getTime() - a.date.getTime()); // DESC

		// 3. Iterate Days Backwards
		const history: NetWorthHistoryPoint[] = [];

		// We start from Today (or End of Data) and move back to startDate
		// Actually, we must start from "Now" because 'balances' are current.
		// If 'endDate' is in the past, we first reverse from Now to endDate without recording.
		// Then reverse from endDate to startDate while recording.

		/*
             Timeline:
             [StartDate] ............ [EndDate] ..... [Now]
             We have Balances @ Now.
             We have Txs from StartDate to Now.
             
             Step A: Reverse Txs from Now down to EndDate (exclusive of EndDate content? or inclusive?)
             We want the state AT EndDate (end of day).
             So we undo Txs that happened AFTER EndDate.
        */

		const now = new Date();
		// Normalize
		const endOfRun = startOfDay(now) < startOfDay(endDate) ? endDate : now;
		// Ideally we just process all sorted TXs.
		// We loop days from `endOfRun` down to `startDate`.

		let currentTxIndex = 0; // Pointer in allTxs (which is DESC)

		// Create array of days to process (DESC)
		const days: Date[] = [];
		let d = startOfDay(endOfRun);
		const start = startOfDay(startDate);

		while (d >= start) {
			days.push(new Date(d));
			d = subDays(d, 1);
		}

		// Helper to undo transaction effect
		const undoTx = (tx: Tx) => {
			if (tx.type === 'INCOME') {
				if (!tx.accountId) return; // Skip if no account linked
				// Income added to balance. Undo = Subtract.
				// For Liability (Debt), Income (Refund) DECREASES Debt.
				// Wait, "Balance" field in DB:
				// Asset=100. Income +50 -> Bal=150. Undo: 150-50=100.
				// Liability=100. Refund +50 -> Bal=50. Undo: 50-50=0? No.
				// If I owe 100, get 50 refund, I owe 50.
				// DB stores Debt as +50.
				// Undo: 50 + 50 = 100.
				// So for Liability, Income (Refund) is SUBTRACTED from Debt?
				// Let's verify standard: Amount is usually positive.
				// If Income (Refund) is processed as "Reduce Balance", then Undo is "Add Balance".
				// IF Income on Liability account works like that.
				// Assuming standard "Account Balance" math:
				// Asset: Bal += Amt.
				// Liability: Bal -= Amt (Debt reduces).
				// So Undo:
				// Asset: Bal -= Amt.
				// Liability: Bal += Amt.

				const accId = tx.accountId!;
				const acc = accounts.find((a) => a.id === accId);
				const currentBal = balances.get(accId) || 0;

				if (acc?.isLiability) {
					// Income reduced debt. Undo: Increase debt.
					balances.set(accId, currentBal + tx.amount);
				} else {
					// Income increased asset. Undo: Decrease asset.
					balances.set(accId, currentBal - tx.amount);
				}
			} else if (tx.type === 'EXPENSE') {
				if (!tx.accountId) return; // Skip if no account linked
				// Expense removed from balance. Undo = Add.
				// Asset: Bal -= Amt. Undo: Bal += Amt.
				// Liability: Bal += Amt (Debt grows). Undo: Bal -= Amt.

				const accId = tx.accountId!;
				const acc = accounts.find((a) => a.id === accId);
				const currentBal = balances.get(accId) || 0;

				if (acc?.isLiability) {
					balances.set(accId, currentBal - tx.amount);
				} else {
					balances.set(accId, currentBal + tx.amount);
				}
			} else if (tx.type === 'TRANSFER') {
				// From A (Asset) to B (Liability) [Payment]
				// A: Bal -= Amt.
				// B: Bal -= Amt (Debt reduces).
				// Undo:
				// A: Bal += Amt.
				// B: Bal += Amt (Debt increases).

				//From A (Asset) to B (Asset) [Savings]
				// A: Bal -= Amt.
				// B: Bal += Amt.
				// Undo:
				// A: Bal += Amt.
				// B: Bal -= Amt.

				const fromId = tx.fromId!;
				const toId = tx.toId!;
				const fromAcc = accounts.find((a) => a.id === fromId);
				const toAcc = accounts.find((a) => a.id === toId);

				const fromBal = balances.get(fromId) || 0;
				const toBal = balances.get(toId) || 0;

				// Undo From Side (Sender)
				if (fromAcc?.isLiability) {
					// Sent from CC? (Cash Advance?) Debt increased.
					// Undo: Debt decreases.
					balances.set(fromId, fromBal - tx.amount);
				} else {
					// Sent from Bank. Asset decreased.
					// Undo: Asset increases.
					balances.set(fromId, fromBal + tx.amount);
				}

				// Undo To Side (Receiver)
				if (toAcc?.isLiability) {
					// Sent to CC (Payment). Debt decreased.
					// Undo: Debt increases.
					balances.set(toId, toBal + tx.amount);
				} else {
					// Sent to Savings. Asset increased.
					// Undo: Asset decreases.
					balances.set(toId, toBal - tx.amount);
				}
			}
		};

		// 4. Processing Loop
		// 'days' is [Future -> Past].
		// But we need to handle transactions that are AFTER the current 'day' we are snapshotting?
		// No, we start with Current Balance (after ALL transactions).
		// We need to undo transactions day by day backwards.

		// Optimization:
		// First undo all transactions that are newer than 'days[0]' (if any).
		while (
			currentTxIndex < allTxs.length &&
			isAfter(allTxs[currentTxIndex].date, endOfDay(days[0]))
		) {
			undoTx(allTxs[currentTxIndex]);
			currentTxIndex++;
		}

		// Now loop through days.
		// For each day D, we capture the Balance "At End of D".
		// To get "End of D", we must be sure we haven't undone D's transactions yet?
		// Wait, if we undo D's transactions, we get "Start of D" (or End of D-1).
		// So sequence:
		// 1. Snapshot Current (which is End of D).
		// 2. Undo D's transactions.
		// 3. Move to D-1.

		for (const day of days) {
			// 1. Calculate Aggregates for End of 'day'
			let totalAssets = 0;
			let totalLiabilities = 0;

			balances.forEach((bal, accId) => {
				const acc = accounts.find((a) => a.id === accId);
				if (acc?.isLiability) {
					totalLiabilities += bal;
				} else {
					totalAssets += bal;
				}
			});

			history.push({
				date: format(day, 'yyyy-MM-dd'),
				assets: totalAssets,
				liabilities: totalLiabilities,
				netWorth: totalAssets - totalLiabilities,
			});

			// 2. Undo transactions that happened ON this day
			while (
				currentTxIndex < allTxs.length &&
				isSameDay(allTxs[currentTxIndex].date, day)
			) {
				undoTx(allTxs[currentTxIndex]);
				currentTxIndex++;
			}
		}

		// Filter history to requests range?
		// Our loop generated points for 'days' which is exactly the range asked + gap to now.
		// Filter strictly to start/end requested.
		return history
			.filter(
				(h) =>
					new Date(h.date) >= startDate && new Date(h.date) <= endDate
			)
			.reverse(); // Return Chronological
	},
};
