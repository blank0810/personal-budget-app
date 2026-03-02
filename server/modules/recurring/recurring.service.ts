import prisma from '@/lib/prisma';
import { CreateRecurringInput, UpdateRecurringInput } from './recurring.types';
import {
	addDays,
	addWeeks,
	addMonths,
	addYears,
	startOfDay,
} from 'date-fns';

export const RecurringService = {
	async create(userId: string, data: CreateRecurringInput) {
		return prisma.recurringTransaction.create({
			data: {
				name: data.name,
				type: data.type,
				amount: data.amount,
				description: data.description,
				frequency: data.frequency,
				startDate: data.startDate,
				endDate: data.endDate,
				nextRunDate: data.startDate,
				categoryId: data.categoryId,
				accountId: data.accountId,
				userId,
			},
			include: { category: true, account: true },
		});
	},

	async update(userId: string, data: UpdateRecurringInput) {
		const { id, ...updateData } = data;
		return prisma.recurringTransaction.update({
			where: { id, userId },
			data: updateData,
			include: { category: true, account: true },
		});
	},

	async delete(userId: string, id: string) {
		return prisma.recurringTransaction.delete({
			where: { id, userId },
		});
	},

	async getAll(userId: string) {
		return prisma.recurringTransaction.findMany({
			where: { userId },
			include: { category: true, account: true },
			orderBy: { nextRunDate: 'asc' },
		});
	},

	async getById(userId: string, id: string) {
		return prisma.recurringTransaction.findUnique({
			where: { id, userId },
			include: { category: true, account: true },
		});
	},

	async toggleActive(userId: string, id: string) {
		const record = await prisma.recurringTransaction.findUnique({
			where: { id, userId },
			select: { isActive: true },
		});
		if (!record) throw new Error('Recurring transaction not found');

		return prisma.recurringTransaction.update({
			where: { id, userId },
			data: { isActive: !record.isActive },
		});
	},

	/**
	 * Process all due recurring transactions.
	 * Each execution is wrapped in its own $transaction for atomicity.
	 */
	async processDue(): Promise<{
		processed: number;
		failed: number;
		errors: string[];
	}> {
		const today = startOfDay(new Date());

		const dueTransactions = await prisma.recurringTransaction.findMany({
			where: {
				isActive: true,
				nextRunDate: { lte: today },
				OR: [{ endDate: null }, { endDate: { gte: today } }],
			},
			include: { account: true },
		});

		let processed = 0;
		let failed = 0;
		const errors: string[] = [];

		for (const recurring of dueTransactions) {
			try {
				await prisma.$transaction(async (tx) => {
					// Create the actual transaction record
					if (recurring.type === 'INCOME') {
						await tx.income.create({
							data: {
								amount: recurring.amount,
								description: `[Auto] ${recurring.name}`,
								date: today,
								categoryId: recurring.categoryId,
								accountId: recurring.accountId,
								userId: recurring.userId,
								source: 'RECURRING',
							},
						});

						// Update account balance if linked
						if (recurring.accountId && recurring.account) {
							await tx.account.update({
								where: { id: recurring.accountId },
								data: {
									balance: recurring.account.isLiability
										? { decrement: recurring.amount }
										: { increment: recurring.amount },
								},
							});
						}
					} else {
						await tx.expense.create({
							data: {
								amount: recurring.amount,
								description: `[Auto] ${recurring.name}`,
								date: today,
								categoryId: recurring.categoryId,
								accountId: recurring.accountId,
								userId: recurring.userId,
								source: 'RECURRING',
							},
						});

						// Update account balance if linked
						if (recurring.accountId && recurring.account) {
							await tx.account.update({
								where: { id: recurring.accountId },
								data: {
									balance: recurring.account.isLiability
										? { increment: recurring.amount }
										: { decrement: recurring.amount },
								},
							});
						}
					}

					// Advance nextRunDate
					const nextDate = calculateNextRunDate(
						recurring.nextRunDate,
						recurring.frequency
					);

					// If endDate is set and next date exceeds it, deactivate
					const shouldDeactivate =
						recurring.endDate && nextDate > recurring.endDate;

					await tx.recurringTransaction.update({
						where: { id: recurring.id },
						data: {
							nextRunDate: nextDate,
							lastRunDate: today,
							isActive: !shouldDeactivate,
						},
					});
				});

				processed++;
			} catch (error) {
				failed++;
				errors.push(
					`Failed to process "${recurring.name}" (${recurring.id}): ${error instanceof Error ? error.message : 'Unknown error'}`
				);
			}
		}

		// Log the cron run
		await prisma.cronRunLog.create({
			data: {
				key: 'process-recurring',
				status: failed === 0 ? 'success' : 'failed',
				processedCount: processed,
				errorMessage:
					errors.length > 0 ? errors.join('; ') : undefined,
			},
		});

		return { processed, failed, errors };
	},
};

function calculateNextRunDate(
	currentDate: Date,
	frequency: string
): Date {
	switch (frequency) {
		case 'DAILY':
			return addDays(currentDate, 1);
		case 'WEEKLY':
			return addWeeks(currentDate, 1);
		case 'BIWEEKLY':
			return addWeeks(currentDate, 2);
		case 'MONTHLY':
			return addMonths(currentDate, 1);
		case 'YEARLY':
			return addYears(currentDate, 1);
		default:
			return addMonths(currentDate, 1);
	}
}
