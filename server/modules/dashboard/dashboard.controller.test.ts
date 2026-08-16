import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	getAuthenticatedUser: vi.fn(),
	getDashboardData: vi.fn(),
	getFinancialHealthScore: vi.fn(),
	getIncomeExpenseTrend: vi.fn(),
	getBudgets: vi.fn(),
	getUnifiedTransactions: vi.fn(),
	getCurrency: vi.fn(),
	getCategories: vi.fn(),
	buildDashboardOverview: vi.fn(),
}));

vi.mock('@/server/lib/auth-guard', () => ({
	getAuthenticatedUser: mocks.getAuthenticatedUser,
}));
vi.mock('./dashboard.service', () => ({
	DashboardService: {
		getDashboardData: mocks.getDashboardData,
		getFinancialHealthScore: mocks.getFinancialHealthScore,
		getIncomeExpenseTrend: mocks.getIncomeExpenseTrend,
	},
}));
vi.mock('@/server/modules/budget/budget.service', () => ({
	BudgetService: { getBudgets: mocks.getBudgets },
}));
vi.mock('@/server/modules/transaction/transaction.service', () => ({
	TransactionService: {
		getUnifiedTransactions: mocks.getUnifiedTransactions,
	},
}));
vi.mock('@/server/modules/user/user.service', () => ({
	UserService: { getCurrency: mocks.getCurrency },
}));
vi.mock('@/server/modules/category/category.service', () => ({
	CategoryService: { getCategories: mocks.getCategories },
}));
vi.mock('./dashboard.presenter', () => ({
	buildDashboardOverview: mocks.buildDashboardOverview,
}));

import { getDashboardOverviewAction } from './dashboard.controller';

describe('getDashboardOverviewAction', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 7, 16, 9, 0, 0));
		mocks.getAuthenticatedUser.mockResolvedValue('user-1');
		mocks.getDashboardData.mockResolvedValue({
			accounts: [
				{
					id: 'a1',
					name: 'Main Bank',
					type: 'BANK',
					balance: '1200.50',
					isLiability: false,
					isArchived: false,
				},
			],
			netWorth: 1200.5,
			assets: 1200.5,
			liabilities: 0,
			savingsRate: 20,
			runwayMonths: 3,
			creditUtilization: 0,
			totalCreditUsed: 0,
			totalCreditLimit: 0,
			totalDebt: 0,
			debtPaydown: 0,
			debtToAssetRatio: 0,
			liquidAssets: 1200.5,
			ytdIncome: 5000,
			ytdExpense: 4000,
			income: 1000,
			expense: 700,
		});
		mocks.getFinancialHealthScore.mockResolvedValue({
			overallScore: 80,
			overallLabel: 'Good',
			pillars: [],
		});
		mocks.getIncomeExpenseTrend.mockResolvedValue([]);
		mocks.getBudgets.mockResolvedValue([
			{
				id: 'b1',
				name: 'Food',
				categoryId: 'c1',
				category: { name: 'Food' },
				amount: '1000',
				spent: 500,
				percentage: 50,
			},
		]);
		mocks.getUnifiedTransactions.mockResolvedValue({
			data: [],
			total: 0,
			page: 1,
			pageSize: 8,
		});
		mocks.getCurrency.mockResolvedValue('PHP');
		mocks.getCategories
			.mockResolvedValueOnce([{ id: 'i1', name: 'Salary' }])
			.mockResolvedValueOnce([{ id: 'e1', name: 'Food' }]);
		mocks.buildDashboardOverview.mockReturnValue({
			snapshotLabel: 'August 2026',
		});
	});

	it('authenticates, aggregates each source once, and normalizes money', async () => {
		const result = await getDashboardOverviewAction();

		expect(result).toEqual({
			success: true,
			data: { snapshotLabel: 'August 2026' },
		});
		expect(mocks.getDashboardData).toHaveBeenCalledOnce();
		expect(mocks.getUnifiedTransactions).toHaveBeenCalledWith('user-1', {
			page: 1,
			pageSize: 8,
			sortBy: 'date',
			sortOrder: 'desc',
		});
		expect(mocks.getBudgets).toHaveBeenCalledWith('user-1', {
			month: new Date(2026, 7, 16, 9, 0, 0),
		});
		expect(mocks.buildDashboardOverview).toHaveBeenCalledWith(
			expect.objectContaining({
				currency: 'PHP',
				dashboard: expect.objectContaining({
					accounts: [
						expect.objectContaining({ id: 'a1', balance: 1200.5 }),
					],
				}),
				budgets: [expect.objectContaining({ id: 'b1', amount: 1000 })],
			}),
			new Date(2026, 7, 16, 9, 0, 0)
		);
	});

	it('returns one safe error without exposing the thrown message', async () => {
		const consoleError = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		mocks.getDashboardData.mockRejectedValue(new Error('database details'));

		await expect(getDashboardOverviewAction()).resolves.toEqual({
			error: 'Failed to load dashboard',
		});
		expect(consoleError).toHaveBeenCalledWith(
			'Failed to load dashboard:',
			expect.any(Error)
		);
		consoleError.mockRestore();
	});
});
