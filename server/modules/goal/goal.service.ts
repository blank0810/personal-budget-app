import prisma from '@/lib/prisma';
import type {
	CreateGoalInput,
	UpdateGoalInput,
	AddContributionInput,
	GoalHealthMetric,
	GoalHealthSummary,
	GoalHealthStatus,
} from './goal.types';

export const GoalService = {
	async create(userId: string, data: CreateGoalInput) {
		const goalData: Parameters<typeof prisma.goal.create>[0]['data'] = {
			name: data.name,
			targetAmount: data.targetAmount,
			deadline: data.deadline,
			icon: data.icon,
			color: data.color,
			goalType: data.goalType ?? 'FIXED_AMOUNT',
			isEmergencyFund: data.isEmergencyFund ?? false,
			thresholdLow: data.thresholdLow,
			thresholdMid: data.thresholdMid,
			thresholdHigh: data.thresholdHigh,
			userId,
		};

		// If linking to an account, capture the baseline balance
		if (data.linkedAccountId) {
			const account = await prisma.account.findUnique({
				where: { id: data.linkedAccountId, userId },
				select: { balance: true },
			});
			if (!account) throw new Error('Account not found');

			goalData.linkedAccountId = data.linkedAccountId;
			goalData.baselineAmount = account.balance;
			goalData.currentAmount = 0; // Progress starts at 0
		}

		return prisma.goal.create({ data: goalData });
	},

	async update(userId: string, data: UpdateGoalInput) {
		const { id, ...rest } = data;
		return prisma.goal.update({
			where: { id, userId },
			data: rest,
		});
	},

	async delete(userId: string, id: string) {
		return prisma.goal.delete({
			where: { id, userId },
		});
	},

	async archive(userId: string, id: string) {
		return prisma.goal.update({
			where: { id, userId },
			data: { status: 'ARCHIVED' },
		});
	},

	async complete(userId: string, id: string) {
		return prisma.goal.update({
			where: { id, userId },
			data: { status: 'COMPLETED' },
		});
	},

	async getAll(userId: string) {
		const goals = await prisma.goal.findMany({
			where: { userId },
			include: {
				linkedAccount: { select: { id: true, name: true, balance: true } },
				_count: { select: { contributions: true } },
			},
			orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
		});

		return goals;
	},

	async getById(userId: string, id: string) {
		const goal = await prisma.goal.findUnique({
			where: { id, userId },
			include: {
				linkedAccount: {
					select: { id: true, name: true, balance: true },
				},
				contributions: {
					orderBy: { date: 'desc' },
					take: 50,
				},
			},
		});
		if (!goal) throw new Error('Goal not found');
		return goal;
	},

	async addContribution(userId: string, data: AddContributionInput) {
		return prisma.$transaction(async (tx) => {
			// Verify ownership
			const goal = await tx.goal.findUnique({
				where: { id: data.goalId, userId },
				select: { id: true, linkedAccountId: true },
			});
			if (!goal) throw new Error('Goal not found');
			if (goal.linkedAccountId) {
				throw new Error(
					'Cannot add manual contributions to account-linked goals'
				);
			}

			// Create contribution
			await tx.goalContribution.create({
				data: {
					goalId: data.goalId,
					amount: data.amount,
					note: data.note,
					date: data.date || new Date(),
				},
			});

			// Update currentAmount
			await tx.goal.update({
				where: { id: data.goalId },
				data: {
					currentAmount: { increment: data.amount },
				},
			});
		});
	},

	/**
	 * Sync linked account goals: progress = currentBalance - baselineAmount
	 */
	async syncLinkedAccounts(userId: string) {
		const linkedGoals = await prisma.goal.findMany({
			where: {
				userId,
				status: 'ACTIVE',
				linkedAccountId: { not: null },
			},
			include: {
				linkedAccount: { select: { balance: true } },
			},
		});

		for (const goal of linkedGoals) {
			if (!goal.linkedAccount) continue;
			const progress =
				Number(goal.linkedAccount.balance) -
				Number(goal.baselineAmount);
			await prisma.goal.update({
				where: { id: goal.id },
				data: { currentAmount: Math.max(0, progress) },
			});
		}
	},

	async linkAccount(userId: string, goalId: string, accountId: string) {
		const account = await prisma.account.findUnique({
			where: { id: accountId, userId },
			select: { balance: true },
		});
		if (!account) throw new Error('Account not found');

		return prisma.goal.update({
			where: { id: goalId, userId },
			data: {
				linkedAccountId: accountId,
				baselineAmount: account.balance,
				currentAmount: 0,
			},
		});
	},

	/**
	 * Calculate projected completion date based on average monthly contribution velocity.
	 */
	async getProjectedCompletion(
		goalId: string
	): Promise<Date | null> {
		const goal = await prisma.goal.findUnique({
			where: { id: goalId },
			select: {
				targetAmount: true,
				currentAmount: true,
				createdAt: true,
			},
		});
		if (!goal) return null;

		const current = Number(goal.currentAmount);
		const target = Number(goal.targetAmount);
		if (current >= target) return new Date(); // Already completed

		const monthsElapsed =
			(Date.now() - goal.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
		if (monthsElapsed < 0.5 || current <= 0) return null; // Not enough data

		const monthlyRate = current / monthsElapsed;
		const remaining = target - current;
		const monthsToGo = remaining / monthlyRate;

		const projected = new Date();
		projected.setMonth(projected.getMonth() + Math.ceil(monthsToGo));
		return projected;
	},

	/**
	 * Get goal health metrics — replaces DashboardService.getFundHealthMetrics()
	 * For MONTHS_COVERAGE goals: months coverage from linked account balance / expense baseline
	 * For FIXED_AMOUNT goals with linked account: progress = currentAmount / targetAmount
	 */
	async getGoalHealthMetrics(userId: string): Promise<GoalHealthSummary> {
		// 1. Get all active goals with linked accounts
		const goals = await prisma.goal.findMany({
			where: { userId, status: 'ACTIVE' },
			include: {
				linkedAccount: { select: { id: true, balance: true } },
			},
		});

		if (goals.length === 0) {
			return {
				goals: [],
				totalGoalBalance: 0,
				hasEmergencyFund: false,
				emergencyFundMonths: null,
				emergencyFundHealth: null,
				emergencyFundExpenseSource: null,
				monthlyExpenseBaseline: 0,
			};
		}

		// 2. Get expense baseline (hybrid: actual 3-month avg, fallback to budget)
		const now = new Date();
		const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
		const endCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

		const [expenseAgg, budgets] = await Promise.all([
			prisma.expense.aggregate({
				where: { userId, date: { gte: threeMonthsAgo, lte: endCurrentMonth } },
				_sum: { amount: true },
			}),
			prisma.budget.findMany({
				where: { userId, month: { gte: currentMonth, lt: nextMonth } },
			}),
		]);

		const avgMonthlyExpense = (expenseAgg._sum.amount?.toNumber() || 0) / 3;
		const totalMonthlyBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0);

		const expenseSource: 'actual' | 'budget' | null =
			avgMonthlyExpense > 0 ? 'actual' : totalMonthlyBudget > 0 ? 'budget' : null;
		const monthlyExpenseBaseline = avgMonthlyExpense > 0 ? avgMonthlyExpense : totalMonthlyBudget;

		// 3. Calculate metrics for each goal
		const goalMetrics: GoalHealthMetric[] = goals.map((goal) => {
			const balance = goal.linkedAccount
				? Number(goal.linkedAccount.balance)
				: Number(goal.currentAmount);
			const target = Number(goal.targetAmount);
			const goalType = goal.goalType as 'FIXED_AMOUNT' | 'MONTHS_COVERAGE';

			const thresholdLow = goal.thresholdLow ?? 2;
			const thresholdMid = goal.thresholdMid ?? 4;
			const thresholdHigh = goal.thresholdHigh ?? 6;

			let progressPercent = 0;
			let monthsCoverage: number | null = null;
			let healthStatus: GoalHealthStatus;

			if (goalType === 'MONTHS_COVERAGE') {
				monthsCoverage =
					monthlyExpenseBaseline > 0
						? balance / monthlyExpenseBaseline
						: balance > 0 ? 999 : 0;

				progressPercent = (monthsCoverage / thresholdHigh) * 100;

				if (monthsCoverage < thresholdLow) {
					healthStatus = 'critical';
				} else if (monthsCoverage < thresholdMid) {
					healthStatus = 'underfunded';
				} else if (monthsCoverage < thresholdHigh) {
					healthStatus = 'building';
				} else {
					healthStatus = 'funded';
				}
			} else {
				progressPercent = target > 0 ? (balance / target) * 100 : 0;

				if (progressPercent < 25) {
					healthStatus = 'critical';
				} else if (progressPercent < 50) {
					healthStatus = 'underfunded';
				} else if (progressPercent < 100) {
					healthStatus = 'building';
				} else {
					healthStatus = 'funded';
				}
			}

			return {
				id: goal.id,
				name: goal.name,
				goalType,
				isEmergencyFund: goal.isEmergencyFund,
				balance,
				targetAmount: target || null,
				progressPercent: Math.min(progressPercent, 100),
				monthsCoverage,
				healthStatus,
				thresholds: { low: thresholdLow, mid: thresholdMid, high: thresholdHigh },
			};
		});

		// 4. Calculate totals
		const totalGoalBalance = goalMetrics.reduce((sum, g) => sum + g.balance, 0);

		// 5. Find Emergency Fund goal
		const emergencyFund = goalMetrics.find((g) => g.isEmergencyFund);

		return {
			goals: goalMetrics,
			totalGoalBalance,
			hasEmergencyFund: !!emergencyFund,
			emergencyFundMonths: emergencyFund?.monthsCoverage ?? null,
			emergencyFundHealth: emergencyFund?.healthStatus ?? null,
			emergencyFundExpenseSource: expenseSource,
			monthlyExpenseBaseline,
		};
	},

	/**
	 * Get the user's emergency fund goal (for income auto-contribution)
	 */
	async getEmergencyFundGoal(userId: string) {
		return prisma.goal.findFirst({
			where: {
				userId,
				isEmergencyFund: true,
				status: 'ACTIVE',
				linkedAccountId: { not: null },
			},
			include: {
				linkedAccount: { select: { id: true, name: true, balance: true } },
			},
		});
	},
};
