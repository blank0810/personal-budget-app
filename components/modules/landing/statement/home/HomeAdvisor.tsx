import Link from 'next/link';
import { SectionHead } from '../SectionHead';

/**
 * AI Advisor — NOT shipped. PRODUCT.md honesty rule 3: future tense
 * only, never a present-tense capability claim, and never a fabricated
 * waitlist or accuracy figure. The dashboard teaser is described as
 * what it is: a non-interactive preview.
 */
export function HomeAdvisor() {
	return (
		<section className='st-section' aria-labelledby='advisor-heading'>
			<div className='st-shell'>
				<div className='st-split'>
					<SectionHead id='advisor-heading' heading={'One thing that isn\u2019t built yet.'} />

					<div>
						<span className='st-marker'>In development</span>

						<p className='st-lead mt-5' style={{ color: 'var(--st-body)' }}>
							An AI advisor that will read your own transactions and answer
							questions about them in plain language.
						</p>

						<p
							className='st-body-text mt-4'
							style={{ color: 'var(--st-body)' }}
						>
							It is not live. There is a non-interactive preview on the
							dashboard so you can see the shape of it, and that is all it is
							today. It will be announced on the changelog when it actually
							works, not before.
						</p>

						<p className='mt-6'>
							<Link href='/ai-advisor' className='st-link'>
								What it will do
							</Link>
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}
