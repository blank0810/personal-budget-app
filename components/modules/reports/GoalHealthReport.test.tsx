import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CurrencyProvider } from '@/lib/contexts/currency-context';
import type { GoalHealthSummary } from '@/server/modules/goal/goal.types';
import { GoalHealthReport } from './GoalHealthReport';

const goalHealth: GoalHealthSummary = {
	goals: [
		{
			id: 'goal-1',
			name: 'Emergency Fund',
			goalType: 'MONTHS_COVERAGE',
			isEmergencyFund: true,
			balance: 6000,
			targetAmount: null,
			progressPercent: 50,
			monthsCoverage: 2.5,
			healthStatus: 'underfunded',
			thresholds: { low: 1, mid: 3, high: 6 },
		},
	],
	totalGoalBalance: 6000,
	hasEmergencyFund: true,
	emergencyFundMonths: 2.5,
	emergencyFundHealth: 'underfunded',
	emergencyFundExpenseSource: 'actual',
	monthlyExpenseBaseline: 2400,
};

describe('GoalHealthReport coverage basis copy', () => {
	it('supports both the emergency-fund summary and goal coverage figures', () => {
		const html = renderToStaticMarkup(
			<CurrencyProvider currency='PHP'>
				<GoalHealthReport goalHealth={goalHealth} />
			</CurrencyProvider>
		);

		expect(html).toContain('2.5 months');
		expect(html).toContain('2.5 months coverage');
		expect(
			html.match(/Based on your last 3 complete months/g)
		).toHaveLength(2);
	});
});
