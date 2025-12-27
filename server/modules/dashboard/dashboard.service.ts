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
				// Liabilities to be subtracted
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

		// Combine and sort
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
	 * Get Financial Health Metrics (Savings Rate, Debt-to-Asset, Burn Rate)
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

		// 1. Get Net Worth (Assets & Liabilities)
		const { assets, liabilities } = await this.getNetWorth(userId);

		// 2. Get Cash Flow (Income & Expense) for current month
		const { income, expense } = await this.getCashFlow(
			userId,
			startCurrentMonth,
			endCurrentMonth
		);

		// 3. Get Credit Utilization
		const creditAccounts = await prisma.account.findMany({
			where: { userId, type: 'CREDIT', creditLimit: { not: null } },
			select: { balance: true, creditLimit: true },
		});

		let totalCreditUsed = 0;
		let totalCreditLimit = 0;

		for (const account of creditAccounts) {
			// For Credit Cards, 'balance' usually represents debt.
			// If balance is positive, it's debt. If logic stores debt as negative, we might need absolute.
			// Based on schema 'balance' is generic Decimal. Usually Credit Card Debt is Positive in "Balance" field for Liability Accounts?
			// Let's assume standard behavior: Balance on Liability Account = Amount Owed.
			if (account.creditLimit) {
				totalCreditUsed += Number(account.balance);
				totalCreditLimit += Number(account.creditLimit);
			}
		}

		const creditUtilization =
			totalCreditLimit > 0
				? (totalCreditUsed / totalCreditLimit) * 100
				: 0;

		// 4. Calculate Ratios
		const savingsRate =
			income > 0 ? ((income - expense) / income) * 100 : 0;
		const debtToAssetRatio = assets > 0 ? (liabilities / assets) * 100 : 0;

		// For Debt Paydown (replacing Burn Rate)
		// Calculate total transfers TO liability accounts this month
		const debtPaydownResult = await prisma.transfer.aggregate({
			where: {
				userId,
				date: { gte: startCurrentMonth, lte: endCurrentMonth },
				toAccount: { isLiability: true },
			},
			_sum: { amount: true },
		});
		const debtPaydown = debtPaydownResult._sum?.amount?.toNumber() || 0;

		let runwayMonths = 0;
		if (expense > 0) {
			runwayMonths = assets / expense;
		} else if (expense === 0 && assets > 0) {
			runwayMonths = 999; // Infinite runway
		}

		return {
			savingsRate,
			debtToAssetRatio,
			debtPaydown,
			runwayMonths,
			creditUtilization,
			income,
			expense,
		};
	},
};
