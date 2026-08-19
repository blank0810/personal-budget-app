import { Fragment } from 'react';
import { parseInlineMarkdown } from '@/lib/inline-markdown';

/**
 * Renders the `**bold**`, `*italic*` and `` `code` `` markup used inside
 * changelog front matter. The strings arrive from `content/changelog/*.md`, which is authored
 * by the maintainer — never user input — and every token is rendered as a React
 * child, so the text stays escaped.
 *
 * Accepts a missing value because some older entries omit optional front-matter
 * fields (v1.9's patches carry no `title` or `description`); those render as
 * nothing, exactly as they did when the raw string was printed.
 */
export function InlineMarkdown({ children }: { children: string | null | undefined }) {
	if (!children) {
		return null;
	}

	return (
		<>
			{parseInlineMarkdown(children).map((token, i) => {
				switch (token.type) {
					case 'bold':
						return (
							<strong key={i} className='font-semibold text-foreground'>
								{token.value}
							</strong>
						);
					case 'italic':
						return <em key={i}>{token.value}</em>;
					case 'code':
						return (
							<code
								key={i}
								className='rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground'
							>
								{token.value}
							</code>
						);
					default:
						return <Fragment key={i}>{token.value}</Fragment>;
				}
			})}
		</>
	);
}
