import type { FaqEntry } from './faq-data';

/**
 * Faq — native <details> disclosure. No JS, no ARIA to hand-maintain,
 * keyboard and screen-reader behaviour from the platform, and the
 * answers sit in the DOM whether open or closed — which is also what
 * keeps the FAQPage structured data honest.
 */
export function Faq({ items }: { items: readonly FaqEntry[] }) {
	return (
		<div className='faq'>
			{items.map((item) => (
				<details key={item.q} name='in-faq'>
					<summary>
						<span>{item.q}</span>
						<span className='sign' aria-hidden='true' />
					</summary>
					<p className='answer'>{item.a}</p>
				</details>
			))}
		</div>
	);
}
