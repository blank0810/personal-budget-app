import { describe, expect, it } from 'vitest';
import { HEALTH_LABEL_DESCRIPTIONS } from '@/lib/financial-health-copy';
import {
	buildDashboardOverview,
	type DashboardOverviewSource,
} from './dashboard.presenter';

function makeSource(): DashboardOverviewSource {
	return {
		currency: 'PHP',
		dashboard: {
			accounts: [
				{
					id: 'asset-1',
					name: 'Main Bank',
					type: 'BANK',
					balance: 20000,
					isLiability: false,
					isArchived: false,
				},
				{
					id: 'debt-1',
					name: 'Credit Account',
					type: 'CREDIT',
					balance: 5000,
					isLiability: true,
					isArchived: false,
				},
			],
			netWorth: 15000,
			assets: 20000,
			liabilities: 5000,
			savingsRate: 20,
			runwayMonths: 2.5,
			creditUtilization: 25,
			totalCreditUsed: 5000,
			totalCreditLimit: 20000,
			totalDebt: 5000,
			debtPaydown: 1000,
			debtToAssetRatio: 25,
			liquidAssets: 20000,
			ytdIncome: 100000,
			ytdExpense: 80000,
			income: 20000,
			expense: 15000,
		},
		health: {
			overallScore: 68,
			overallLabel: 'Fair',
			pillars: [
				{
					name: 'Cash Flow',
					score: 80,
					grade: 'B',
					weight: 0.15,
					details: 'Cash-flow detail.',
					recommendation: 'Keep the monthly gap positive.',
				},
				{
					name: 'Debt Management',
					score: 60,
					grade: 'C',
					weight: 0.2,
					details: 'Debt detail.',
					recommendation: 'Pay more than the minimum.',
				},
				{
					name: 'Savings',
					score: 80,
					grade: 'B',
					weight: 0.2,
					details: 'Savings detail.',
					recommendation: 'Keep saving consistently.',
				},
				{
					name: 'Liquidity',
					score: 60,
					grade: 'C',
					weight: 0.2,
					details: 'Liquidity detail.',
					recommendation: 'Build three months of runway.',
				},
				{
					name: 'Solvency',
					score: 60,
					grade: 'C',
					weight: 0.25,
					details: 'Solvency detail.',
					recommendation: 'Reduce the debt-to-asset ratio.',
				},
			],
		},
		trend: [
			{ month: 'Mar', income: 10000, expense: 9000 },
			{ month: 'Apr', income: 12000, expense: 10000 },
			{ month: 'May', income: 15000, expense: 11000 },
			{ month: 'Jun', income: 16000, expense: 14000 },
			{ month: 'Jul', income: 18000, expense: 16000 },
			{ month: 'Aug', income: 20000, expense: 15000 },
		],
		budgets: [
			{
				id: 'b1',
				name: 'Food',
				categoryId: 'c1',
				categoryName: 'Food',
				amount: 10000,
				spent: 9500,
				percentage: 95,
			},
			{
				id: 'b2',
				name: 'Housing',
				categoryId: 'c2',
				categoryName: 'Housing',
				amount: 15000,
				spent: 12000,
				percentage: 80,
			},
			{
				id: 'b3',
				name: 'Transport',
				categoryId: 'c3',
				categoryName: 'Transportation',
				amount: 5000,
				spent: 5500,
				percentage: 110,
			},
			{
				id: 'b4',
				name: 'Utilities',
				categoryId: 'c4',
				categoryName: 'Utilities',
				amount: 4000,
				spent: 2000,
				percentage: 50,
			},
		],
		incomeCategories: [{ id: 'income-cat', name: 'Salary' }],
		expenseCategories: [{ id: 'expense-cat', name: 'Food' }],
		transactions: [
			{
				kind: 'income',
				id: 'i1',
				amount: 20000,
				date: '2026-08-15T00:00:00.000Z',
				description: 'Paycheck',
				accountName: 'Main Bank',
				categoryName: 'Salary',
			},
			{
				kind: 'expense',
				id: 'e1',
				amount: 1200,
				date: '2026-08-14T00:00:00.000Z',
				description: 'Groceries',
				accountName: 'Main Bank',
				categoryName: 'Food',
				budgetName: 'Food',
			},
			{
				kind: 'transfer',
				id: 't1',
				amount: 1000,
				date: '2026-08-13T00:00:00.000Z',
				description: null,
				fromAccountName: 'Main Bank',
				toAccountName: 'Savings',
				fee: 0,
				isPayment: false,
			},
			{
				kind: 'transfer',
				id: 'p1',
				amount: 500,
				date: '2026-08-12T00:00:00.000Z',
				description: null,
				fromAccountName: 'Main Bank',
				toAccountName: 'Credit Account',
				fee: 0,
				isPayment: true,
			},
		],
	};
}

