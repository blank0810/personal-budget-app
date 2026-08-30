import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportTransaction } from './import.types';

const mocks = vi.hoisted(() => ({
	createId: vi.fn(),
	transaction: vi.fn(),
	accountLookup: vi.fn(),
	budgetFindMany: vi.fn(),
	incomeCreateMany: vi.fn(),
	expenseCreateMany: vi.fn(),
	accountUpdate: vi.fn(),
	incomeFindMany: vi.fn(),
	expenseFindMany: vi.fn(),
	incomeDeleteMany: vi.fn(),
	expenseDeleteMany: vi.fn(),
	transactionAccountFindUnique: vi.fn(),
	sendImportComplete: vi.fn(),
}));

vi.mock('@paralleldrive/cuid2', () => ({
	createId: mocks.createId,
}));

vi.mock('@/lib/prisma', () => ({
	default: {
		$transaction: mocks.transaction,
		account: {
			findUnique: mocks.accountLookup,
		},
	},
}));

vi.mock('@/server/modules/notification/notification.service', () => ({
	NotificationService: {
		sendImportComplete: mocks.sendImportComplete,
	},
}));

import { ImportService } from './import.service';

const augustStart = new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0));
const augustEnd = new Date(Date.UTC(2026, 7, 31, 23, 59, 59, 999));
const septemberStart = new Date(Date.UTC(2026, 8, 1, 0, 0, 0, 0));
const septemberEnd = new Date(Date.UTC(2026, 8, 30, 23, 59, 59, 999));

function expense(
	categoryId: string,
	amount: number,
	date: Date
): ImportTransaction {
	return {
		type: 'EXPENSE',
		amount,
		description: `${categoryId} expense`,
		date,
		categoryId,
		accountId: 'account-1',
	};
}

