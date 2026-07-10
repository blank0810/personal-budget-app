'use client';

import { m, useReducedMotion } from 'motion/react';
import { useMounted } from '@/components/modules/landing/ui/use-mounted';
import { LagoonReveal } from '@/components/modules/landing/lagoon/LagoonReveal';

const BUDGETS = [
	{ name: 'Groceries', cat: 'Food & Dining', spent: 3800, limit: 5000, pct: 76 },
	{ name: 'Transport', cat: 'Transport', spent: 2100, limit: 2500, pct: 84 },
	{ name: 'Entertainment', cat: 'Leisure', spent: 3850, limit: 3500, pct: 110 },
	{ name: 'Healthcare', cat: 'Health', spent: 880, limit: 2000, pct: 44 },
];

function barBg(pct: number): string {
	if (pct > 100) return '#dc2626'; // red-600 — over budget
	if (pct > 80) return '#d97706';  // amber-600 — nearing limit
	return '#16a34a';                 // green-600 — healthy
}

const BENEFITS = [
	'Set a spending limit for every category before the month starts',
	'Progress bars update instantly the moment you log a transaction',
	'Replicate last month\'s envelopes in one click — no manual re-entry',
];

/**
 * FeatureRowBudgets — envelope budgets mock matching the real /budgets page:
 * month heading + Replicate / View All Months actions, then a budget list with
 * category badge, animated progress bar, spent/left labels, and status pill.
 * Client component: needs m.div for bar scale animation.
 * Layout: text left, mock right (lagoon-surface background).
 */
