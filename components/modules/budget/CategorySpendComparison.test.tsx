import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CurrencyProvider } from '@/lib/contexts/currency-context';
import { CategorySpendComparison } from './CategorySpendComparison';

describe('CategorySpendComparison', () => {
	it('renders biggest movers with the user currency and no invented infinite percentage', () => {
		const html = renderToStaticMarkup(
			<CurrencyProvider currency='PHP'>
				<CategorySpendComparison
					month={new Date(2026, 7, 1)}
					items={[
						{
							categoryId: 'category-food',
							categoryName: 'Food',
							currentTotal: 500.1,
							previousTotal: 100.05,
							amountDelta: 400.05,
							absoluteDelta: 400.05,
							percentDelta: 399.85007496251876,
						},
						{
							categoryId: 'category-rent',
							categoryName: 'Rent',
							currentTotal: 150.25,
							previousTotal: 0,
							amountDelta: 150.25,
							absoluteDelta: 150.25,
							percentDelta: null,
						},
					]}
				/>
			</CurrencyProvider>
		);

		expect(html).toContain('Biggest movers');
		expect(html).toContain('Food');
		expect(html).toContain('₱500.10');
		expect(html).toContain('No prior-month spend');
		expect(html).not.toContain('Infinity');
		expect(html.indexOf('Food')).toBeLessThan(html.indexOf('Rent'));
	});

	it('states what will appear when there is no category activity to compare', () => {
		const html = renderToStaticMarkup(
			<CurrencyProvider currency='USD'>
				<CategorySpendComparison
					month={new Date(2026, 7, 1)}
					items={[]}
				/>
			</CurrencyProvider>
		);

		expect(html).toContain('No category activity to compare yet');
		expect(html).toContain(
			'Log expenses to see month-over-month movement here.'
		);
	});
});