describe('ImportService envelope auto-linking', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.createId.mockReturnValue('batch-1');
		mocks.accountLookup.mockResolvedValue({
			isLiability: false,
			name: 'Checking',
		});
		mocks.budgetFindMany.mockResolvedValue([]);
		mocks.incomeCreateMany.mockResolvedValue({ count: 0 });
		mocks.expenseCreateMany.mockResolvedValue({ count: 0 });
		mocks.accountUpdate.mockResolvedValue(undefined);
		mocks.incomeFindMany.mockResolvedValue([]);
		mocks.expenseFindMany.mockResolvedValue([]);
		mocks.incomeDeleteMany.mockResolvedValue({ count: 0 });
		mocks.expenseDeleteMany.mockResolvedValue({ count: 0 });
		mocks.transactionAccountFindUnique.mockResolvedValue({
			isLiability: false,
			name: 'Checking',
		});
		mocks.sendImportComplete.mockResolvedValue(undefined);
		mocks.transaction.mockImplementation(
			async (callback: (tx: unknown) => unknown) =>
				callback({
					budget: { findMany: mocks.budgetFindMany },
					income: {
						createMany: mocks.incomeCreateMany,
						findMany: mocks.incomeFindMany,
						deleteMany: mocks.incomeDeleteMany,
					},
					expense: {
						createMany: mocks.expenseCreateMany,
						findMany: mocks.expenseFindMany,
						deleteMany: mocks.expenseDeleteMany,
					},
					account: {
						findUnique: mocks.transactionAccountFindUnique,
						update: mocks.accountUpdate,
					},
				})
		);
	});

	it('bulk-links one envelope and leaves ambiguous or missing pairs null', async () => {
		const transactions = [
			expense(
				'category-food',
				10,
				new Date('2026-08-31T23:30:00.000Z')
			),
			expense(
				'category-travel',
				20,
				new Date('2026-08-12T09:00:00.000Z')
			),
			expense(
				'category-utilities',
				30,
				new Date('2026-09-02T09:00:00.000Z')
			),
		];
		mocks.budgetFindMany.mockResolvedValue([
			{
				id: 'budget-food-august',
				categoryId: 'category-food',
				month: augustStart,
			},
			{
				id: 'budget-travel-a',
				categoryId: 'category-travel',
				month: augustStart,
			},
			{
				id: 'budget-travel-b',
				categoryId: 'category-travel',
				month: augustStart,
			},
		]);

		await expect(
			ImportService.batchImport('user-1', 'account-1', transactions)
		).resolves.toEqual({
			imported: 3,
			skipped: 0,
			importBatchId: 'batch-1',
		});
		expect(mocks.budgetFindMany).toHaveBeenCalledOnce();
		expect(mocks.budgetFindMany).toHaveBeenCalledWith({
			where: {
				userId: 'user-1',
				OR: [
					{
						categoryId: 'category-food',
						month: { gte: augustStart, lte: augustEnd },
					},
					{
						categoryId: 'category-travel',
						month: { gte: augustStart, lte: augustEnd },
					},
					{
						categoryId: 'category-utilities',
						month: { gte: septemberStart, lte: septemberEnd },
					},
				],
			},
			select: { id: true, categoryId: true, month: true },
		});
		expect(mocks.expenseCreateMany).toHaveBeenCalledWith({
			data: [
				{
					amount: 10,
					description: 'category-food expense',
					date: new Date('2026-08-31T23:30:00.000Z'),
					categoryId: 'category-food',
					accountId: 'account-1',
					budgetId: 'budget-food-august',
					userId: 'user-1',
					source: 'IMPORT',
					importBatchId: 'batch-1',
				},
				{
					amount: 20,
					description: 'category-travel expense',
					date: new Date('2026-08-12T09:00:00.000Z'),
					categoryId: 'category-travel',
					accountId: 'account-1',
					budgetId: null,
					userId: 'user-1',
					source: 'IMPORT',
					importBatchId: 'batch-1',
				},
				{
					amount: 30,
					description: 'category-utilities expense',
					date: new Date('2026-09-02T09:00:00.000Z'),
					categoryId: 'category-utilities',
					accountId: 'account-1',
					budgetId: null,
					userId: 'user-1',
					source: 'IMPORT',
					importBatchId: 'batch-1',
				},
			],
		});
		expect(mocks.accountUpdate).toHaveBeenCalledWith({
			where: { id: 'account-1' },
			data: { balance: { increment: -60 } },
		});
		expect(mocks.sendImportComplete).toHaveBeenCalledWith('user-1', {
			imported: 3,
			skipped: 0,
			accountName: 'Checking',
		});
	});

	it('undo deletes every imported row by the shared batch id', async () => {
		mocks.incomeFindMany.mockResolvedValue([
			{ amount: new Prisma.Decimal('100'), accountId: 'account-1' },
		]);
		mocks.expenseFindMany.mockResolvedValue([
			{ amount: new Prisma.Decimal('10'), accountId: 'account-1' },
			{ amount: new Prisma.Decimal('20'), accountId: 'account-1' },
			{ amount: new Prisma.Decimal('30'), accountId: 'account-1' },
		]);
		mocks.incomeDeleteMany.mockResolvedValue({ count: 1 });
		mocks.expenseDeleteMany.mockResolvedValue({ count: 3 });

		await expect(
			ImportService.undoImport('user-1', 'batch-1')
		).resolves.toBe(4);
		expect(mocks.incomeFindMany).toHaveBeenCalledWith({
			where: { userId: 'user-1', importBatchId: 'batch-1' },
			select: { amount: true, accountId: true },
		});
		expect(mocks.expenseFindMany).toHaveBeenCalledWith({
			where: { userId: 'user-1', importBatchId: 'batch-1' },
			select: { amount: true, accountId: true },
		});
		expect(mocks.incomeDeleteMany).toHaveBeenCalledWith({
			where: { userId: 'user-1', importBatchId: 'batch-1' },
		});
		expect(mocks.expenseDeleteMany).toHaveBeenCalledWith({
			where: { userId: 'user-1', importBatchId: 'batch-1' },
		});
		expect(mocks.transactionAccountFindUnique).toHaveBeenCalledWith({
			where: { id: 'account-1' },
			select: { isLiability: true, name: true },
		});
		expect(mocks.accountUpdate).toHaveBeenCalledWith({
			where: { id: 'account-1' },
			data: { balance: { decrement: 40 } },
		});
	});
});
