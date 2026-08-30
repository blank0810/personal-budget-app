import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { CurrencyProvider } from '@/lib/contexts/currency-context';

vi.mock('recharts', () => ({
	Bar: () => null,
	Line: () => null,
	ComposedChart: ({ children }: { children: ReactNode }) => (
		<div>{children}</div>
	),
	ResponsiveContainer: ({ children }: { children: ReactNode }) => (
		<div>{children}</div>
	),
	XAxis: () => null,
	YAxis: () => null,
	Tooltip: () => null,
	Legend: () => null,
	CartesianGrid: () => null,
}));

import { BudgetAnalytics } from './BudgetAnalytics';

describe('Reports BudgetAnalytics recommendation history gate', () => {
	it('renders insufficient history neutrally in both the trend and badge cells', () => {
		const html = renderToStaticMarkup(
			<CurrencyProvider currency='PHP'>
				<BudgetAnalytics
					trends={[
						{
							month: new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0)),
							monthLabel: 'Aug 2026',
							totalBudgeted: 500,
							totalSpent: 400,
							savings: 100,
							adherencePercent: 80,
							categoriesOnTrack: 1,
							categoriesOver: 0,
							totalCategories: 1,
						},
					]}
					recommendations={[
						{
							categoryId: 'category-food',
							categoryName: 'Food',
							monthsAnalyzed: 1,
							avgBudget: 500,
							avgSpent: 400,
							variance: -20,
							monthsOver: 0,
							monthsUnder: 0,
							recommendation: 'insufficient_history',
							suggestedAmount: null,
							trend: 'Building history (1/3 mo)',
						},
					]}
				/>
			</CurrencyProvider>
		);

		expect(html.match(/Building history \(1\/3 mo\)/g)).toHaveLength(2);
		expect(html).not.toContain('On track');
	});
});
