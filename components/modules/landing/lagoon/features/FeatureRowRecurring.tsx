import { LagoonReveal } from '@/components/modules/landing/lagoon/LagoonReveal';

const RECURRING = [
	{ name: 'Monthly Salary', freq: 'Monthly', type: 'INCOME' as const, amt: '+₱42,000', next: 'Jul 15', active: true },
	{ name: 'Condo Rent', freq: 'Monthly', type: 'EXPENSE' as const, amt: '−₱8,500', next: 'Jul 1', active: true },
	{ name: 'Meralco Bill', freq: 'Monthly', type: 'EXPENSE' as const, amt: '−₱1,840', next: 'Jul 14', active: true },
	{ name: 'Netflix', freq: 'Monthly', type: 'EXPENSE' as const, amt: '−₱549', next: '—', active: false },
	{ name: 'PLDT Internet', freq: 'Monthly', type: 'EXPENSE' as const, amt: '−₱1,299', next: 'Jul 5', active: true },
];

const BENEFITS = [
	'Set once — entries create themselves on schedule, every cycle',
	'Daily, weekly, biweekly, monthly, and yearly frequencies',
	'Pause or edit any rule without losing your transaction history',
];

/**
 * FeatureRowRecurring — recurring transactions deep-dive.
 * Server component — static mock.
 * Mirrors the real recurring rules list: name, amount, frequency enum
 * (Monthly/Weekly/Biweekly/Yearly), next-run date, active/paused status,
 * and pause/edit actions — matching server/modules/recurring/recurring.types.ts.
 * Layout: mock left, text right (#f8fafc background).
 */
