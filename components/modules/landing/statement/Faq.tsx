import type { FaqEntry } from './faq-data';

/**
 * Faq — native <details> disclosure. No JS, no ARIA to hand-maintain,
 * keyboard and screen-reader behaviour comes from the platform, and the
 * answers are present in the DOM for crawlers whether open or closed
 * (which is also what keeps FAQPage structured data honest).
 */
export function Faq({ items }: { items: readonly FaqEntry[] }) {
	return (
		<div className='border-t' style={{ borderColor: 'var(--st-ink)' }}>
			{items.map((item) => (
				<details key={item.q} className='st-faq-item' name='st-faq'>
					<summary>
						<span>{item.q}</span>
						<span className='st-faq-sign' aria-hidden='true' />
					</summary>
					<p className='st-faq-answer'>{item.a}</p>
				</details>
			))}
		</div>
	);
}