export function FeatureRowBudgets() {
	const mounted = useMounted();
	const prefersReduced = useReducedMotion();
	const shouldAnimate = mounted && !prefersReduced;

	return (
		<section aria-label='Envelope budgets' className='bg-[var(--lagoon-surface)] py-20 md:py-28'>
			<div className='mx-auto max-w-[1184px] px-6 md:px-10'>
				<div className='grid items-center gap-12 lg:grid-cols-2 lg:gap-20'>
					{/* ── Text side ── */}
					<LagoonReveal>
						<p className='mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--lagoon-accent)]'>
							Feature 01
						</p>
						<h2
							className='lagoon-section-title mb-5 text-[var(--lagoon-ink)]'
							style={{ fontFamily: 'var(--lagoon-font-heading, inherit)' }}
						>
							Envelope budgets that actually hold.
						</h2>
						<p className='mb-8 text-[17px] leading-[1.7] text-[var(--lagoon-body)]'>
							Set a peso limit for every category before the month starts. Every
							transaction you log moves the bar — no manual tallying, no spreadsheet
							gymnastics.
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

					{/* ── Mock side ── */}
					<LagoonReveal delay={0.1}>
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
											budget.umbra.build/budgets
										</span>
									</div>
								</div>
							</div>

							{/* Page content */}
							<div className='p-4'>
								{/* Month heading + action buttons (mirrors BudgetViews header) */}
								<div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
									<p
										className='text-[13px] font-semibold text-[var(--lagoon-ink)]'
										style={{ fontFamily: 'var(--lagoon-font-heading, inherit)' }}
									>
										June 2026
									</p>
									<div className='flex items-center gap-1.5'>
										{/* Replicate Budgets */}
										<span className='flex items-center gap-1 rounded-md border border-[var(--lagoon-border)] px-2 py-0.5 text-[10px] text-[var(--lagoon-body)]'>
											<svg viewBox='0 0 12 12' fill='none' className='h-2.5 w-2.5 shrink-0' aria-hidden='true'>
												<rect x='4' y='4' width='7' height='7' rx='1' stroke='currentColor' strokeWidth='1.1' />
												<path d='M1 8V2a1 1 0 0 1 1-1h6' stroke='currentColor' strokeWidth='1.1' strokeLinecap='round' />
											</svg>
											Replicate Budgets
										</span>
										{/* View All Months */}
										<span className='flex items-center gap-1 rounded-md border border-[var(--lagoon-border)] px-2 py-0.5 text-[10px] text-[var(--lagoon-body)]'>
											<svg viewBox='0 0 12 12' fill='none' className='h-2.5 w-2.5 shrink-0' aria-hidden='true'>
												<rect x='1' y='2' width='10' height='9' rx='1' stroke='currentColor' strokeWidth='1.1' />
												<path d='M1 5h10M4 1v2M8 1v2' stroke='currentColor' strokeWidth='1.1' strokeLinecap='round' />
											</svg>
											View All Months
										</span>
									</div>
								</div>

								{/* Column labels */}
								<div className='mb-1.5 flex justify-between border-b border-[var(--lagoon-border)] pb-1.5'>
									<span className='text-[10px] font-medium text-[var(--lagoon-muted)]'>Budget</span>
									<span className='text-[10px] font-medium text-[var(--lagoon-muted)]'>Status</span>
								</div>

								{/* Budget rows */}
								<div className='space-y-3 pt-0.5'>
									{BUDGETS.map((b, i) => {
										const isOver = b.pct > 100;
										const isWarn = !isOver && b.pct > 80;
										const remaining = b.limit - b.spent;

										return (
											<div key={b.name} className='flex items-center gap-3'>
												{/* Left: name + category + animated bar + spent/left */}
												<div className='min-w-0 flex-1'>
													<div className='mb-1 flex items-center gap-1.5'>
														{/* Wallet icon */}
														<svg viewBox='0 0 12 12' fill='none' className='h-3 w-3 shrink-0 text-[var(--lagoon-muted)]' aria-hidden='true'>
															<path
																d='M1 4h10v5a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4ZM4 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1'
																stroke='currentColor'
																strokeWidth='1.1'
																strokeLinecap='round'
																strokeLinejoin='round'
															/>
														</svg>
														<span className='truncate text-[12px] font-medium text-[var(--lagoon-ink)]'>
															{b.name}
														</span>
														{/* Category badge (mirrors BudgetList Category column) */}
														<span className='shrink-0 rounded border border-[var(--lagoon-border)] px-1 text-[9px] text-[var(--lagoon-muted)]'>
															{b.cat}
														</span>
													</div>

													{/* Progress bar — green ≤80%, amber >80%, red >100% */}
													<div
														className='h-1.5 overflow-hidden rounded-full'
														style={{ background: 'var(--lagoon-surface-2)' }}
													>
														<m.div
															className='h-full rounded-full'
															style={{
																width: `${Math.min(b.pct, 100)}%`,
																background: barBg(b.pct),
																transformOrigin: 'left',
															}}
															initial={shouldAnimate ? { scaleX: 0 } : { scaleX: 1 }}
															whileInView={{ scaleX: 1 }}
															viewport={{ once: true, margin: '-40px' }}
															transition={{ duration: 0.7, delay: i * 0.1, ease: [0.25, 1, 0.35, 1] }}
														/>
													</div>

													{/* Spent / remaining labels (mirrors BudgetList Progress render) */}
													<div className='mt-0.5 flex justify-between'>
														<span
															className={`text-[10px] ${isOver ? 'font-semibold text-red-600' : 'text-[var(--lagoon-muted)]'}`}
														>
															₱{b.spent.toLocaleString('en-US')} spent
														</span>
														<span className='text-[10px] text-[var(--lagoon-muted)]'>
															{isOver
																? `₱${(b.spent - b.limit).toLocaleString('en-US')} over`
																: `₱${remaining.toLocaleString('en-US')} left`}
														</span>
													</div>
												</div>

												{/* Right: status pill */}
												<span
													className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
														isOver
															? 'bg-red-500/10 text-red-600'
															: isWarn
															? 'bg-amber-500/10 text-amber-600'
															: 'bg-green-500/10 text-green-600'
													}`}
												>
													{isOver ? 'Over' : `${b.pct}%`}
												</span>
											</div>
										);
									})}
								</div>

								{/* Over-budget callout — amber, dark-mode-safe opacity classes */}
								<div className='mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3'>
									<svg
										viewBox='0 0 16 16'
										fill='none'
										className='mt-0.5 h-4 w-4 shrink-0 text-amber-600'
										aria-hidden='true'
									>
										<path
											d='M8 2L1.5 13.5h13L8 2Z'
											stroke='currentColor'
											strokeWidth='1.2'
											fill='none'
											strokeLinejoin='round'
										/>
										<path
											d='M8 6v3M8 10.5v.5'
											stroke='currentColor'
											strokeWidth='1.2'
											strokeLinecap='round'
										/>
									</svg>
									<p className='text-[11px] leading-relaxed text-amber-600'>
										<span className='font-semibold'>Entertainment</span> is over budget by ₱350 — 4 days left in June.
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
