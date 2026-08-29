import { HEALTH_PILLARS } from '@/lib/financial-health-copy';

/**
 * sample-reading.ts — the one sample health reading shown on the public
 * site.
 *
 * Honesty (PRODUCT.md rules 1 and 5): these are NOT statistics about
 * users, savings, or accuracy. They are one illustrative output of the
 * scorer, and every surface that renders them labels them as a sample.
 * Nothing here may be presented as a claim about real people.
 *
 * The pillar names, weights and questions are imported from
 * `lib/financial-health-copy` — the same module the authenticated
 * dashboard reads — so the marketing page can never drift from the
 * product's actual five pillars. The grade thresholds below mirror
 * `gradeFromScore` in dashboard.service.ts (A ≥100, B ≥80, C ≥60,
 * D ≥40, else F) and the overall label thresholds beneath it.
 *
 * The scores are deliberately unflattering. A sample that grades 92
 * would be marketing; 68 is what the product actually tends to say.
 */

const SAMPLE_SCORES: Record<string, number> = {
	Solvency: 78,
	Liquidity: 45,
	Savings: 58,
	'Debt Management': 82,
	'Cash Flow': 77,
};

/** Mirrors gradeFromScore() in server/modules/dashboard/dashboard.service.ts. */
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
		/** Five-segment meter fill. */
		segments: Math.round(score / 20),
	};
});

/** Weighted total, computed the same way the service does. */
export const SAMPLE_SCORE = Math.round(
	SAMPLE_PILLARS.reduce((sum, p) => sum + p.score * p.weight, 0),
);

export const SAMPLE_LABEL = labelFor(SAMPLE_SCORE);
