export const HEALTH_PILLARS = [
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
] as const;

export type HealthPillarName = (typeof HEALTH_PILLARS)[number]['name'];

export const HEALTH_LABEL_DESCRIPTIONS = {
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
} as const;

const PILLAR_INDEX = new Map<string, number>(
	HEALTH_PILLARS.map((pillar, index) => [pillar.name, index])
);

export function getHealthLabelDescription(label: string): string {
	return (
		HEALTH_LABEL_DESCRIPTIONS[
			label as keyof typeof HEALTH_LABEL_DESCRIPTIONS
		] ?? ''
	);
}

export function getPillarQuestion(name: string): string {
	return HEALTH_PILLARS.find((pillar) => pillar.name === name)?.question ?? '';
}

export function orderHealthPillars<T extends { name: string }>(
	pillars: readonly T[]
): T[] {
	return [...pillars].sort(
		(a, b) =>
			(PILLAR_INDEX.get(a.name) ?? Number.MAX_SAFE_INTEGER) -
			(PILLAR_INDEX.get(b.name) ?? Number.MAX_SAFE_INTEGER)
	);
}
