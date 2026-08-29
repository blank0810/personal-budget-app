import { HEALTH_PILLARS } from '@/lib/financial-health-copy';

/**
 * sample-reading.ts — the one sample health reading shown publicly.
 *
 * Honesty (PRODUCT.md rules 1 and 5): these are NOT statistics about
 * users, savings or accuracy. They are one illustrative output of the
 * scorer, and every surface that renders them labels it as a sample.
 *
 * Pillar names, weights and questions are imported from
 * `lib/financial-health-copy` — the same module the authenticated
 * dashboard reads — so the marketing site can never drift from the
 * product's actual five pillars. The thresholds below mirror
 * `gradeFromScore` and the overall label ladder in
 * server/modules/dashboard/dashboard.service.ts.
 *
 * The scores are deliberately unflattering. A sample that graded 92
 * would be marketing; 68 is what the product actually tends to say.
 */
const SAMPLE_SCORES: Record<string, number> = {
	Solvency: 78,
	Liquidity: 45,
	Savings: 58,
	'Debt Management': 82,
	'Cash Flow': 77,
};

/** Mirrors gradeFromScore() in dashboard.service.ts. */
export function gradeFor(score: number): string {
	if (score >= 100) return 'A';
	if (score >= 80) return 'B';
	if (score >= 60) return 'C';
	if (score >= 40) return 'D';
	return 'F';
}

/** Mirrors the overallLabel ladder in dashboard.service.ts. */
export function labelFor(score: number): string {
	if (score >= 90) return 'Excellent';
	if (score >= 75) return 'Good';
	if (score >= 60) return 'Fair';
	if (score >= 40) return 'Needs Attention';
	return 'Critical';
}

export const SAMPLE_PILLARS = HEALTH_PILLARS.map((pillar) => {
	const score = SAMPLE_SCORES[pillar.name] ?? 0;

	return {
		name: pillar.name,
		question: pillar.question,
		weight: pillar.weight,
		score,
		grade: gradeFor(score),
	};
});

/** Weighted total, computed the same way the service does. */
export const SAMPLE_SCORE = Math.round(
	SAMPLE_PILLARS.reduce((sum, p) => sum + p.score * p.weight, 0),
);

export const SAMPLE_LABEL = labelFor(SAMPLE_SCORE);
