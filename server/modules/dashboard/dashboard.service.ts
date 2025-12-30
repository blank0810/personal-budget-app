import prisma from '@/lib/prisma';

export const DashboardService = {
	/**
	 * Calculate Net Worth (Assets - Liabilities)
	 */
	async getNetWorth(userId: string) {
		const accounts = await prisma.account.findMany({
			where: { userId },
			select: {
				balance: true,
				type: true,
				isLiability: true,
				creditLimit: true,
			},
		});

		let assets = 0;
		let liabilities = 0;

		for (const account of accounts) {
			const balance = Number(account.balance);
			if (!account.isLiability) {
				assets += balance;
			} else {
				// DEBT MODEL: Balance = Amount Owed
				liabilities += balance;
			}
		}

		return {
			netWorth: assets - liabilities,
			assets,
			liabilities,
		};
	},

	/**
	 * Get liquid assets only (excludes investments for runway calculation)
	 */
	async getLiquidAssets(userId: string) {
		const accounts = await prisma.account.findMany({
			where: {
				userId,
				isLiability: false,
				// Liquid account types (exclude INVESTMENT)
				type: { in: ['BANK', 'CASH', 'SAVINGS'] },
			},
			select: { balance: true },
		});

		return accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
	},

	/**
	 * Get Cash Flow (Income vs Expenses) for a period
	 */
	async getCashFlow(userId: string, startDate: Date, endDate: Date) {
		const [income, expenses] = await Promise.all([
			prisma.income.aggregate({
				where: { userId, date: { gte: startDate, lte: endDate } },
				_sum: { amount: true },
			}),
			prisma.expense.aggregate({
				where: { userId, date: { gte: startDate, lte: endDate } },
				_sum: { amount: true },
			}),
		]);

		return {
			income: income._sum.amount?.toNumber() || 0,
			expense: expenses._sum.amount?.toNumber() || 0,
		};
	},

	/**
	 * Get average monthly expenses over past N months
	 */
	async getAverageMonthlyExpense(userId: string, months: number = 3) {
		const now = new Date();
		const startDate = new Date(
			now.getFullYear(),
			now.getMonth() - months,
			1
		);
		const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

		const expenses = await prisma.expense.aggregate({
			where: {
				userId,
				date: { gte: startDate, lte: endDate },
			},
			_sum: { amount: true },
		});

		const totalExpense = expenses._sum.amount?.toNumber() || 0;

		// Calculate actual months covered
		const monthsCovered = Math.max(1, months);

		return totalExpense / monthsCovered;
	},

	/**
	 * Get Recent Transactions (Combined Income and Expense)
	 */
	async getRecentTransactions(userId: string, limit = 5) {
		const [incomes, expenses] = await Promise.all([
			prisma.income.findMany({
				where: { userId },
				take: limit,
				orderBy: { date: 'desc' },
				include: { category: true, account: true },
			}),
			prisma.expense.findMany({
				where: { userId },
				take: limit,
				orderBy: { date: 'desc' },
				include: { category: true, account: true },
			}),
		]);

		const transactions = [
			...incomes.map((i) => ({ ...i, type: 'INCOME' as const })),
			...expenses.map((e) => ({ ...e, type: 'EXPENSE' as const })),
		]
			.sort((a, b) => b.date.getTime() - a.date.getTime())
			.slice(0, limit);

		return transactions;
	},

	/**
	 * Get Account Balances
	 */
	async getAccountBalances(userId: string) {
		return await prisma.account.findMany({
			where: { userId },
			orderBy: { balance: 'desc' },
		});
	},

	/**
	 * Get Financial Health Metrics
	 * - Savings Rate: YTD (Income - Expense) / Income
	 * - Runway: Liquid Assets / 3-month average expenses
	 * - Credit Utilization
	 * - Debt-to-Asset Ratio
	 */
	async getFinancialHealthMetrics(userId: string) {
		const now = new Date();
		const startCurrentMonth = new Date(
			now.getFullYear(),
			now.getMonth(),
			1
		);
		const endCurrentMonth = new Date(
			now.getFullYear(),
			now.getMonth() + 1,
			0
		);

		// YTD dates for savings rate
		const startOfYear = new Date(now.getFullYear(), 0, 1);

		// 1. Get Net Worth (Assets & Liabilities)
		const { assets, liabilities } = await this.getNetWorth(userId);

		// 2. Get YTD Cash Flow for Savings Rate
		const ytdCashFlow = await this.getCashFlow(
			userId,
			startOfYear,
			endCurrentMonth
		);
		const ytdIncome = ytdCashFlow.income;
		const ytdExpense = ytdCashFlow.expense;

		// 3. Get current month Cash Flow (for display)
		const { income: monthIncome, expense: monthExpense } =
			await this.getCashFlow(userId, startCurrentMonth, endCurrentMonth);

		// 4. Get Liquid Assets and Average Expense for Runway
		const liquidAssets = await this.getLiquidAssets(userId);
		const avgMonthlyExpense = await this.getAverageMonthlyExpense(
			userId,
			3
		);

		// 5. Get Credit Utilization
		const creditAccounts = await prisma.account.findMany({
			where: { userId, type: 'CREDIT', creditLimit: { not: null } },
			select: { balance: true, creditLimit: true },
		});

		let totalCreditUsed = 0;
		let totalCreditLimit = 0;

		for (const account of creditAccounts) {
			if (account.creditLimit) {
				const limit = Number(account.creditLimit);
				const used = Number(account.balance); // Balance = Debt

				totalCreditUsed += used;
				totalCreditLimit += limit;
			}
		}

		const creditUtilization =
			totalCreditLimit > 0
				? (totalCreditUsed / totalCreditLimit) * 100
				: 0;

		// 6. Calculate Ratios
		// YTD Savings Rate (more stable than single month)
		const savingsRate =
			ytdIncome > 0 ? ((ytdIncome - ytdExpense) / ytdIncome) * 100 : 0;

		const debtToAssetRatio = assets > 0 ? (liabilities / assets) * 100 : 0;

		// 7. Debt Paydown this month
		const debtPaydownResult = await prisma.transfer.aggregate({
			where: {
				userId,
				date: { gte: startCurrentMonth, lte: endCurrentMonth },
				toAccount: { isLiability: true },
			},
			_sum: { amount: true },
		});
		const debtPaydown = debtPaydownResult._sum?.amount?.toNumber() || 0;

		// 8. Runway (Liquid Assets / 3-month avg expense)
		let runwayMonths = 0;
		if (avgMonthlyExpense > 0) {
			runwayMonths = liquidAssets / avgMonthlyExpense;
		} else if (avgMonthlyExpense === 0 && liquidAssets > 0) {
			runwayMonths = 999; // Infinite runway
		}

		// 9. Calculate months to payoff at current rate
		let monthsToPayoff = 0;
		if (debtPaydown > 0 && liabilities > 0) {
			monthsToPayoff = Math.ceil(liabilities / debtPaydown);
		} else if (liabilities > 0) {
			monthsToPayoff = -1; // -1 indicates never (no payments being made)
		}

		// 10. Calculate debt paydown percentage
		const debtPaydownPercent =
			liabilities > 0 ? (debtPaydown / liabilities) * 100 : 0;

		// 11. Available credit
		const availableCredit = totalCreditLimit - totalCreditUsed;

		return {
			savingsRate,
			debtToAssetRatio,
			debtPaydown,
			debtPaydownPercent,
			monthsToPayoff,
			runwayMonths,
			creditUtilization,
			totalCreditUsed,
			totalCreditLimit,
			availableCredit,
			totalDebt: liabilities,
			income: monthIncome, // Current month for display
			expense: monthExpense, // Current month for display
			// Additional context for UI
			ytdIncome,
			ytdExpense,
			liquidAssets,
			avgMonthlyExpense,
		};
	},
};
