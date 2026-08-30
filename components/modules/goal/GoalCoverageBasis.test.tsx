import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { CurrencyProvider } from '@/lib/contexts/currency-context';
import type { GoalCardData } from './GoalCard';

const mocks = vi.hoisted(() => ({
	execute: vi.fn(),
}));

vi.mock('@/server/modules/goal/goal.controller', () => ({
	archiveGoalAction: vi.fn(),
	completeGoalAction: vi.fn(),
	deleteGoalAction: vi.fn(),
}));

vi.mock('@/hooks/use-server-action', () => ({
	useServerAction: () => ({
		execute: mocks.execute,
		isPending: false,
	}),
}));

vi.mock('./AddContributionDialog', () => ({
	AddContributionDialog: () => null,
}));

vi.mock('@/components/ui/dialog', async () => {
	const { createElement } = await import('react');
	const Wrapper = ({ children }: { children?: ReactNode }) =>
		createElement('div', null, children);

	return {
		Dialog: Wrapper,
		DialogContent: Wrapper,
		DialogHeader: Wrapper,
		DialogTitle: Wrapper,
	};
});

import { GoalCard } from './GoalCard';
import { GoalDetailDialog } from './GoalDetailDialog';

const coverageGoal: GoalCardData = {
	id: 'goal-1',
	name: 'Emergency Fund',
	targetAmount: 0,
	currentAmount: 6000,
	deadline: null,
	icon: 'shield',
	color: 'blue',
	status: 'ACTIVE',
	goalType: 'MONTHS_COVERAGE',
	isEmergencyFund: true,
	thresholdLow: 1,
	thresholdMid: 3,
	thresholdHigh: 6,
	linkedAccount: { id: 'account-1', name: 'Savings' },
	_count: { contributions: 0 },
	monthsCoverage: 2.5,
	healthStatus: 'underfunded',
};

const basisCopy = 'Based on your last 3 complete months';

describe('Goal coverage basis copy', () => {
	it('supports the coverage figure on the full goal card', () => {
		const html = renderToStaticMarkup(
			<CurrencyProvider currency='PHP'>
				<GoalCard goal={coverageGoal} />
			</CurrencyProvider>
		);

		expect(html).toContain('2.5 months');
		expect(html.match(new RegExp(basisCopy, 'g'))).toHaveLength(1);
	});

	it('supports the coverage figure on the compact goal card', () => {
		const html = renderToStaticMarkup(
			<CurrencyProvider currency='PHP'>
				<GoalCard goal={coverageGoal} compact />
			</CurrencyProvider>
		);

		expect(html).toContain('2.5mo');
		expect(html.match(new RegExp(basisCopy, 'g'))).toHaveLength(1);
	});

	it('supports the coverage figure in the goal detail dialog', () => {
		const html = renderToStaticMarkup(
			<CurrencyProvider currency='PHP'>
				<GoalDetailDialog goal={coverageGoal} onClose={vi.fn()} />
			</CurrencyProvider>
		);

		expect(html).toContain('2.5 months of coverage');
		expect(html.match(new RegExp(basisCopy, 'g'))).toHaveLength(1);
	});
});
