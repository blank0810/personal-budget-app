import Link from 'next/link';
import { LagoonReveal } from './LagoonReveal';

/**
 * LagoonCTA — bottom-of-page conversion section.
 *
 * Uses the teal gradient panel (.lagoon-teal-panel) for visual weight
 * and to bookend the page with the teal brand colour.
 * The teal panel stays teal in both light and dark modes (slightly deepened
 * in dark via the [data-lagoon-theme='dark'] override in lagoon.css).
 * Text/buttons on the panel use white on-accent values — not token-dependent.
 * Server component.
 */
interface LagoonCTAProps {
	/** Override the default h2. Defaults to "Know exactly where your money goes." */
	heading?: string;
}

export function LagoonCTA({ heading = 'Know exactly where your money goes.' }: LagoonCTAProps) {
	return (
		<section
			aria-label='Get started'
			className='px-6 py-16 md:px-10 md:py-20'
			style={{ background: 'var(--lagoon-surface)' }}
		>
			<div className='mx-auto max-w-[1184px]'>
				<LagoonReveal>
					<div className='lagoon-teal-panel px-8 py-14 text-center md:px-16 md:py-20'>
						{/* Eyebrow — light teal on teal panel; stays as-is in both modes */}
						<p className='mb-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#99f6e4]'>
							Start today
						</p>

						<h2
							className='mx-auto max-w-[600px] text-[clamp(32px,4vw,52px)] font-bold leading-[1.1] tracking-[-0.03em] text-white'
							style={{ fontFamily: 'var(--lagoon-font-heading, inherit)' }}
						>
							{heading}
						</h2>

						<p className='mx-auto mt-5 max-w-[44ch] text-[17px] leading-[1.65] text-[#99f6e4]'>
							Start budgeting today. No bank linking, no subscriptions, no excuses.
							Free forever for personal use.
						</p>

						{/* CTAs */}
						<div className='mt-9 flex flex-wrap items-center justify-center gap-3'>
							{/* White pill CTA — on-accent fill, teal text */}
							<Link
								href='/register'
								className='inline-flex h-12 items-center gap-2 rounded-full bg-white px-8 text-[15px] font-semibold text-[#0d9488] transition-colors hover:bg-[#f0fdfa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
							>
								Start for free — it&apos;s ₱0
								<svg aria-hidden='true' width='14' height='14' viewBox='0 0 14 14' fill='none'>
									<path
										d='M2.5 7h9M8.5 4l3 3-3 3'
										stroke='currentColor'
										strokeWidth='1.5'
										strokeLinecap='round'
										strokeLinejoin='round'
									/>
								</svg>
							</Link>
							{/* Ghost white border on teal panel */}
							<Link
								href='/login'
								className='inline-flex h-12 items-center rounded-full border border-[rgba(255,255,255,0.3)] px-8 text-[15px] font-semibold text-white transition-colors hover:border-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
							>
								Sign in
							</Link>
						</div>

						{/* Trust sub-line */}
						<p className='mt-5 text-[13px] text-[rgba(255,255,255,0.55)]'>
							No credit card&ensp;&middot;&ensp;No bank sync&ensp;&middot;&ensp;Your data, your control
						</p>
					</div>
				</LagoonReveal>
			</div>
		</section>
	);
}
