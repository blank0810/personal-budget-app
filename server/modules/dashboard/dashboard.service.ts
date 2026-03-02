import prisma from '@/lib/prisma';
import { GoalService } from '@/server/modules/goal/goal.service';

export const DashboardService = {
	/**
	 * Calculate Net Worth (Assets - Liabilities)
	 * Excludes TITHE accounts
	 */
	async getNetWorth(userId: string) {
		const accounts = await prisma.account.findMany({
			where: {
				userId,
				type: { notIn: ['TITHE'] },
			},
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

	/**
	 * Financial Health Score (0-100) across 5 pillars:
	 * Solvency (25%), Liquidity (20%), Savings (20%), Debt Mgmt (20%), Cash Flow (15%)
	 */
	async getFinancialHealthScore(userId: string) {
		const now = new Date();
		const startCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const endCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

		const [healthMetrics, goalHealth, currentCashFlow] = await Promise.all([
			this.getFinancialHealthMetrics(userId),
			GoalService.getGoalHealthMetrics(userId),
			this.getCashFlow(userId, startCurrentMonth, endCurrentMonth),
		]);

		type Pillar = {
			name: string;
			score: number;
			grade: string;
			weight: number;
			details: string;
			recommendation: string;
		};

		const gradeFromScore = (score: number): string => {
			if (score >= 100) return 'A';
			if (score >= 80) return 'B';
			if (score >= 60) return 'C';
			if (score >= 40) return 'D';
			return 'F';
		};

		// --- Pillar 1: Solvency (25%) ---
		const dta = healthMetrics.debtToAssetRatio;
		const netWorthPositive = healthMetrics.ytdIncome > 0 || healthMetrics.liquidAssets > 0;
		let solvencyScore: number;
		let solvencyDetails: string;
		let solvencyRec: string;

		if (healthMetrics.totalDebt === 0 || (netWorthPositive && dta < 30)) {
			solvencyScore = 100;
			solvencyDetails = healthMetrics.totalDebt === 0
				? 'Completely debt-free. You don\'t owe a single soul a single cent. That\'s not common — that\'s legendary.'
				: `Debt-to-Asset ratio at ${dta.toFixed(1)}% — your assets dwarf your debt. You\'re built like a financial fortress.`;
			solvencyRec = 'You\'ve mastered the game most people lose. Seriously, this is rare. Keep this energy forever.';
		} else if (dta < 50) {
			solvencyScore = 80;
			solvencyDetails = `Debt-to-Asset ratio at ${dta.toFixed(1)}% — you\'re winning, just not dominating yet. Solid position though.`;
			solvencyRec = 'You\'re ahead of most people. Chip that ratio under 30% and you\'ll be untouchable.';
		} else if (dta < 75) {
			solvencyScore = 60;
			solvencyDetails = `Debt-to-Asset ratio at ${dta.toFixed(1)}% — more than half of what you "own" actually belongs to your lenders. Awkward.`;
			solvencyRec = 'Your stuff is more theirs than yours. Every dollar you don\'t throw at this debt is a dollar you\'re renting from a bank.';
		} else if (dta < 100) {
			solvencyScore = 40;
			solvencyDetails = `Debt-to-Asset ratio at ${dta.toFixed(1)}% — you\'re teetering on the edge of owing more than you\'re worth. Literally.`;
			solvencyRec = 'You are dangerously close to being worth less than nothing. Stop buying things. Start selling things. Attack this debt like your life depends on it — because your financial life does.';
		} else {
			solvencyScore = 20;
			solvencyDetails = dta > 0
				? `Debt-to-Asset ratio at ${dta.toFixed(1)}% — you owe more than everything you own combined. If you were a company, shareholders would be jumping ship.`
				: 'Negative net worth. You are worth less than zero dollars. Let that sink in.';
			solvencyRec = 'You are underwater. Every possession you have doesn\'t cover what you owe. No vacations, no "retail therapy," no excuses. Scorched earth on spending until this is fixed.';
		}

		// --- Pillar 2: Liquidity (20%) ---
		const runway = healthMetrics.runwayMonths;
		const efHealth = goalHealth.emergencyFundHealth;
		let liquidityScore: number;
		let liquidityDetails: string;
		let liquidityRec: string;

		if (runway >= 6 || efHealth === 'funded') {
			liquidityScore = 100;
			liquidityDetails = goalHealth.hasEmergencyFund
				? `Emergency fund locked and loaded — ${goalHealth.emergencyFundMonths?.toFixed(1)} months of pure "fire me, I dare you" money. Beautiful.`
				: `${runway.toFixed(1)} months of runway. You could walk out of your job tomorrow and not break a sweat. That\'s freedom.`;
			liquidityRec = 'You\'ve bought yourself something money can\'t usually buy — peace of mind. Now let the surplus work for you.';
		} else if (runway >= 3 || efHealth === 'building') {
			liquidityScore = 80;
			liquidityDetails = goalHealth.hasEmergencyFund
				? `Emergency fund at ${goalHealth.emergencyFundMonths?.toFixed(1)} months — you\'re building a real cushion. Respect.`
				: `${runway.toFixed(1)} months of runway — you\'ve got a buffer, and that puts you ahead of most people.`;
			liquidityRec = 'Good foundation. Push to 6 months and you\'ll sleep like someone who doesn\'t check their bank account at 2am.';
		} else if (runway >= 1 || efHealth === 'underfunded') {
			liquidityScore = 60;
			liquidityDetails = goalHealth.hasEmergencyFund
				? `Emergency fund at ${goalHealth.emergencyFundMonths?.toFixed(1)} months — that\'s not a safety net, that\'s a napkin. One emergency and it\'s gone.`
				: `${runway.toFixed(1)} months of runway — a single car repair or ER visit and you\'re in crisis mode.`;
			liquidityRec = 'You\'re one flat tire away from a panic attack. This needs to be 3 months minimum before you can relax about anything.';
		} else if (runway > 0) {
			liquidityScore = 40;
			liquidityDetails = `${runway.toFixed(1)} months of runway — that\'s not a safety net, that\'s a trampoline with a hole in it. You\'re one bad week from broke.`;
			liquidityRec = 'A surprise $500 expense would send you spiraling. Stop eating out, cancel what you don\'t need, and stockpile cash like your rent depends on it — because it does.';
		} else {
			liquidityScore = 20;
			liquidityDetails = 'Absolutely zero liquid reserves. Nothing. You are one missed paycheck away from not making rent. That\'s not living, that\'s surviving.';
			liquidityRec = 'You have no cushion, no backup, no plan B. If anything goes wrong — anything — you\'re done. Treat saving like a bill that\'s already overdue.';
		}

		// --- Pillar 3: Savings (20%) ---
		const savingsRate = healthMetrics.savingsRate;
		let savingsScore: number;
		let savingsDetails: string;
		let savingsRec: string;

		if (savingsRate >= 20) {
			savingsScore = 100;
			savingsDetails = `Banking ${savingsRate.toFixed(1)}% of every paycheck. You\'re not just saving — you\'re building an empire, one paycheck at a time. Future you is going to be rich.`;
			savingsRec = `This is genuinely impressive. Most people can\'t save 5% and you\'re at ${savingsRate.toFixed(0)}%. Keep compounding — this is how generational wealth starts.`;
		} else if (savingsRate >= 10) {
			savingsScore = 80;
			savingsDetails = `Saving ${savingsRate.toFixed(1)}% — that\'s better than the majority of people. You\'re actually building something here.`;
			savingsRec = 'Solid work. You\'re above average, but "above average" is a low bar. Push to 20% and go from good to unstoppable.';
		} else if (savingsRate >= 5) {
			savingsScore = 60;
			savingsDetails = `Saving ${savingsRate.toFixed(1)}% — that\'s pocket lint. You\'re saving the equivalent of what most people spend on coffee. It\'s almost insulting to call this saving.`;
			savingsRec = 'You think this is saving? This is finding loose change in the couch. Cut one subscription, eat out two fewer times, and double this number. It\'s embarrassingly easy.';
		} else if (savingsRate > 0) {
			savingsScore = 40;
			savingsDetails = `Saving ${savingsRate.toFixed(1)}% — congratulations, you\'re saving so little that rounding would make it zero. Your piggy bank is on life support.`;
			savingsRec = 'This "savings rate" wouldn\'t cover a parking ticket. You\'re hemorrhaging money somewhere and lying to yourself about where it\'s going. Audit every dollar.';
		} else {
			savingsScore = 20;
			savingsDetails = savingsRate < 0
				? `Spending ${Math.abs(savingsRate).toFixed(1)}% more than you earn. You\'re not just not saving — you\'re going backwards. Every month you get poorer. Let that hit you.`
				: 'Saving exactly nothing. $0.00. Your savings account is collecting dust, not interest. Retirement you is going to be working a cash register.';
			savingsRec = savingsRate < 0
				? 'You are spending money you don\'t have. That\'s not a lifestyle, that\'s a countdown timer. Something has to go, and "I deserve it" is not a financial strategy.'
				: 'Zero percent. In a world with automatic transfers and round-up apps, saving nothing is a choice — and it\'s a terrible one. Set up autopay to savings today. Not tomorrow. Today.';
		}

		// --- Pillar 4: Debt Management (20%) ---
		const utilization = healthMetrics.creditUtilization;
		let debtScore: number;
		let debtDetails: string;
		let debtRec: string;

		if (healthMetrics.totalDebt === 0 || utilization < 10) {
			debtScore = 100;
			debtDetails = healthMetrics.totalDebt === 0
				? 'Completely debt-free. You owe nobody nothing. While everyone else pays interest, you keep every cent. That\'s real wealth.'
				: `Credit utilization at ${utilization.toFixed(1)}% — you use credit like a tool, not a crutch. This is how the financially literate operate.`;
			debtRec = 'Textbook perfect. Banks love you, your credit score loves you, and you should love yourself for this. Don\'t change a thing.';
		} else if (utilization < 30) {
			debtScore = 80;
			debtDetails = `Credit utilization at ${utilization.toFixed(1)}% — responsible and controlled. You\'re managing debt like an adult. Genuinely well done.`;
			debtRec = 'You\'re in great shape. Drop it under 10% and your credit score will thank you with the best rates money can buy.';
		} else if (utilization < 50) {
			debtScore = 60;
			debtDetails = `Credit utilization at ${utilization.toFixed(1)}% — half your available credit is already spoken for. Lenders are starting to raise an eyebrow.`;
			debtRec = 'You\'re not in trouble yet, but the warning signs are flashing. Stop paying minimums — that\'s how banks keep you in debt forever. Pay aggressively or don\'t bother.';
		} else if (utilization < 70) {
			debtScore = 40;
			debtDetails = `Credit utilization at ${utilization.toFixed(1)}% — you\'re burning through your credit like it\'s free money. Spoiler: it\'s the most expensive money there is.`;
			debtRec = 'Every swipe is digging the hole deeper. The interest alone is eating you alive. Cut the cards up, switch to cash, and stop pretending minimum payments are progress.';
		} else {
			debtScore = 20;
			debtDetails = `Credit utilization at ${utilization.toFixed(1)}% — nearly maxed out. You\'re not using credit anymore, credit is using you. You\'re a bank\'s favorite customer, and that\'s not a compliment.`;
			debtRec = 'Put the cards in a drawer, a safe, a volcano — whatever it takes. You are paying interest on interest at this point. Cash only until further notice. This is non-negotiable.';
		}

		// --- Pillar 5: Cash Flow (15%) ---
		const cashFlowRatio = currentCashFlow.income > 0
			? (currentCashFlow.expense / currentCashFlow.income) * 100
			: currentCashFlow.expense > 0 ? 100 : 0;
		let cashFlowScore: number;
		let cashFlowDetails: string;
		let cashFlowRec: string;

		if (cashFlowRatio < 70) {
			cashFlowScore = 100;
			cashFlowDetails = `Spending only ${cashFlowRatio.toFixed(1)}% of income — you\'re keeping 30+ cents of every dollar. Money flows in and stays. This is what financial control looks like.`;
			cashFlowRec = 'Elite-level cash management. You have massive room to save, invest, and build. Most people dream of this margin — you\'re living it.';
		} else if (cashFlowRatio < 80) {
			cashFlowScore = 80;
			cashFlowDetails = `Spending ${cashFlowRatio.toFixed(1)}% of income — you\'re in the green, keeping a healthy gap between what comes in and what goes out.`;
			cashFlowRec = 'Positive cash flow is the foundation of everything. You\'re doing well — tighten the gap a bit more and you\'ll have real financial firepower.';
		} else if (cashFlowRatio < 90) {
			cashFlowScore = 60;
			cashFlowDetails = `Spending ${cashFlowRatio.toFixed(1)}% of income — you\'re keeping a dime for every dollar. That\'s not a margin, that\'s a sliver. One surprise expense and you\'re at zero.`;
			cashFlowRec = 'Where is it all going? Seriously. Pull up your expenses and find the leaks, because something is silently draining you. Subscriptions, food delivery, impulse purchases — audit everything.';
		} else if (cashFlowRatio < 100) {
			cashFlowScore = 40;
			cashFlowDetails = `Spending ${cashFlowRatio.toFixed(1)}% of income — your paycheck enters your account and immediately evaporates. You\'re essentially working for free at this point.`;
			cashFlowRec = 'Money in, money out, nothing left. You\'re a financial treadmill — running hard and going nowhere. Something major needs to be cut. You know exactly what it is. Stop protecting it.';
		} else {
			cashFlowScore = 20;
			cashFlowDetails = cashFlowRatio > 100
				? `Spending ${cashFlowRatio.toFixed(1)}% of income — you are literally spending money you don\'t have. Every single month you get poorer. This is the financial equivalent of running into traffic.`
				: 'No income logged this month. Without income data, this score is just guessing — and we don\'t guess, we judge.';
			cashFlowRec = cashFlowRatio > 100
				? 'More going out than coming in. This isn\'t a budget problem, this is a math problem, and the math says you\'re going broke. Every day you don\'t fix this is a day you get deeper in the hole.'
				: 'Log your income so we can give you a real score. Right now we\'re flying blind and so are you.';
		}

		// --- Build pillars array ---
		const pillars: Pillar[] = [
			{ name: 'Solvency', score: solvencyScore, grade: gradeFromScore(solvencyScore), weight: 0.25, details: solvencyDetails, recommendation: solvencyRec },
			{ name: 'Liquidity', score: liquidityScore, grade: gradeFromScore(liquidityScore), weight: 0.20, details: liquidityDetails, recommendation: liquidityRec },
			{ name: 'Savings', score: savingsScore, grade: gradeFromScore(savingsScore), weight: 0.20, details: savingsDetails, recommendation: savingsRec },
			{ name: 'Debt Management', score: debtScore, grade: gradeFromScore(debtScore), weight: 0.20, details: debtDetails, recommendation: debtRec },
			{ name: 'Cash Flow', score: cashFlowScore, grade: gradeFromScore(cashFlowScore), weight: 0.15, details: cashFlowDetails, recommendation: cashFlowRec },
		];

		// --- Overall score ---
		const overallScore = Math.round(
			pillars.reduce((sum, p) => sum + p.score * p.weight, 0)
		);

		const overallLabel =
			overallScore >= 90 ? 'Excellent' :
			overallScore >= 75 ? 'Good' :
			overallScore >= 60 ? 'Fair' :
			overallScore >= 40 ? 'Needs Attention' :
			'Critical';

		return {
			overallScore,
			overallLabel,
			pillars,
		};
	},
};