export function FeatureRowRecurring() {
	return (
		<section aria-label='Recurring transactions' className='bg-[var(--lagoon-canvas)] py-20 md:py-28'>
			<div className='mx-auto max-w-[1184px] px-6 md:px-10'>
				<div className='grid items-center gap-12 lg:grid-cols-2 lg:gap-20'>
					{/* Text side — first in DOM (mobile), right column on desktop */}
					<LagoonReveal className='lg:order-2'>
						<p className='mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--lagoon-accent)]'>
							Feature 04
						</p>
						<h2
							className='lagoon-section-title mb-5 text-[var(--lagoon-ink)]'
							style={{ fontFamily: 'var(--lagoon-font-heading, inherit)' }}
						>
							Recurring entries on autopilot.
						</h2>
						<p className='mb-8 text-[17px] leading-[1.7] text-[var(--lagoon-body)]'>
							Rent, salary, subscriptions — set them up once and the app creates the
							transaction on schedule. Your timeline fills itself in without any
							manual logging.
						</p>
						<ul className='space-y-3'>
							{BENEFITS.map((b) => (
								<li key={b} className='flex items-start gap-3'>
									<span
										className='mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full'
										style={{ background: 'var(--lagoon-accent-tint)' }}
									>
										<svg viewBox='0 0 12 12' fill='none' className='h-3 w-3' aria-hidden='true'>
											<path
												d='M2 6l3 3 5-5'
												stroke='var(--lagoon-accent)'
												strokeWidth='1.5'
												strokeLinecap='round'
												strokeLinejoin='round'
											/>
										</svg>
									</span>
									<span className='text-[15px] leading-[1.6] text-[var(--lagoon-body)]'>{b}</span>
								</li>
							))}
						</ul>
					</LagoonReveal>

					{/* Mock side — second in DOM (mobile), left column on desktop */}
					<LagoonReveal delay={0.1} className='lg:order-1'>
						<div className='lagoon-browser w-full select-none' aria-hidden='true'>
							{/* Browser chrome */}
							<div
								className='flex items-center gap-3 border-b border-[var(--lagoon-border)] px-4 py-2.5'
								style={{ background: 'var(--lagoon-canvas)' }}
							>
								<div className='flex items-center gap-1.5'>
									<span className='inline-block h-3 w-3 rounded-full' style={{ background: '#ff5f57' }} />
									<span className='inline-block h-3 w-3 rounded-full' style={{ background: '#febc2e' }} />
									<span className='inline-block h-3 w-3 rounded-full' style={{ background: '#28c840' }} />
								</div>
								<div className='flex flex-1 justify-center'>
									<div className='flex w-[240px] max-w-full items-center gap-1.5 rounded-md border border-[var(--lagoon-border)] bg-[var(--lagoon-surface)] px-3 py-1'>
										<svg viewBox='0 0 16 16' fill='none' className='h-3 w-3 shrink-0 text-[var(--lagoon-muted)]'>
											<path
												d='M11.5 7V5.5a3.5 3.5 0 0 0-7 0V7M3 7h10a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z'
												stroke='currentColor'
												strokeWidth='1.2'
												strokeLinecap='round'
											/>
										</svg>
										<span className='truncate text-[11px] text-[var(--lagoon-muted)]'>
											budgetplanner.app/recurring
										</span>
									</div>
								</div>
							</div>

							{/* Content */}
							<div className='p-4'>
								<div className='mb-3 flex items-center justify-between'>
									<p
										className='text-[13px] font-semibold text-[var(--lagoon-ink)]'
										style={{ fontFamily: 'var(--lagoon-font-heading, inherit)' }}
									>
										Recurring Rules
									</p>
									<span className='rounded-full border border-[var(--lagoon-accent-border)] bg-[var(--lagoon-accent-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--lagoon-accent)]'>
										+ New rule
									</span>
								</div>

								{/* Recurring list */}
								<div className='divide-y divide-[var(--lagoon-surface-2)]'>
									{RECURRING.map((r) => (
										<div key={r.name} className='flex items-center gap-2.5 py-2.5'>
											{/* Type icon */}
											<div
												className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full'
												style={{ background: r.type === 'INCOME' ? 'var(--lagoon-accent-bg)' : 'var(--lagoon-surface-2)' }}
											>
												{r.type === 'INCOME' ? (
													<svg viewBox='0 0 16 16' fill='none' className='h-3.5 w-3.5' aria-hidden='true'>
														<path
															d='M8 12V4M4 8l4-4 4 4'
															stroke='var(--lagoon-accent)'
															strokeWidth='1.4'
															strokeLinecap='round'
															strokeLinejoin='round'
														/>
													</svg>
												) : (
													<svg viewBox='0 0 16 16' fill='none' className='h-3.5 w-3.5' aria-hidden='true'>
														<path
															d='M4 12a8 8 0 0 1 8.49-5.5M4 12H2l2-2 2 2M12 4a8 8 0 0 1-8.49 5.5M12 4h2l-2 2-2-2'
															stroke='var(--lagoon-muted)'
															strokeWidth='1.2'
															strokeLinecap='round'
															strokeLinejoin='round'
														/>
													</svg>
												)}
											</div>

											{/* Name + frequency */}
											<div className='min-w-0 flex-1'>
												<p className='truncate text-[12px] font-medium text-[var(--lagoon-ink)]'>{r.name}</p>
												<p className='text-[10px] text-[var(--lagoon-muted)]'>{r.freq}</p>
											</div>

											{/* Amount + next run */}
											<div className='shrink-0 text-right'>
												<p className={`text-[12px] font-semibold ${r.type === 'INCOME' ? 'text-emerald-500' : 'text-[var(--lagoon-ink-2)]'}`}>
													{r.amt}
												</p>
												<p className='text-[10px] text-[var(--lagoon-muted)]'>
													{r.active ? `Next: ${r.next}` : 'Paused'}
												</p>
											</div>

											{/* Active / Paused status + action icons */}
											<div className='flex shrink-0 items-center gap-1'>
												<span
													className={`inline-block h-1.5 w-1.5 rounded-full ${r.active ? 'bg-emerald-500' : 'bg-[var(--lagoon-muted)]'}`}
												/>
												{/* Edit icon */}
												<svg viewBox='0 0 16 16' fill='none' className='h-3 w-3 text-[var(--lagoon-muted)]' aria-hidden='true'>
													<path
														d='M11 2l3 3-8 8H3v-3L11 2Z'
														stroke='currentColor'
														strokeWidth='1.2'
														strokeLinecap='round'
														strokeLinejoin='round'
													/>
												</svg>
											</div>
										</div>
									))}
								</div>

								{/* Next run callout */}
								<div className='mt-3 flex items-center gap-2 rounded-xl border border-[var(--lagoon-border)] bg-[var(--lagoon-canvas)] p-2.5'>
									<svg viewBox='0 0 16 16' fill='none' className='h-4 w-4 shrink-0 text-[var(--lagoon-accent)]' aria-hidden='true'>
										<circle cx='8' cy='8' r='5.5' stroke='currentColor' strokeWidth='1.3' fill='none' />
										<path d='M8 5v3.5l2 1' stroke='currentColor' strokeWidth='1.3' strokeLinecap='round' />
									</svg>
									<p className='text-[11px] text-[var(--lagoon-body)]'>
										<span className='font-semibold text-[var(--lagoon-ink)]'>4 entries</span> auto-created on schedule · 1 paused
									</p>
								</div>
							</div>
						</div>
					</LagoonReveal>
				</div>
			</div>
		</section>
	);
}
