import { describe, expect, it } from 'vitest';
import { parseInlineMarkdown } from './inline-markdown';
import { ChangelogService } from '@/server/modules/changelog/changelog.service';

describe('parseInlineMarkdown', () => {
	it('returns a single text token when there is no markup', () => {
		expect(parseInlineMarkdown('Plain sentence.')).toEqual([
			{ type: 'text', value: 'Plain sentence.' },
		]);
	});

	it('splits a bold lead-in from the sentence that follows it', () => {
		expect(
			parseInlineMarkdown('**Your position comes first.** Then the detail.')
		).toEqual([
			{ type: 'bold', value: 'Your position comes first.' },
			{ type: 'text', value: ' Then the detail.' },
		]);
	});

	it('recognises a code span', () => {
		expect(parseInlineMarkdown('Set `HOST_UID` before starting.')).toEqual([
			{ type: 'text', value: 'Set ' },
			{ type: 'code', value: 'HOST_UID' },
			{ type: 'text', value: ' before starting.' },
		]);
	});

	it('handles bold and code in the same string', () => {
		expect(
			parseInlineMarkdown('Stamps **PAID** with the `paidAt` date.')
		).toEqual([
			{ type: 'text', value: 'Stamps ' },
			{ type: 'bold', value: 'PAID' },
			{ type: 'text', value: ' with the ' },
			{ type: 'code', value: 'paidAt' },
			{ type: 'text', value: ' date.' },
		]);
	});

	it('recognises a single-asterisk italic', () => {
		expect(parseInlineMarkdown('Falls back to *Record as Sent* only.')).toEqual([
			{ type: 'text', value: 'Falls back to ' },
			{ type: 'italic', value: 'Record as Sent' },
			{ type: 'text', value: ' only.' },
		]);
	});

	it('reads a double asterisk as bold rather than two italics', () => {
		expect(parseInlineMarkdown('**Send to Client** — *Record as Sent*.')).toEqual([
			{ type: 'bold', value: 'Send to Client' },
			{ type: 'text', value: ' — ' },
			{ type: 'italic', value: 'Record as Sent' },
			{ type: 'text', value: '.' },
		]);
	});

	it('leaves an asterisk that opens before whitespace alone', () => {
		expect(
			parseInlineMarkdown('Consolidated prisma.user.* queries into 17 * methods.')
		).toEqual([
			{
				type: 'text',
				value: 'Consolidated prisma.user.* queries into 17 * methods.',
			},
		]);
	});

	it('does not treat underscores as emphasis', () => {
		const source = 'Files named expenses_january_2026_food.csv are fine.';
		expect(parseInlineMarkdown(source)).toEqual([
			{ type: 'text', value: source },
		]);
	});

	it('keeps asterisks inside a code span as literal text', () => {
		expect(parseInlineMarkdown('Run `a ** b` now.')).toEqual([
			{ type: 'text', value: 'Run ' },
			{ type: 'code', value: 'a ** b' },
			{ type: 'text', value: ' now.' },
		]);
	});

	it('keeps a glob inside a code span intact', () => {
		expect(parseInlineMarkdown('Skips `vitest.config.ts` and `*.test.ts`.')).toEqual([
			{ type: 'text', value: 'Skips ' },
			{ type: 'code', value: 'vitest.config.ts' },
			{ type: 'text', value: ' and ' },
			{ type: 'code', value: '*.test.ts' },
			{ type: 'text', value: '.' },
		]);
	});

	it('leaves an unbalanced delimiter verbatim rather than swallowing it', () => {
		expect(parseInlineMarkdown('**Half open and `unclosed')).toEqual([
			{ type: 'text', value: '**Half open and `unclosed' },
		]);
	});

	it('returns no tokens for an empty string', () => {
		expect(parseInlineMarkdown('')).toEqual([]);
	});
});

describe('changelog content', () => {
	/** Every authored string the changelog UI renders through InlineMarkdown. */
	function renderedStrings(): string[] {
		return ChangelogService.getAllVersions()
			.flatMap((version) => [
				version.description,
				...version.features.flatMap((feature) => [
					feature.title,
					...feature.items,
				]),
				...(version.patches ?? []).flatMap((patch) => [
					patch.title,
					patch.description,
					...(patch.features ?? []).flatMap((feature) => [
						feature.title,
						...feature.items,
					]),
				]),
			])
			.filter((value): value is string => typeof value === 'string');
	}

	/**
	 * A lone asterisk survives on purpose — `prisma.user.*` is prose, not markup.
	 * A pair of them left in one text run is not: it means an entry opened
	 * emphasis the parser could not close, which is what readers saw as `**`.
	 */
	function hasUnrenderedMarkup(value: string): boolean {
		return parseInlineMarkdown(value).some(
			(token) =>
				token.type === 'text' &&
				((token.value.match(/\*/g)?.length ?? 0) >= 2 ||
					token.value.includes('`'))
		);
	}

	it('leaves no stray delimiter in any rendered changelog string', () => {
		expect(renderedStrings().filter(hasUnrenderedMarkup)).toEqual([]);
	});

	it('keeps version titles free of markup, since they also feed metadata', () => {
		const withMarkup = ChangelogService.getAllVersions()
			.map((version) => version.title)
			.filter((title) => title.includes('*') || title.includes('`'));

		expect(withMarkup).toEqual([]);
	});
});
