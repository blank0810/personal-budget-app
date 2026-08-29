import Link from 'next/link';
import { LagoonReveal } from '../LagoonReveal';

const FREE_FEATURES = [
	'Unlimited budget categories',
	'Transaction logging (income, expense, transfer)',
	'Savings goals with progress tracking',
	'Monthly reports & PDF export',
	'CSV import with duplicate detection',
	'Multiple accounts',
	'Dashboard with spending overview',
] as const;

const PRO_PREVIEW = [
	'Everything in Free',
	'AI Budget Advisor (in development)',
	'Advanced analytics & insights',
	'Priority support',
] as const;

/**
 * PricingPlans — plan cards for the dedicated /pricing sub-page.
 *
 * Mirrors the LagoonPricing card structure (same .lagoon-pricing-card CSS,
 * same Free + Pro layout) but omits the section header since PricingHero
 * above already sets that context.
 *
 * Honesty rules:
 *  - Free: ₱0, all core features listed, no expiry claim
 *  - Pro: no price, no trial, future-tense features, "Coming soon" badge
 * Server component.
 */
export function PricingPlans() {
	return (
		<section aria-label='Plans' className='bg-[var(--lagoon-canvas)] px-6 py-20 md:px-10 md:py-28'>
			<div className='mx-auto max-w-[1184px]'>
				<LagoonReveal>
					<div className='mx-auto grid max-w-[740px] gap-5 md:grid-cols-2'>
						{/* ── Free — featured ─────────────────────────────── */}
						<div className='lagoon-pricing-card featured flex flex-col'>
							<div className='mb-6'>
								<div className='mb-1 flex items-center gap-2'>
									<span className='text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--lagoon-accent)]'>
										Free
									</span>
								</div>
								<div className='flex items-baseline gap-1'>
									<span
										className='text-[52px] font-bold leading-none tracking-[-0.04em] text-[var(--lagoon-ink)]'
										style={{ fontFamily: 'var(--lagoon-font-heading, inherit)' }}
									>
										₱0
									</span>
									<span className='text-[15px] text-[var(--lagoon-muted)]'>/month</span>
								</div>
								<p className='mt-2 text-[14px] leading-[1.6] text-[var(--lagoon-body)]'>
									Free forever for personal use. No credit card required.
								</p>
							</div>

							<ul
								className='mb-8 flex flex-1 flex-col gap-2.5'
								aria-label='Free plan features'
							>
								{FREE_FEATURES.map((f) => (
									<li
										key={f}
										className='flex items-start gap-2.5 text-[14px] text-[var(--lagoon-ink-2)]'
									>
										<svg
											aria-hidden='true'
											className='mt-0.5 h-4 w-4 shrink-0 text-[var(--lagoon-accent)]'
											viewBox='0 0 16 16'
											fill='none'
										>
											<path
												d='M3 8l3.5 3.5 6.5-7'
												stroke='currentColor'
												strokeWidth='1.5'
												strokeLinecap='round'
												strokeLinejoin='round'
											/>
										</svg>
										{f}
									</li>
								))}
							</ul>

							<Link
								href='/register'
								className='lagoon-btn-teal inline-flex h-11 w-full items-center justify-center rounded-full text-[15px] font-semibold focus-visible:outline-2 focus-visible:outline-[var(--lagoon-accent)] focus-visible:outline-offset-2'
							>
								Create your free account
							</Link>
						</div>

						{/* ── Pro — coming soon ────────────────────────────── */}
						<div className='lagoon-pricing-card flex flex-col'>
							<div className='mb-6'>
								<div className='mb-1 flex items-center gap-2'>
									<span className='text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--lagoon-muted)]'>
										Pro
									</span>
									<span
										className='rounded-full px-2 py-0.5 text-[11px] font-semibold'
										style={{ background: 'var(--lagoon-surface-2)', color: 'var(--lagoon-ink-3)' }}
									>
										Coming soon
									</span>
								</div>
								<div className='flex items-baseline gap-1'>
									<span
										className='text-[52px] font-bold leading-none tracking-[-0.04em] text-[var(--lagoon-muted)]'
										style={{ fontFamily: 'var(--lagoon-font-heading, inherit)' }}
									>
										TBD
									</span>
								</div>
								<p className='mt-2 text-[14px] leading-[1.6] text-[var(--lagoon-muted)]'>
									Early access pricing to be announced. No commitments required.
								</p>
							</div>

							<ul
								className='mb-8 flex flex-1 flex-col gap-2.5'
								aria-label='Pro plan upcoming features'
							>
								{PRO_PREVIEW.map((f) => (
									<li
										key={f}
										className='flex items-start gap-2.5 text-[14px] text-[var(--lagoon-muted)]'
									>
										<svg
											aria-hidden='true'
											className='mt-0.5 h-4 w-4 shrink-0 opacity-50'
											viewBox='0 0 16 16'
											fill='none'
										>
											<path
												d='M3 8l3.5 3.5 6.5-7'
												stroke='currentColor'
												strokeWidth='1.5'
												strokeLinecap='round'
												strokeLinejoin='round'
											/>
										</svg>
										{f}
									</li>
								))}
							</ul>

							<Link
								href='/changelog'
								className='inline-flex h-11 w-full items-center justify-center rounded-full border border-[var(--lagoon-border)] text-[15px] font-semibold text-[var(--lagoon-ink-3)] transition-colors hover:border-[var(--lagoon-border-soft)] hover:text-[var(--lagoon-ink-2)] focus-visible:outline-2 focus-visible:outline-[var(--lagoon-accent)] focus-visible:outline-offset-2'
							>
								Follow progress
							</Link>
						</div>
					</div>
				</LagoonReveal>

				{/* Footnote */}
				<LagoonReveal delay={0.1} className='mt-8 text-center'>
					<p className='text-[13px] text-[var(--lagoon-muted)]'>
						All prices in Philippine Peso (₱).&ensp;
						<span className='text-[var(--lagoon-border-soft)]'>·</span>&ensp;
						Pro features will be opt-in -- the Free plan never loses features when Pro launches.
					</p>
				</LagoonReveal>
			</div>
		</section>
	);
}
