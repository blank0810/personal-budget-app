import prisma from '@/lib/prisma';
import { CreateRecurringInput, UpdateRecurringInput } from './recurring.types';
import { IncomeService } from '../income/income.service';
import { ExpenseService } from '../expense/expense.service';
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
				budgetId: data.budgetId || null,
				userId,
			},
			include: { category: true, account: true, budget: true },
		});
	},

	async update(userId: string, data: UpdateRecurringInput) {
		const { id, ...updateData } = data;
		return prisma.recurringTransaction.update({
			where: { id, userId },
			data: updateData,
			include: { category: true, account: true, budget: true },
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
			include: { category: true, account: true, budget: true },
			orderBy: { nextRunDate: 'asc' },
		});
	},

	async getById(userId: string, id: string) {
		return prisma.recurringTransaction.findUnique({
			where: { id, userId },
			include: { category: true, account: true, budget: true },
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
	 * Delegates to IncomeService/ExpenseService for transaction creation + balance updates.
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
		});

		let processed = 0;
		let failed = 0;
		const errors: string[] = [];

		for (const recurring of dueTransactions) {
			try {
				// Map frequency to recurringPeriod (only MONTHLY, WEEKLY, YEARLY are valid)
				const recurringPeriod = (['MONTHLY', 'WEEKLY', 'YEARLY'] as const).includes(
					recurring.frequency as 'MONTHLY' | 'WEEKLY' | 'YEARLY'
				)
					? (recurring.frequency as 'MONTHLY' | 'WEEKLY' | 'YEARLY')
					: undefined;

				// Create the actual transaction via the appropriate service
				if (recurring.type === 'INCOME') {
					await IncomeService.createIncome(recurring.userId, {
						amount: Number(recurring.amount),
						description: `[Auto] ${recurring.name}`,
						date: today,
						categoryId: recurring.categoryId,
						accountId: recurring.accountId,
						isRecurring: true,
						recurringPeriod,
						// Disable tithe and EF for auto-generated — user can configure separately
						titheEnabled: false,
						tithePercentage: 10,
						emergencyFundEnabled: false,
						emergencyFundPercentage: 10,
					});
				} else {
					await ExpenseService.createExpense(recurring.userId, {
						amount: Number(recurring.amount),
						description: `[Auto] ${recurring.name}`,
						date: today,
						categoryId: recurring.categoryId,
						accountId: recurring.accountId,
						budgetId: recurring.budgetId || undefined,
						isRecurring: true,
						recurringPeriod,
					});
				}

				// Advance nextRunDate (separate update, no outer transaction needed)
				const nextDate = calculateNextRunDate(
					recurring.nextRunDate,
					recurring.frequency
				);
				const shouldDeactivate =
					recurring.endDate && nextDate > recurring.endDate;

				await prisma.recurringTransaction.update({
					where: { id: recurring.id },
					data: {
						nextRunDate: nextDate,
						lastRunDate: today,
						...(shouldDeactivate && { isActive: false }),
					},
				});

				processed++;
			} catch (error) {
				failed++;
				errors.push(
					`${recurring.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
				);
			}
		}

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
