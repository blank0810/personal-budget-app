import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CurrencyProvider } from '@/lib/contexts/currency-context';
import { RecommendationBadge } from './RecommendationBadge';

describe('RecommendationBadge', () => {
	it('renders insufficient history as a neutral state with the observed count', () => {
		const html = renderToStaticMarkup(
			<CurrencyProvider currency='PHP'>
				<RecommendationBadge
					recommendation='insufficient_history'
					suggestedAmount={null}
					currentAmount={500}
					trend='Building history (1/3 mo)'
				/>
			</CurrencyProvider>
		);

		expect(html).toContain('Building history (1/3 mo)');
		expect(html).not.toContain('Stable');
		expect(html).not.toContain('Increase');
	});
});
