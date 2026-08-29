import Link from 'next/link';
import { SectionHead } from '../SectionHead';

/**
 * Pricing on the home page is one honest paragraph, not a pair of
 * comparison cards — /pricing owns the detail.
 *
 * "Free to start", never "free forever" (PRODUCT.md rule 6): a paid
 * tier may exist once the AI advisor lands, and promising otherwise
 * now would be a promise made for us by a page.
 */
export function HomePrice() {
	return (
		<section className='st-section st-sunk' aria-labelledby='price-heading'>
			<div className='st-shell'>
				<div className='st-split'>
					<SectionHead id='price-heading' heading='Free to start.' />

					<div>
						<p className='st-lead' style={{ color: 'var(--st-body)' }}>
							Everything on this page is free right now, with no credit card and
							no trial clock.
						</p>

						<p className='st-body-text mt-4' style={{ color: 'var(--st-body)' }}>
							We won&rsquo;t say &ldquo;free forever&rdquo;, because the AI
							advisor may end up costing money to run and we would rather not
							make a promise we might have to walk back. What we will do is
							announce any change on the public changelog before anything locks.
						</p>

						<p className='mt-6'>
							<Link href='/pricing' className='st-link'>
								Full pricing
							</Link>
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}
