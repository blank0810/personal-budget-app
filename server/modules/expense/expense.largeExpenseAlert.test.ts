import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
	transaction: vi.fn(),
	expenseCreate: vi.fn(),
	expenseAggregate: vi.fn(),
	accountFindUnique: vi.fn(),
	accountUpdate: vi.fn(),
	budgetFindUnique: vi.fn(),
	categoryFindUnique: vi.fn(),
	getThreshold: vi.fn(),
	sendLargeExpenseAlert: vi.fn(),
	sendBudgetAlert: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
	default: {
		$transaction: mocks.transaction,
		expense: { aggregate: mocks.expenseAggregate },
		budget: { findUnique: mocks.budgetFindUnique },
		category: { findUnique: mocks.categoryFindUnique },
	},
}));

vi.mock('@/server/modules/user/user.service', () => ({
	UserService: { getLargeExpenseThreshold: mocks.getThreshold },
}));

vi.mock('@/server/modules/notification/notification.service', () => ({
	NotificationService: {
		sendLargeExpenseAlert: mocks.sendLargeExpenseAlert,
		sendBudgetAlert: mocks.sendBudgetAlert,
	},
}));

vi.mock('../category/category.service', () => ({
	CategoryService: { getOrCreateCategory: vi.fn() },
}));

const { ExpenseService } = await import('./expense.service');
import type { CreateExpenseInput } from './expense.types';

// Typed once from the real input contract, so no `any` casts are needed at the
// call sites and a schema change surfaces here as a type error.
const BASE: CreateExpenseInput = {
	amount: 15000,
	description: 'Laptop',
	date: new Date('2026-08-17'),
	categoryId: 'cat_1',
	notes: null,
};

describe('ExpenseService large-expense alert', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.sendLargeExpenseAlert.mockResolvedValue(undefined);
		mocks.categoryFindUnique.mockResolvedValue({ name: 'Equipment' });
		mocks.transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
			cb({
				expense: {
					create: mocks.expenseCreate.mockResolvedValue({
						id: 'e1',
						categoryId: 'cat_1',
					}),
				},
				account: {
					findUnique: mocks.accountFindUnique,
					update: mocks.accountUpdate,
				},
			})
		);
	});

	it('alerts when the amount exceeds the threshold', async () => {
		mocks.getThreshold.mockResolvedValue(10000);

		await ExpenseService.createExpense('u1', BASE);

		expect(mocks.sendLargeExpenseAlert).toHaveBeenCalledWith(
			'u1',
			{
				amount: 15000,
				description: 'Laptop',
				categoryName: 'Equipment',
			},
			10000
		);
	});

	it('stays silent when no threshold is set — the preference cannot act alone', async () => {
		mocks.getThreshold.mockResolvedValue(null);

		await ExpenseService.createExpense('u1', BASE);

		expect(mocks.sendLargeExpenseAlert).not.toHaveBeenCalled();
	});

	it('does not alert on an amount exactly equal to the threshold', async () => {
		// "Exceeds" means strictly greater — an expense AT the limit has not
		// exceeded it.
		mocks.getThreshold.mockResolvedValue(15000);

		await ExpenseService.createExpense('u1', BASE);

		expect(mocks.sendLargeExpenseAlert).not.toHaveBeenCalled();
	});

	it('alerts one cent above the threshold', async () => {
		mocks.getThreshold.mockResolvedValue(14999.99);

		await ExpenseService.createExpense('u1', BASE);

		expect(mocks.sendLargeExpenseAlert).toHaveBeenCalledOnce();
	});

	it('falls back to Uncategorized when the category cannot be read', async () => {
		mocks.getThreshold.mockResolvedValue(10000);
		mocks.categoryFindUnique.mockResolvedValue(null);

		await ExpenseService.createExpense('u1', BASE);

		expect(mocks.sendLargeExpenseAlert.mock.calls[0][1].categoryName).toBe(
			'Uncategorized'
		);
	});

	it('still creates the expense when the threshold lookup throws', async () => {
		mocks.getThreshold.mockRejectedValue(new Error('db down'));

		// A notification failure must never fail the recorded expense.
		await expect(
			ExpenseService.createExpense('u1', BASE)
		).resolves.toMatchObject({ id: 'e1' });
	});

	it('does not query the category when no alert will be sent', async () => {
		mocks.getThreshold.mockResolvedValue(null);

		await ExpenseService.createExpense('u1', BASE);

		expect(mocks.categoryFindUnique).not.toHaveBeenCalled();
	});
});