describe('buildDashboardOverview', () => {
	it('withholds a verdict when only a tithe account exists', () => {
		const source = makeSource();
		source.dashboard.accounts = [
			{
				id: 'tithe-1',
				name: 'Tithe',
				type: 'TITHE',
				balance: 0,
				isLiability: false,
				isArchived: false,
			},
		];
		source.dashboard.ytdIncome = 0;
		source.dashboard.ytdExpense = 0;

		const result = buildDashboardOverview(source, new Date(2026, 7, 16));

		expect(result.dataQuality).toBe('empty');
		expect(result.health.verdict).toBeNull();
		expect(result.quickActions.availability.income).toEqual({
			enabled: false,
			disabledReason: 'Add an account first',
		});
	});

	it('marks flow-dependent pillars as needing data for a partial account', () => {
		const source = makeSource();
		source.dashboard.ytdIncome = 0;
		source.dashboard.ytdExpense = 0;

		const result = buildDashboardOverview(source, new Date(2026, 7, 16));

		expect(result.dataQuality).toBe('partial');
		expect(result.health.verdict).toBeNull();
		expect(
			result.health.pillars
				.filter((pillar) => pillar.status === 'needs-data')
				.map((pillar) => pillar.name)
		).toEqual(['Savings', 'Cash Flow']);
	});

	it('shows the shared overall description for complete data', () => {
		const result = buildDashboardOverview(
			makeSource(),
			new Date(2026, 7, 16)
		);

		expect(result.dataQuality).toBe('complete');
		expect(result.health.verdict?.description).toBe(
			HEALTH_LABEL_DESCRIPTIONS.Fair
		);
	});

	it('uses score, weight, then canonical order to choose the focus pillar', () => {
		const result = buildDashboardOverview(
			makeSource(),
			new Date(2026, 7, 16)
		);

		expect(result.health.verdict?.focus).toEqual({
			pillarName: 'Solvency',
			grade: 'C',
			recommendation: 'Reduce the debt-to-asset ratio.',
			action: { kind: 'link', href: '/accounts', label: 'Review debt' },
		});
	});

	it('links all-A health to Reports instead of inventing a weakness', () => {
		const source = makeSource();
		source.health.pillars = source.health.pillars.map((pillar) => ({
			...pillar,
			score: 100,
			grade: 'A',
		}));
		source.health.overallScore = 100;
		source.health.overallLabel = 'Excellent';

		const result = buildDashboardOverview(source, new Date(2026, 7, 16));

		expect(result.health.verdict?.focus).toEqual({
			pillarName: null,
			grade: null,
			recommendation: 'All five pillars are graded A.',
			action: { kind: 'link', href: '/reports', label: 'Open full report' },
		});
	});

	it('orders pillars and maps their evidence and actions', () => {
		const result = buildDashboardOverview(
			makeSource(),
			new Date(2026, 7, 16)
		);

		expect(result.snapshotLabel).toBe('August 2026');
		expect(result.health.pillars.map((pillar) => pillar.name)).toEqual([
			'Solvency',
			'Liquidity',
			'Savings',
			'Debt Management',
			'Cash Flow',
		]);
		expect(result.health.pillars[0].evidence).toBe('25.0% debt-to-asset');
		expect(result.health.pillars[3].action).toEqual({
			kind: 'quick-action',
			action: 'payment',
			label: 'Pay down debt',
		});
	});

	it('keeps only the three highest-pressure budgets', () => {
		const result = buildDashboardOverview(
			makeSource(),
			new Date(2026, 7, 16)
		);

		expect(result.budgetPressure.items.map((budget) => budget.id)).toEqual([
			'b3',
			'b1',
			'b2',
		]);
	});

	it('preserves income, expense, transfer, and payment activity types', () => {
		const result = buildDashboardOverview(
			makeSource(),
			new Date(2026, 7, 16)
		);

		expect(result.recentActivity.map((item) => item.kind)).toEqual([
			'income',
			'expense',
			'transfer',
			'payment',
		]);
	});

	it('returns JSON-safe values and enables valid quick actions', () => {
		const result = buildDashboardOverview(
			makeSource(),
			new Date(2026, 7, 16)
		);

		expect(JSON.parse(JSON.stringify(result))).toEqual(result);
		expect(result.quickActions.availability).toEqual({
			income: { enabled: true, disabledReason: null },
			expense: { enabled: true, disabledReason: null },
			transfer: { enabled: true, disabledReason: null },
			payment: { enabled: true, disabledReason: null },
		});
	});

	it('treats liability credits as zero debt instead of negative debt', () => {
		const source = makeSource();
		source.dashboard.totalDebt = -500;
		source.dashboard.liabilities = -500;
		source.dashboard.debtToAssetRatio = -2.5;
		source.dashboard.creditUtilization = -2.5;

		const result = buildDashboardOverview(source, new Date(2026, 7, 16));

		expect(result.health.pillars[0].evidence).toBe('Debt-free');
		expect(result.health.pillars[3].evidence).toBe('Debt-free');
		expect(result.health.pillars[3].action).toEqual({
			kind: 'link',
			href: '/accounts',
			label: 'Review accounts',
		});
		expect(result.accountsDebt).toMatchObject({
			liabilities: 0,
			creditUtilization: 0,
		});
	});
});
