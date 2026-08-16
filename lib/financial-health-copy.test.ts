import { describe, expect, it } from 'vitest';
import {
	HEALTH_LABEL_DESCRIPTIONS,
	HEALTH_PILLARS,
	getHealthLabelDescription,
	getPillarQuestion,
	orderHealthPillars,
} from './financial-health-copy';

describe('financial health copy contract', () => {
	it('keeps the five pillars in scoring order with exact weights', () => {
		expect(HEALTH_PILLARS).toEqual([
			{
				name: 'Solvency',
				weight: 0.25,
				question: 'Can you cover what you owe?',
			},
			{
				name: 'Liquidity',
				weight: 0.2,
				question: 'Can you survive an emergency?',
			},
			{
				name: 'Savings',
				weight: 0.2,
				question: 'Are you keeping enough of what you earn?',
			},
			{
				name: 'Debt Management',
				weight: 0.2,
				question: 'Is your debt under control?',
			},
			{
				name: 'Cash Flow',
				weight: 0.15,
				question: 'Is more coming in than going out?',
			},
		]);
	});

	it('preserves the aggressive Reports descriptions exactly', () => {
		expect(HEALTH_LABEL_DESCRIPTIONS).toEqual({
			Excellent:
				'Absolutely elite. Your finances are tighter than a NASA launch checklist. Banks wish they had your discipline.',
			Good:
				"You're doing well — genuinely. Most people would kill for this position. A couple of tweaks and you're untouchable.",
			Fair:
				"Not terrible, not great. You're the financial equivalent of a C+ student — passing, but nobody's putting you on the fridge.",
			'Needs Attention':
				"Your finances are held together with duct tape and denial. This isn't a warning, it's an intervention.",
			Critical:
				"Financially deceased. If your bank account was a patient, we'd be calling time of death. Fix this or start a GoFundMe.",
		});
		expect(getHealthLabelDescription('unknown')).toBe('');
	});

	it('orders incoming service pillars and resolves their questions', () => {
		const ordered = orderHealthPillars([
			{ name: 'Cash Flow', score: 20 },
			{ name: 'Solvency', score: 80 },
			{ name: 'Savings', score: 60 },
			{ name: 'Liquidity', score: 40 },
			{ name: 'Debt Management', score: 100 },
		]);

		expect(ordered.map((pillar) => pillar.name)).toEqual(
			HEALTH_PILLARS.map((pillar) => pillar.name)
		);
		expect(getPillarQuestion('Liquidity')).toBe(
			'Can you survive an emergency?'
		);
		expect(getPillarQuestion('Unknown')).toBe('');
	});
});
