import prisma from '@/lib/prisma';
import type {
	CreateGoalInput,
	UpdateGoalInput,
	AddContributionInput,
} from './goal.types';

export const GoalService = {
	async create(userId: string, data: CreateGoalInput) {
		const goalData: Parameters<typeof prisma.goal.create>[0]['data'] = {
			name: data.name,
			targetAmount: data.targetAmount,
			deadline: data.deadline,
			icon: data.icon,
			color: data.color,
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
};
