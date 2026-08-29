import { LagoonReveal } from '../LagoonReveal';

const TRUST_BADGES = [
	'₱0 forever',
	'No card required',
	'Export anytime',
] as const;

/**
 * PricingHero — top of the /pricing page.
 *
 * White background hero with eyebrow, h1, descriptive copy, and three
 * trust badges. Intentionally lightweight so the plan cards below carry
 * the visual weight.
 * Server component.
 */
export function PricingHero() {
	return (
		<section aria-label='Pricing overview' className='bg-[var(--lagoon-surface)] px-6 py-20 md:px-10 md:py-28'>
			<div className='mx-auto max-w-[1184px]'>
				<LagoonReveal className='mx-auto max-w-[580px] text-center'>
					{/* Eyebrow */}
					<p className='mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--lagoon-accent)]'>
						Pricing
					</p>

					{/* h1 — only heading on this page at this rank */}
					<h1
						className='lagoon-section-title text-[var(--lagoon-ink)]'
						style={{ fontFamily: 'var(--lagoon-font-heading, inherit)' }}
					>
						Free for personal use.
					</h1>

					<p className='mx-auto mt-5 max-w-[44ch] text-[17px] leading-[1.7] text-[var(--lagoon-body)]'>
						No credit card. No trial clock. No bank sync required.
						Log your money, see where it goes -- that&apos;s it.
					</p>

					{/* Trust badges */}
					<ul
						aria-label='Key guarantees'
						className='mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5'
					>
						{TRUST_BADGES.map((badge) => (
							<li
								key={badge}
								className='flex items-center gap-1.5 text-[13px] text-[var(--lagoon-body)]'
							>
								<svg
									aria-hidden='true'
									className='h-3.5 w-3.5 shrink-0 text-[var(--lagoon-accent)]'
									viewBox='0 0 14 14'
									fill='none'
								>
									<path
										d='M2.5 7l3 3 6-6'
										stroke='currentColor'
										strokeWidth='1.5'
										strokeLinecap='round'
										strokeLinejoin='round'
									/>
								</svg>
								{badge}
							</li>
						))}
					</ul>
				</LagoonReveal>
			</div>
		</section>
	);
}
