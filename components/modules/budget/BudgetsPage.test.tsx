import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const mocks = vi.hoisted(() => ({
	auth: vi.fn(),
	getBudgetsWithCoverage: vi.fn(),
	getCategories: vi.fn(),
	getBudgetsPageData: vi.fn(),
	getBudgetHealthSummary: vi.fn(),
	getCategorySpendComparison: vi.fn(),
	getInferredEnvelopeOffer: vi.fn(),
	budgetViewsProps: vi.fn(),
}));

vi.mock('@/auth', () => ({
	auth: mocks.auth,
}));

vi.mock('next/navigation', () => ({
	redirect: vi.fn(),
}));

vi.mock('@/server/modules/budget/budget.service', () => ({
	BudgetService: {
		getBudgetsWithCoverage: mocks.getBudgetsWithCoverage,
	},
}));

vi.mock('@/server/modules/category/category.service', () => ({
	CategoryService: {
		getCategories: mocks.getCategories,
	},
}));

vi.mock('@/server/modules/budget/budget.controller', () => ({
	getBudgetsPageDataAction: mocks.getBudgetsPageData,
	getBudgetHealthSummaryAction: mocks.getBudgetHealthSummary,
	getCategorySpendComparisonAction: mocks.getCategorySpendComparison,
	getInferredEnvelopeOfferAction: mocks.getInferredEnvelopeOffer,
}));

vi.mock('./BudgetForm', () => ({
	BudgetForm: () => <div>Budget form</div>,
}));

vi.mock('./BudgetHealthSummary', () => ({
	BudgetHealthSummary: () => <div>Budget health</div>,
}));

vi.mock('./CategorySpendComparison', () => ({
	CategorySpendComparison: () => <div>Category comparison</div>,
}));

vi.mock('./BudgetViews', () => ({
	BudgetViews: (props: unknown) => {
		mocks.budgetViewsProps(props);
		return <div>Budget views</div>;
	},
}));

import BudgetsPage from '@/app/(authenticated)/budgets/page';

describe('BudgetsPage route month', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.auth.mockResolvedValue({ user: { id: 'user-1' } });
		mocks.getBudgetsWithCoverage.mockResolvedValue([]);
		mocks.getCategories.mockResolvedValue([]);
		mocks.getBudgetHealthSummary.mockResolvedValue({
			success: true,
			data: { hasBudgets: true },
		});
	});

	it('awaits searchParams and passes the coherent controller result to the views', async () => {
		const month = new Date(Date.UTC(2026, 6, 1, 0, 0, 0, 0));
		const budgets = [{ id: 'budget-july' }];
		const yearOverview = [{ month, monthLabel: 'Jul 2026' }];
		const availableMonths = [month];
		mocks.getBudgetsPageData.mockResolvedValue({
			month,
			budgets,
			yearOverview,
			availableMonths,
		});

		const page = await (
			BudgetsPage as unknown as (props: {
				searchParams: Promise<{ month?: string }>;
			}) => Promise<React.ReactNode>
		)({
			searchParams: Promise.resolve({ month: '2026-07' }),
		});
		renderToStaticMarkup(page);

		expect(mocks.getBudgetsPageData).toHaveBeenCalledWith('2026-07');
		expect(mocks.getBudgetHealthSummary).toHaveBeenCalledWith(month);
		expect(mocks.budgetViewsProps).toHaveBeenCalledWith({
			budgets,
			yearOverview,
			availableMonths,
			initialMonth: month,
		});
	});
});
