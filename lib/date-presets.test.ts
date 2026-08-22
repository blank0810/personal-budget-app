import { format } from 'date-fns';
import { describe, expect, it } from 'vitest';

import { DatePreset, resolveDatePreset } from './date-presets';

describe('resolveDatePreset', () => {
	it.each<{
		preset: DatePreset;
		from: string;
		to: string;
	}>([
		{
			preset: 'THIS_MONTH',
			from: '2026-08-01',
			to: '2026-08-31',
		},
		{
			preset: 'LAST_MONTH',
			from: '2026-07-01',
			to: '2026-07-31',
		},
		{
			preset: 'LAST_2_MONTHS',
			from: '2026-06-01',
			to: '2026-07-31',
		},
		{
			preset: 'LAST_3_MONTHS',
			from: '2026-05-01',
			to: '2026-07-31',
		},
		{
			preset: 'THIS_QUARTER',
			from: '2026-07-01',
			to: '2026-09-30',
		},
		{
			preset: 'THIS_YEAR',
			from: '2026-01-01',
			to: '2026-12-31',
		},
	])('resolves $preset as a calendar range', ({ preset, from, to }) => {
		const result = resolveDatePreset(preset, new Date(2026, 7, 22));

		expect(format(result.from, 'yyyy-MM-dd')).toBe(from);
		expect(format(result.to, 'yyyy-MM-dd')).toBe(to);
	});

	it('crosses the year boundary for the last three complete months', () => {
		const result = resolveDatePreset(
			'LAST_3_MONTHS',
			new Date(2026, 0, 15)
		);

		expect(format(result.from, 'yyyy-MM-dd')).toBe('2025-10-01');
		expect(format(result.to, 'yyyy-MM-dd')).toBe('2025-12-31');
	});
});
