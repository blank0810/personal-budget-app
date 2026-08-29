/**
 * FeaturesHero — intro hero for /features.
 * Server component — LCP content, not animated.
 */
export function FeaturesHero() {
	return (
		<section
			aria-label='Features overview'
			className='lagoon-grid-overlay bg-[var(--lagoon-canvas)] py-20 md:py-28'
		>
			<div className='mx-auto max-w-[1184px] px-6 md:px-10'>
				<div className='mx-auto max-w-[680px] text-center'>
					<p className='mb-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--lagoon-accent)]'>
						Everything you get
					</p>
					<h1
						className='lagoon-section-title mb-5 text-[var(--lagoon-ink)]'
						style={{ fontFamily: 'var(--lagoon-font-heading, inherit)' }}
					>
						One tool. Every piece of your budget covered.
					</h1>
					<p className='text-[18px] leading-[1.75] text-[var(--lagoon-body)]'>
						From envelope budgets and savings goals to CSV imports and monthly
						reports — here is every feature you get from day one, free.
					</p>
				</div>
			</div>
		</section>
	);
}
