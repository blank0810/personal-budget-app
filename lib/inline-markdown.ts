/**
 * Minimal inline-markdown tokenizer for authored (non-user) content.
 *
 * Changelog entries live in `content/changelog/*.md` and carry their prose in
 * YAML front matter, so nothing ever runs them through a markdown renderer —
 * React prints the raw string and readers see literal `**`, `*` and backticks.
 *
 * This turns that string into tokens the UI maps to `<strong>` / `<em>` /
 * `<code>`, which keeps the rendering escaped (no `dangerouslySetInnerHTML`)
 * and avoids pulling a full markdown pipeline in for three inline constructs.
 *
 * Deliberately narrow:
 * - Only `**bold**`, `*italic*` and `` `code` `` are recognised. Underscores are
 *   NOT emphasis — the entries are full of `snake_case` filenames and setting
 *   keys (`invoice_due_days`, `expenses_january_2026_food.csv`) that would be
 *   mangled by it.
 * - Emphasis may not open before whitespace or close after it, so prose like
 *   `prisma.user.* queries` and `5 * 3` keeps its asterisks.
 * - Constructs do not nest, and anything unbalanced is left verbatim rather
 *   than silently swallowed.
 *
 * Intended for content the maintainer writes; do NOT use it on user-submitted
 * text (feature requests), which should stay plain.
 */
export type InlineToken =
	| { type: 'text'; value: string }
	| { type: 'bold'; value: string }
	| { type: 'italic'; value: string }
	| { type: 'code'; value: string };

/**
 * One pass over all three constructs so the delimiter that opens first wins:
 * `**` is tried before `*` (otherwise every bold would parse as two italics),
 * and a code span keeps the asterisks inside it — `` `*.test.ts` `` stays a
 * filename instead of becoming an emphasis marker.
 */
const INLINE_PATTERN =
	/\*\*([\s\S]+?)\*\*|`([^`]+)`|\*(?!\s)([^*\n]+?)(?<!\s)\*/g;

export function parseInlineMarkdown(source: string): InlineToken[] {
	const tokens: InlineToken[] = [];
	let cursor = 0;

	for (const match of source.matchAll(INLINE_PATTERN)) {
		const start = match.index ?? 0;

		if (start > cursor) {
			tokens.push({ type: 'text', value: source.slice(cursor, start) });
		}

		if (match[1] !== undefined) {
			tokens.push({ type: 'bold', value: match[1] });
		} else if (match[2] !== undefined) {
			tokens.push({ type: 'code', value: match[2] });
		} else {
			tokens.push({ type: 'italic', value: match[3] });
		}

		cursor = start + match[0].length;
	}

	if (cursor < source.length) {
		tokens.push({ type: 'text', value: source.slice(cursor) });
	}

	return tokens;
}
