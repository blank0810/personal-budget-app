import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { HealthLedger } from '@/components/modules/dashboard/HealthLedger';
import type { DashboardOverview } from '@/server/modules/dashboard/dashboard.types';

vi.mock('@/components/modules/dashboard/QuickActionSheet', () => ({
	useQuickAction: () => ({ openSheet: vi.fn() }),
}));

const pillars: DashboardOverview['health']['pillars'] = [
	{
		name: 'Solvency',
		question: 'Can you cover what you owe?',
		weight: 0.25,
		score: 100,
		grade: 'A',
		status: 'supported',
		tone: 'positive',
		evidence: 'Debt-free',
		recommendation: null,
		action: { kind: 'link', href: '/accounts', label: 'Review debt' },
	},
	{
		name: 'Liquidity',
		question: 'Can you survive an emergency?',
		weight: 0.2,
		score: 50,
		grade: 'D',
		status: 'supported',
		tone: 'negative',
		evidence: 'One month of runway',
		recommendation: 'Build your buffer.',
		action: {
			kind: 'link',
			href: '/goals',
			label: 'Build your emergency buffer',
		},
	},
];

describe('HealthLedger desktop layout', () => {
	it('keeps the header and every row on one shared column grid', () => {
		const markup = renderToStaticMarkup(
			createElement(HealthLedger, { pillars }),
		);

		const sharedGridDefinitions = markup.match(
			/md:grid-cols-\[minmax\(0,1\.2fr\)_7rem_minmax\(0,1fr\)\]/g,
		);

		expect(sharedGridDefinitions).toHaveLength(pillars.length + 1);
	});
});
