import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BudgetLinkError } from './expense.types';

const mocks = vi.hoisted(() => ({
	getAuthenticatedUser: vi.fn(),
	createExpense: vi.fn(),
	updateExpense: vi.fn(),
	invalidateTags: vi.fn(),
}));

vi.mock('@/server/lib/auth-guard', () => ({
	getAuthenticatedUser: mocks.getAuthenticatedUser,
}));

vi.mock('./expense.service', () => ({
	ExpenseService: {
		createExpense: mocks.createExpense,
		updateExpense: mocks.updateExpense,
	},
}));

vi.mock('@/server/actions/cache', () => ({
	invalidateTags: mocks.invalidateTags,
}));

import { createExpenseAction, updateExpenseAction } from './expense.controller';

describe.each([
	['create', createExpenseAction, mocks.createExpense],
	['update', updateExpenseAction, mocks.updateExpense],
] as const)('%s expense budget link errors', (operation, action, service) => {
	const input = {
		id: 'expense-1',
		amount: 20,
		date: new Date('2026-08-17T12:00:00.000Z'),
		categoryId: 'category-food',
		accountId: 'account-1',
		budgetId: 'budget-1',
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getAuthenticatedUser.mockResolvedValue('user-1');
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it.each([
		'That budget is for a different category',
		'That budget is for a different month',
	])('surfaces the owned budget validity message: %s', async (message) => {
		const error = new BudgetLinkError(message);
		service.mockRejectedValue(error);

		await expect(action(input)).resolves.toEqual({ error: message });

		expect(service).toHaveBeenCalledExactlyOnceWith(
			'user-1',
			expect.objectContaining({ budgetId: 'budget-1' })
		);
		expect(mocks.invalidateTags).not.toHaveBeenCalled();
		expect(console.error).toHaveBeenCalledWith(`Failed to ${operation} expense:`, error);
	});

	it.each([
		['ownership failure', new Error('Budget not found')],
		['unexpected error', new Error('Database details')],
		['plain Error with validity text', new Error('That budget is for a different month')],
		['non-Error failure', 'Database details'],
	])('keeps a generic message for %s', async (_label, error) => {
		service.mockRejectedValue(error);

		await expect(action(input)).resolves.toEqual({
			error: `Failed to ${operation} expense`,
		});

		expect(mocks.invalidateTags).not.toHaveBeenCalled();
		expect(console.error).toHaveBeenCalledWith(`Failed to ${operation} expense:`, error);
	});
});
