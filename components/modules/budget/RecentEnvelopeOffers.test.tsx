import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CurrencyProvider } from '@/lib/contexts/currency-context';
import { RecentEnvelopeOffers } from './RecentEnvelopeOffers';

describe('RecentEnvelopeOffers', () => {
	it('shows historical context without deciding or prefilling a target', () => {
		const html = renderToStaticMarkup(
			<CurrencyProvider currency='PHP'>
				<RecentEnvelopeOffers
					suggestions={[
						{
							categoryId: 'category-rent',
							categoryName: 'Rent',
							recentAverage: 12500,
							monthsObserved: 3,
						},
					]}
					onSelectCategory={vi.fn()}
				/>
			</CurrencyProvider>
		);

		expect(html).toContain('your recent average');
		expect(html).toContain('₱12,500.00');
		expect(html).toContain('type the target that fits your plan');
		expect(html).toContain('Use category');
		expect(html.toLowerCase()).not.toContain('recommended');
		expect(html).not.toContain('<input');
	});

	it('renders nothing when no category has trailing activity', () => {
		const html = renderToStaticMarkup(
			<CurrencyProvider currency='USD'>
				<RecentEnvelopeOffers
					suggestions={[]}
					onSelectCategory={vi.fn()}
				/>
			</CurrencyProvider>
		);

		expect(html).toBe('');
	});
});
