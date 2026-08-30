import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CurrencyProvider } from '@/lib/contexts/currency-context';
import { BudgetForm } from './BudgetForm';

vi.mock('next/navigation', () => ({
	useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock('@/server/modules/budget/budget.controller', () => ({
	createBudgetAction: vi.fn(),
}));

describe('BudgetForm recent envelope offer', () => {
	it('keeps the amount input empty while showing the historical figure', () => {
		const html = renderToStaticMarkup(
			<CurrencyProvider currency='PHP'>
				<BudgetForm
					categories={[
						{
							id: 'category-food',
							name: 'Food',
							type: 'EXPENSE',
							icon: null,
							color: null,
							userId: 'user-1',
							createdAt: new Date(2026, 0, 1),
							updatedAt: new Date(2026, 0, 1),
						},
					]}
					envelopeSuggestions={[
						{
							categoryId: 'category-food',
							categoryName: 'Food',
							recentAverage: 425,
							monthsObserved: 3,
						},
					]}
				/>
			</CurrencyProvider>
		);

		expect(html).toContain('your recent average');
		expect(html).toContain('₱425.00');
		expect(html).toContain('placeholder="0.00"');
		expect(html).toContain('value=""');
		expect(html).not.toContain('value="425"');
	});
});
