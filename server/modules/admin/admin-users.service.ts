import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

const PAGE_SIZE = 20;

export const AdminUsersService = {
	async getUsers(
		page: number = 1,
		search?: string,
		filters?: { role?: string; status?: string }
	) {
		const where: Prisma.UserWhereInput = {};

		if (search) {
			where.OR = [
				{ name: { contains: search, mode: 'insensitive' } },
				{ email: { contains: search, mode: 'insensitive' } },
			];
		}

		if (filters?.role) {
			where.role = filters.role as 'USER' | 'ADMIN';
		}

		if (filters?.status === 'disabled') {
			where.isDisabled = true;
		} else if (filters?.status === 'active') {
			where.isDisabled = false;
		}

		const [users, total] = await Promise.all([
			prisma.user.findMany({
				where,
				select: {
					id: true,
					name: true,
					email: true,
					role: true,
					currency: true,
					isDisabled: true,
					isOnboarded: true,
					createdAt: true,
					lastLoginAt: true,
					_count: {
						select: {
							accounts: true,
							incomes: true,
							expenses: true,
						},
					},
				},
				orderBy: { createdAt: 'desc' },
				skip: (page - 1) * PAGE_SIZE,
				take: PAGE_SIZE,
			}),
			prisma.user.count({ where }),
		]);

		return {
			users: users.map((u) => ({
				...u,
				transactionCount: u._count.incomes + u._count.expenses,
				accountCount: u._count.accounts,
			})),
			total,
			pages: Math.ceil(total / PAGE_SIZE),
			page,
		};
	},

	async getUserDetail(userId: string) {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
				currency: true,
				isDisabled: true,
				isOnboarded: true,
				createdAt: true,
				lastLoginAt: true,
				accounts: {
					select: { id: true, name: true, balance: true, type: true },
					orderBy: { name: 'asc' },
				},
				notificationPreferences: {
					select: {
						enabled: true,
						notificationType: { select: { key: true, label: true } },
					},
				},
			},
		});

		if (!user) throw new Error('User not found');
		return user;
	},

	async getUserActivity(userId: string, limit: number = 20) {
		const [incomes, expenses, transfers, goals] = await Promise.all([
			prisma.income.findMany({
				where: { userId },
				select: {
					id: true,
					amount: true,
					description: true,
					date: true,
					createdAt: true,
					source: true,
					category: { select: { name: true } },
				},
				orderBy: { createdAt: 'desc' },
				take: limit,
			}),
			prisma.expense.findMany({
				where: { userId },
				select: {
					id: true,
					amount: true,
					description: true,
					date: true,
					createdAt: true,
					source: true,
					category: { select: { name: true } },
				},
				orderBy: { createdAt: 'desc' },
				take: limit,
			}),
			prisma.transfer.findMany({
				where: { userId },
				select: {
					id: true,
					amount: true,
					description: true,
					date: true,
					createdAt: true,
					fromAccount: { select: { name: true } },
					toAccount: { select: { name: true } },
				},
				orderBy: { createdAt: 'desc' },
				take: limit,
			}),
			prisma.goal.findMany({
				where: { userId },
				select: {
					id: true,
					name: true,
					status: true,
					createdAt: true,
				},
				orderBy: { createdAt: 'desc' },
				take: limit,
			}),
		]);

		type TimelineItem = {
			id: string;
			type: 'income' | 'expense' | 'transfer' | 'goal';
			description: string;
			amount?: number;
			timestamp: Date;
		};

		const timeline: TimelineItem[] = [
			...incomes.map((i) => ({
				id: i.id,
				type: 'income' as const,
				description: `${i.source === 'IMPORT' ? 'Imported' : 'Created'} income ${Number(i.amount)} in ${i.category.name}`,
				amount: Number(i.amount),
				timestamp: i.createdAt,
			})),
			...expenses.map((e) => ({
				id: e.id,
				type: 'expense' as const,
				description: `${e.source === 'IMPORT' ? 'Imported' : 'Created'} expense ${Number(e.amount)} in ${e.category.name}`,
				amount: Number(e.amount),
				timestamp: e.createdAt,
			})),
			...transfers.map((t) => ({
				id: t.id,
				type: 'transfer' as const,
				description: `Transferred ${Number(t.amount)} from ${t.fromAccount.name} to ${t.toAccount.name}`,
				amount: Number(t.amount),
				timestamp: t.createdAt,
			})),
			...goals.map((g) => ({
				id: g.id,
				type: 'goal' as const,
				description: `Created goal: ${g.name}`,
				timestamp: g.createdAt,
			})),
		];

		timeline.sort(
			(a, b) => b.timestamp.getTime() - a.timestamp.getTime()
		);

		return timeline.slice(0, limit);
	},

	async disableUser(userId: string) {
		return prisma.user.update({
			where: { id: userId },
			data: { isDisabled: true },
		});
	},

	async enableUser(userId: string) {
		return prisma.user.update({
			where: { id: userId },
			data: { isDisabled: false },
		});
	},

	async exportUserData(userId: string) {
		const [user, accounts, incomes, expenses, transfers, budgets, goals] =
			await Promise.all([
				prisma.user.findUnique({
					where: { id: userId },
					select: {
						id: true,
						name: true,
						email: true,
						role: true,
						currency: true,
						createdAt: true,
					},
				}),
				prisma.account.findMany({
					where: { userId },
					select: {
						name: true,
						type: true,
						balance: true,
						createdAt: true,
					},
				}),
				prisma.income.findMany({
					where: { userId },
					select: {
						amount: true,
						description: true,
						date: true,
						category: { select: { name: true } },
					},
				}),
				prisma.expense.findMany({
					where: { userId },
					select: {
						amount: true,
						description: true,
						date: true,
						category: { select: { name: true } },
					},
				}),
				prisma.transfer.findMany({
					where: { userId },
					select: {
						amount: true,
						description: true,
						date: true,
						fromAccount: { select: { name: true } },
						toAccount: { select: { name: true } },
					},
				}),
				prisma.budget.findMany({
					where: { userId },
					select: {
						amount: true,
						month: true,
						category: { select: { name: true } },
					},
				}),
				prisma.goal.findMany({
					where: { userId },
					select: {
						name: true,
						targetAmount: true,
						currentAmount: true,
						status: true,
						createdAt: true,
					},
				}),
			]);

		return {
			exportedAt: new Date().toISOString(),
			user,
			accounts: accounts.map((a) => ({
				...a,
				balance: Number(a.balance),
			})),
			incomes: incomes.map((i) => ({
				...i,
				amount: Number(i.amount),
				category: i.category.name,
			})),
			expenses: expenses.map((e) => ({
				...e,
				amount: Number(e.amount),
				category: e.category.name,
			})),
			transfers: transfers.map((t) => ({
				...t,
				amount: Number(t.amount),
				from: t.fromAccount.name,
				to: t.toAccount.name,
			})),
			budgets: budgets.map((b) => ({
				...b,
				amount: Number(b.amount),
				category: b.category.name,
			})),
			goals: goals.map((g) => ({
				...g,
				targetAmount: Number(g.targetAmount),
				currentAmount: Number(g.currentAmount),
			})),
		};
	},
};
