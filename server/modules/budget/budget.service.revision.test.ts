import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	transaction: vi.fn(),
	budgetFindUniqueOrThrow: vi.fn(),
	budgetUpdate: vi.fn(),
	budgetRevisionCreate: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
	default: {
		$transaction: mocks.transaction,
	},
}));

import { BudgetService } from './budget.service';

describe('BudgetService.updateBudget revision history', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.transaction.mockImplementation(
			async (
				callback: (tx: {
					budget: {
						findUniqueOrThrow: typeof mocks.budgetFindUniqueOrThrow;
						update: typeof mocks.budgetUpdate;
					};
					budgetRevision: {
						create: typeof mocks.budgetRevisionCreate;
					};
				}) => unknown
			) =>
				callback({
					budget: {
						findUniqueOrThrow: mocks.budgetFindUniqueOrThrow,
						update: mocks.budgetUpdate,
					},
					budgetRevision: {
						create: mocks.budgetRevisionCreate,
					},
				})
		);
		mocks.budgetUpdate.mockResolvedValue({
			id: 'budget-1',
			name: 'Groceries',
			amount: new Prisma.Decimal('650.00'),
		});
		mocks.budgetRevisionCreate.mockResolvedValue({ id: 'revision-1' });
	});

	it('records changed amounts inside the same transaction as the update', async () => {
		mocks.budgetFindUniqueOrThrow.mockResolvedValue({
			amount: new Prisma.Decimal('500.00'),
		});

		await expect(
			BudgetService.updateBudget('user-1', {
				id: 'budget-1',
				amount: 650,
			})
		).resolves.toEqual({
			id: 'budget-1',
			name: 'Groceries',
			amount: new Prisma.Decimal('650.00'),
		});
		expect(mocks.transaction).toHaveBeenCalledOnce();
		expect(mocks.budgetFindUniqueOrThrow).toHaveBeenCalledWith({
			where: { id: 'budget-1', userId: 'user-1' },
			select: { amount: true },
		});
		expect(mocks.budgetUpdate).toHaveBeenCalledWith({
			where: { id: 'budget-1', userId: 'user-1' },
			data: { amount: 650 },
		});
		expect(mocks.budgetRevisionCreate).toHaveBeenCalledWith({
			data: {
				budgetId: 'budget-1',
				userId: 'user-1',
				previousAmount: new Prisma.Decimal('500.00'),
				newAmount: new Prisma.Decimal('650'),
			},
		});
	});

	it('does not create a revision for a rename', async () => {
		mocks.budgetUpdate.mockResolvedValue({
			id: 'budget-1',
			name: 'Household groceries',
			amount: new Prisma.Decimal('500.00'),
		});

		await BudgetService.updateBudget('user-1', {
			id: 'budget-1',
			name: 'Household groceries',
		});

		expect(mocks.budgetFindUniqueOrThrow).not.toHaveBeenCalled();
		expect(mocks.budgetUpdate).toHaveBeenCalledWith({
			where: { id: 'budget-1', userId: 'user-1' },
			data: { name: 'Household groceries' },
		});
		expect(mocks.budgetRevisionCreate).not.toHaveBeenCalled();
	});

	it('does not create a revision when the Decimal amount is unchanged', async () => {
		mocks.budgetFindUniqueOrThrow.mockResolvedValue({
			amount: new Prisma.Decimal('500.00'),
		});

		await BudgetService.updateBudget('user-1', {
			id: 'budget-1',
			amount: 500,
		});

		expect(mocks.budgetFindUniqueOrThrow).toHaveBeenCalledWith({
			where: { id: 'budget-1', userId: 'user-1' },
			select: { amount: true },
		});
		expect(mocks.budgetUpdate).toHaveBeenCalledWith({
			where: { id: 'budget-1', userId: 'user-1' },
			data: { amount: 500 },
		});
		expect(mocks.budgetRevisionCreate).not.toHaveBeenCalled();
	});
});
