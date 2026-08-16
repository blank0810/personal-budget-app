import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DashboardHeader } from '@/components/modules/dashboard/DashboardHeader';
import type { DashboardOverview } from '@/server/modules/dashboard/dashboard.types';

vi.mock('@/components/modules/dashboard/QuickActionSheet', () => ({
	useQuickAction: () => ({ openSheet: vi.fn() }),
}));

function availability(
	overrides: Partial<DashboardOverview['quickActions']['availability']> = {},
): DashboardOverview['quickActions']['availability'] {
	return {
		income: { enabled: true, disabledReason: null },
		expense: { enabled: true, disabledReason: null },
		transfer: { enabled: true, disabledReason: null },
		payment: { enabled: true, disabledReason: null },
		...overrides,
	};
}

describe('DashboardHeader', () => {
	it('keeps unavailable actions focusable and exposes a visible reason', () => {
		const markup = renderToStaticMarkup(
			createElement(DashboardHeader, {
				snapshotLabel: 'August 2026',
				availability: availability({
					transfer: {
						enabled: false,
						disabledReason: 'Add another account to transfer money.',
					},
				}),
			}),
		);

		expect(markup).toContain('aria-disabled="true"');
		expect(markup).toContain(
			'aria-describedby="dashboard-transfer-unavailable"',
		);
		expect(markup).toContain('id="dashboard-transfer-unavailable"');
		expect(markup).toContain('Add another account to transfer money.');
		expect(markup).not.toContain(' disabled=');
	});

	it('omits unavailable-action messaging when every action is enabled', () => {
		const markup = renderToStaticMarkup(
			createElement(DashboardHeader, {
				snapshotLabel: 'August 2026',
				availability: availability(),
			}),
		);

		expect(markup).not.toContain('aria-disabled="true"');
		expect(markup).not.toContain('dashboard-income-unavailable');
	});
});
