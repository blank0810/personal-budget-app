import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import type { MonthlyDigest } from './report.types';

const mocks = vi.hoisted(() => ({
	fontRegister: vi.fn(),
	renderToBuffer: vi.fn(),
}));

vi.mock('@react-pdf/renderer', async () => {
	const { createElement } = await import('react');
	const Element = ({ children }: { children?: ReactNode }) =>
		createElement('div', null, children);

	return {
		Document: Element,
		Page: Element,
		Text: Element,
		View: Element,
		StyleSheet: { create: <T,>(styles: T) => styles },
		Font: { register: mocks.fontRegister },
		renderToBuffer: mocks.renderToBuffer,
	};
});

import { renderMonthlyReportPDF } from './report.templates';

const digest: MonthlyDigest = {
	userId: 'user-1',
	userName: 'Demo User',
	userEmail: 'demo@example.com',
	currency: 'PHP',
	month: 'August 2026',
	sections: {
		healthScore: {
			score: 70,
			label: 'Building',
			roast: 'Keep building your financial cushion.',
			focusPillar: 'Liquidity',
			topRecommendation: 'Continue funding your emergency goal.',
		},
		goals: {
			accounts: [
				{
					name: 'Emergency Fund',
					balance: 6000,
					progress: 50,
					goalType: 'MONTHS_COVERAGE',
					monthsCoverage: 2.5,
				},
			],
			emergencyFundMonths: 2.5,
		},
		netWorth: {
			current: 10000,
			previousMonth: 9000,
			change: 1000,
			changePercent: 11.1,
		},
	},
};

describe('monthly report goal coverage basis copy', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.renderToBuffer.mockImplementation(async (document: ReactNode) =>
			Buffer.from(renderToStaticMarkup(document))
		);
	});

	it('supports both coverage figures in the PDF report', async () => {
		const report = await renderMonthlyReportPDF(digest);
		const html = report.toString();

		expect(mocks.renderToBuffer).toHaveBeenCalledOnce();
		expect(html).toContain('2.5mo');
		expect(html).toContain('2.5 months');
		expect(
			html.match(/Based on your last 3 complete months/g)
		).toHaveLength(2);
	});
});
