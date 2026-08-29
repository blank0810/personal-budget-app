import { LagoonReveal } from '../LagoonReveal';

/**
 * HowItWorksHero — intro section for the /how-it-works sub-page.
 *
 * Canvas (#F8FAFC) bg to contrast with the white Steps section below.
 * pt-36 md:pt-44 clears the fixed sticky nav (64px) with breathing room.
 * Server component — no client JS.
 */
export function HowItWorksHero() {
	return (
		<section
			className='pt-36 pb-20 md:pt-44 md:pb-28'
			style={{ background: 'var(--lagoon-canvas)' }}
		>
			<div className='mx-auto max-w-[1184px] px-6 md:px-10'>
				<LagoonReveal>
					<p className='mb-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--lagoon-accent)]'>
						How it works
					</p>
					<h1
						className='lagoon-hero-title max-w-[18ch] text-[var(--lagoon-ink)]'
						style={{ fontFamily: 'var(--lagoon-font-heading, inherit)' }}
					>
						Four steps to total clarity.
					</h1>
					<p className='mt-6 max-w-[48ch] text-[18px] leading-[1.7] text-[var(--lagoon-body)]'>
						No sync tokens, no bank permissions — just your numbers, organised
						the way you think about them.
					</p>
				</LagoonReveal>
			</div>
		</section>
	);
}
