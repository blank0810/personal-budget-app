import { LagoonReveal } from '@/components/modules/landing/lagoon/LagoonReveal';

/**
 * FeatureRowAI — AI Budget Advisor coming-soon section.
 * Server component — static chat mock, clearly future-tense throughout.
 * Centred full-width panel with teal tint background.
 */
export function FeatureRowAI() {
	return (
		<section aria-label='AI advisor — coming soon' className='bg-[var(--lagoon-surface)] py-12 md:py-16'>
			<div className='mx-auto max-w-[1184px] px-6 md:px-10'>
				<LagoonReveal>
					<div
						className='overflow-hidden rounded-2xl border border-[var(--lagoon-accent-border)]'
						style={{ background: 'linear-gradient(135deg, var(--lagoon-accent-bg) 0%, var(--lagoon-canvas) 60%)' }}
					>
						<div className='grid items-center gap-8 p-8 md:grid-cols-2 md:gap-16 md:p-12'>
							{/* Text */}
							<div>
								<div className='mb-3 flex flex-wrap items-center gap-2'>
									<p className='text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--lagoon-accent)]'>
										What&apos;s next
									</p>
									<span className='rounded-full border border-[var(--lagoon-accent-border)] bg-[var(--lagoon-accent-tint)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--lagoon-accent-strong)]'>
										In development
									</span>
								</div>
								<h2
									className='lagoon-section-title mb-4 text-[var(--lagoon-ink)]'
									style={{ fontFamily: 'var(--lagoon-font-heading, inherit)' }}
								>
									AI Budget Advisor.
								</h2>
								<p className='mb-4 text-[17px] leading-[1.7] text-[var(--lagoon-body)]'>
									We are building an AI assistant that reads your own transaction
									data and gives you specific, actionable insights — not generic
									advice. Ask it about your spending patterns, savings pace, or
									category trends.
								</p>
								<p className='text-[14px] italic leading-[1.7] text-[var(--lagoon-muted)]'>
									This feature is not available yet. We will announce it in the
									changelog when it ships.
								</p>
							</div>

							{/* Mock chat interface */}
							<div
								className='rounded-xl border border-[var(--lagoon-border)] bg-[var(--lagoon-surface)] p-4'
								aria-hidden='true'
							>
								{/* Chat header */}
								<div className='mb-4 flex items-center gap-2.5'>
									<div
										className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full'
										style={{ background: 'var(--lagoon-accent-tint)' }}
									>
										<svg viewBox='0 0 16 16' fill='none' className='h-4 w-4' aria-hidden='true'>
											<path
												d='M8 2a6 6 0 0 1 4 10.5l1 2-2.5-1A6 6 0 1 1 8 2Z'
												stroke='var(--lagoon-accent)'
												strokeWidth='1.2'
												fill='none'
											/>
											<path
												d='M5.5 7.5h5M5.5 9.5h3'
												stroke='var(--lagoon-accent)'
												strokeWidth='1.2'
												strokeLinecap='round'
											/>
										</svg>
									</div>
									<div>
										<p className='text-[12px] font-semibold text-[var(--lagoon-ink)]'>AI Budget Advisor</p>
										<p className='text-[10px] text-[var(--lagoon-muted)]'>Based on your own data</p>
									</div>
									<span className='ml-auto rounded-full border border-[var(--lagoon-border)] px-2 py-0.5 text-[9px] font-medium text-[var(--lagoon-muted)]'>
										Preview
									</span>
								</div>

								{/* Sample messages */}
								<div className='space-y-3'>
									{/* Advisor message */}
									<div
										className='rounded-xl rounded-tl-sm p-3 text-[12px] leading-relaxed text-[var(--lagoon-body)]'
										style={{ background: 'var(--lagoon-canvas)' }}
									>
										You spent 28% more on Food &amp; Dining this month vs your
										3-month average. Your Food budget has ₱480 left with 4 days
										to go.
									</div>
									{/* User message — solid teal fill, white text intentionally kept */}
									<div
										className='ml-6 rounded-xl rounded-tr-sm p-3 text-[12px] leading-relaxed text-white'
										style={{ background: 'var(--lagoon-accent)' }}
									>
										How much can I save this month if I stop eating out?
									</div>
									{/* Advisor response */}
									<div
										className='rounded-xl rounded-tl-sm p-3 text-[12px] leading-relaxed text-[var(--lagoon-body)]'
										style={{ background: 'var(--lagoon-canvas)' }}
									>
										Based on your past dining patterns, skipping takeout for the
										last 4 days could recover ₱350–₱600 and put you back within
										your Food budget...
									</div>
								</div>

								{/* Input stub */}
								<div className='mt-3 flex items-center gap-2 rounded-xl border border-[var(--lagoon-border)] px-3 py-2'>
									<span className='flex-1 text-[11px] text-[var(--lagoon-muted)]'>
										Ask anything about your finances...
									</span>
									<div
										className='flex h-6 w-6 items-center justify-center rounded-full'
										style={{ background: 'var(--lagoon-accent-tint)' }}
									>
										<svg viewBox='0 0 12 12' fill='none' className='h-3 w-3' aria-hidden='true'>
											<path
												d='M2 6h8M7 3.5l2.5 2.5L7 8.5'
												stroke='var(--lagoon-accent)'
												strokeWidth='1.2'
												strokeLinecap='round'
												strokeLinejoin='round'
											/>
										</svg>
									</div>
								</div>
							</div>
						</div>
					</div>
				</LagoonReveal>
			</div>
		</section>
	);
}
