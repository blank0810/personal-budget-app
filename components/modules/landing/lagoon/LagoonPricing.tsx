import Link from 'next/link';
import { LagoonReveal } from './LagoonReveal';

const FREE_FEATURES = [
	'Unlimited budget categories',
	'Transaction logging (income, expense, transfer)',
	'Savings goals with progress tracking',
	'Monthly reports & PDF export',
	'CSV import with duplicate detection',
	'Multiple accounts',
] as const;

const PRO_PREVIEW = [
	'Everything in Free',
	'AI Budget Advisor',
	'Priority support',
	'Advanced analytics',
] as const;

/**
 * LagoonPricing — honest pricing section.
 *
 * Free tier: ₱0/month, always. No trial, no expiry, no credit card.
 * Pro tier: "Coming soon" — no fake price or trial period advertised.
 * Server component.
 */
export function LagoonPricing() {
	return (
		<section
			id='pricing'
			aria-label='Pricing'
			className='py-20 md:py-28'
			style={{ background: 'var(--lagoon-canvas)' }}
		>
			<div className='mx-auto max-w-[1184px] px-6 md:px-10'>
				{/* Header */}
				<LagoonReveal className='text-center'>
					<p
						className='mb-3 text-[12px] font-semibold uppercase tracking-[0.12em]'
						style={{ color: 'var(--lagoon-accent)' }}
					>
						Pricing
					</p>
					<h2
						className='lagoon-section-title'
						style={{
							color: 'var(--lagoon-ink)',
							fontFamily: 'var(--lagoon-font-heading, inherit)',
						}}
					>
						Simple. Free to start.
					</h2>
					<p
						className='mx-auto mt-4 max-w-[40ch] text-[17px] leading-[1.7]'
						style={{ color: 'var(--lagoon-body)' }}
					>
						No hidden fees, no credit card required, no expiry date.
					</p>
				</LagoonReveal>

				{/* Pricing cards */}
				<LagoonReveal delay={0.08} className='mt-12'>
					<div className='mx-auto grid max-w-[720px] gap-5 md:grid-cols-2'>
						{/* Free card — featured */}
						<div className='lagoon-pricing-card featured flex flex-col'>
							<div className='mb-6'>
								<div className='mb-1 flex items-center gap-2'>
									<span
										className='text-[12px] font-semibold uppercase tracking-[0.08em]'
										style={{ color: 'var(--lagoon-accent)' }}
									>
										Free
									</span>
								</div>
								<div className='flex items-baseline gap-1'>
									<span
										className='text-[52px] font-bold leading-none tracking-[-0.04em]'
										style={{
											color: 'var(--lagoon-ink)',
											fontFamily: 'var(--lagoon-font-heading, inherit)',
										}}
									>
										₱0
									</span>
									<span className='text-[15px]' style={{ color: 'var(--lagoon-muted)' }}>
										/month
									</span>
								</div>
								<p
									className='mt-2 text-[14px] leading-[1.6]'
									style={{ color: 'var(--lagoon-body)' }}
								>
									Free forever for personal use. No credit card required.
								</p>
							</div>

							<ul className='mb-8 flex flex-1 flex-col gap-2.5' aria-label='Free plan features'>
								{FREE_FEATURES.map((f) => (
									<li
										key={f}
										className='flex items-start gap-2.5 text-[14px]'
										style={{ color: 'var(--lagoon-ink-2)' }}
									>
										<svg
											aria-hidden='true'
											className='mt-0.5 h-4 w-4 shrink-0'
											viewBox='0 0 16 16'
											fill='none'
										>
											<path
												d='M3 8l3.5 3.5 6.5-7'
												stroke='var(--lagoon-accent)'
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

						{/* Pro card — coming soon */}
						<div className='lagoon-pricing-card flex flex-col'>
							<div className='mb-6'>
								<div className='mb-1 flex items-center gap-2'>
									<span
										className='text-[12px] font-semibold uppercase tracking-[0.08em]'
										style={{ color: 'var(--lagoon-muted)' }}
									>
										Pro
									</span>
									<span
										className='rounded-full px-2 py-0.5 text-[11px] font-semibold'
										style={{
											background: 'var(--lagoon-surface-2)',
											color: 'var(--lagoon-ink-3)',
										}}
									>
										Coming soon
									</span>
								</div>
								<div className='flex items-baseline gap-1'>
									<span
										className='text-[52px] font-bold leading-none tracking-[-0.04em]'
										style={{
											color: 'var(--lagoon-muted)',
											fontFamily: 'var(--lagoon-font-heading, inherit)',
										}}
									>
										TBD
									</span>
								</div>
								<p
									className='mt-2 text-[14px] leading-[1.6]'
									style={{ color: 'var(--lagoon-muted)' }}
								>
									Early access pricing to be announced. No commitments.
								</p>
							</div>

							<ul className='mb-8 flex flex-1 flex-col gap-2.5' aria-label='Pro plan preview'>
								{PRO_PREVIEW.map((f) => (
									<li
										key={f}
										className='flex items-start gap-2.5 text-[14px]'
										style={{ color: 'var(--lagoon-muted)' }}
									>
										<svg
											aria-hidden='true'
											className='mt-0.5 h-4 w-4 shrink-0 opacity-50'
											viewBox='0 0 16 16'
											fill='none'
										>
											<path
												d='M3 8l3.5 3.5 6.5-7'
												stroke='var(--lagoon-muted)'
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
								className='inline-flex h-11 w-full items-center justify-center rounded-full border text-[15px] font-semibold transition-colors text-[var(--lagoon-ink-3)] border-[var(--lagoon-border)] hover:border-[var(--lagoon-border-soft)] hover:text-[var(--lagoon-ink-2)] focus-visible:outline-2 focus-visible:outline-[var(--lagoon-accent)] focus-visible:outline-offset-2'
							>
								Follow progress
							</Link>
						</div>
					</div>
				</LagoonReveal>
			</div>
		</section>
	);
}
