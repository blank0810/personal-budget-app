'use client';

import { m, useReducedMotion } from 'motion/react';
import { useMounted } from '@/components/modules/landing/ui/use-mounted';
import { LagoonReveal } from '@/components/modules/landing/lagoon/LagoonReveal';

// Mirrors GoalCardData shape from the real GoalCard component
const GOALS = [
	{
		name: 'Emergency Fund',
		// goalType: FIXED_AMOUNT — shows saved/target + remaining
		iconClass: 'bg-blue-500/10 text-blue-600',
		// healthStatus: building
		healthLabel: 'Building',
		healthClass: 'bg-blue-500/10 text-blue-600',
		current: 58000,
		target: 100000,
		pct: 58,
		remaining: 42000,
		deadline: null as string | null,
		linkedAccount: 'BDO Savings',
	},
	{
		name: 'New Laptop',
		// goalType: FIXED_AMOUNT
		iconClass: 'bg-purple-500/10 text-purple-600',
		// healthStatus: critical
		healthLabel: 'Critical',
		healthClass: 'bg-red-500/10 text-red-600',
		current: 12000,
		target: 50000,
		pct: 24,
		remaining: 38000,
		deadline: 'Dec 31, 2026' as string | null,
		linkedAccount: null as string | null,
	},
] as const;

// Tabs match GoalList (Active / Completed / Archived) with counts
const TABS = ['Active (2)', 'Completed (1)', 'Archived (0)'] as const;

const BENEFITS = [
	'Create a goal and link it to any savings account for automatic tracking',
	'Choose a fixed peso target or a "months of coverage" emergency buffer',
	'Urgency badges (Critical, Building, Funded) show where to focus first',
];

// Inline icons matching the real GoalCard ICON_MAP (target / shield)
function ShieldIcon() {
	return (
		<svg viewBox='0 0 16 16' fill='none' className='h-4 w-4' aria-hidden='true'>
			<path
				d='M8 1L2 3.5v4c0 3.5 2.5 5.8 6 7 3.5-1.2 6-3.5 6-7v-4L8 1Z'
				stroke='currentColor'
				strokeWidth='1.3'
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
		</svg>
	);
}

function TargetIcon() {
	return (
		<svg viewBox='0 0 16 16' fill='none' className='h-4 w-4' aria-hidden='true'>
			<circle cx='8' cy='8' r='6' stroke='currentColor' strokeWidth='1.3' />
			<circle cx='8' cy='8' r='3' stroke='currentColor' strokeWidth='1.3' />
			<circle cx='8' cy='8' r='1' fill='currentColor' />
		</svg>
	);
}

/**
 * FeatureRowGoals — savings goals mock matching the real /goals page:
 * Active / Completed / Archived tabs, then goal cards with icon circle, name,
 * health badge (Critical / Building), saved-of-target amounts and %, animated
 * progress bar, remaining amount, due date, and linked-account line.
 * Client component: needs m.div for progress bar animation.
 * Layout: text left, mock right (lagoon-surface background).
 */
export function FeatureRowGoals() {
	const mounted = useMounted();
	const prefersReduced = useReducedMotion();
	const shouldAnimate = mounted && !prefersReduced;

	return (
		<section aria-label='Savings goals' className='bg-[var(--lagoon-surface)] py-20 md:py-28'>
			<div className='mx-auto max-w-[1184px] px-6 md:px-10'>
				<div className='grid items-center gap-12 lg:grid-cols-2 lg:gap-20'>
					{/* ── Text side ── */}
					<LagoonReveal>
						<p className='mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--lagoon-accent)]'>
							Feature 03
						</p>
						<h2
							className='lagoon-section-title mb-5 text-[var(--lagoon-ink)]'
							style={{ fontFamily: 'var(--lagoon-font-heading, inherit)' }}
						>
							Goals that track themselves.
						</h2>
						<p className='mb-8 text-[17px] leading-[1.7] text-[var(--lagoon-body)]'>
							Create a savings goal, link it to an account, and progress updates
							automatically as your balance grows. No manual updates, no guessing
							how far you are from the finish line.
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
										<span className='truncate text-[11px] text-[var(--lagoon-muted)]'>budgetplanner.app/goals</span>
									</div>
								</div>
							</div>

							{/* Page content */}
							<div className='p-4'>
								{/* Page title */}
								<p
									className='mb-3 text-[13px] font-semibold text-[var(--lagoon-ink)]'
									style={{ fontFamily: 'var(--lagoon-font-heading, inherit)' }}
								>
									Savings Goals
								</p>

								{/* Tabs — mirrors GoalList (Active / Completed / Archived) */}
								<div className='mb-3 flex gap-1.5'>
									{TABS.map((tab, i) => (
										<span
											key={tab}
											className={
												i === 0
													? 'rounded-md border border-[var(--lagoon-border)] px-2.5 py-1 text-[10px] font-semibold text-[var(--lagoon-ink)]'
													: 'rounded-md px-2.5 py-1 text-[10px] text-[var(--lagoon-muted)]'
											}
											style={i === 0 ? { background: 'var(--lagoon-surface-2)' } : undefined}
										>
											{tab}
										</span>
									))}
								</div>

								{/* Goal cards — mirrors GoalCard layout */}
								<div className='space-y-3'>
									{GOALS.map((g, i) => (
										<div
											key={g.name}
											className='rounded-xl border border-[var(--lagoon-border)] p-3'
											style={{ background: 'var(--lagoon-canvas)' }}
										>
											{/* Card header: icon + name + linked account + health badge */}
											<div className='mb-2 flex items-start justify-between gap-2'>
												<div className='flex items-center gap-2'>
													<span
														className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${g.iconClass}`}
													>
														{i === 0 ? <ShieldIcon /> : <TargetIcon />}
													</span>
													<div>
														<p className='text-[12px] font-semibold text-[var(--lagoon-ink)]'>{g.name}</p>
														{g.linkedAccount && (
															<p className='text-[10px] text-[var(--lagoon-muted)]'>
																Linked to {g.linkedAccount}
															</p>
														)}
													</div>
												</div>
												{/* Health badge (Critical / Building / Funded) */}
												<span
													className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${g.healthClass}`}
												>
													{g.healthLabel}
												</span>
											</div>

											{/* Amounts + percentage (mirrors GoalCard progress section) */}
											<div className='mb-1.5 flex justify-between text-[11px]'>
												<span className='text-[var(--lagoon-muted)]'>
													₱{g.current.toLocaleString('en-US')} of ₱{g.target.toLocaleString('en-US')}
												</span>
												<span className='font-medium text-[var(--lagoon-ink)]'>{g.pct}%</span>
											</div>

											{/* Animated progress bar */}
											<div
												className='mb-1.5 h-2 overflow-hidden rounded-full'
												style={{ background: 'var(--lagoon-surface-2)' }}
											>
												<m.div
													className='h-full rounded-full'
													style={{
														width: `${g.pct}%`,
														background: 'var(--lagoon-accent)',
														transformOrigin: 'left',
													}}
													initial={shouldAnimate ? { scaleX: 0 } : { scaleX: 1 }}
													whileInView={{ scaleX: 1 }}
													viewport={{ once: true, margin: '-40px' }}
													transition={{ duration: 0.9, delay: i * 0.15, ease: 'easeOut' }}
												/>
											</div>

											{/* Remaining + deadline (mirrors GoalCard bottom row) */}
											<div className='flex justify-between text-[10px] text-[var(--lagoon-muted)]'>
												<span>₱{g.remaining.toLocaleString('en-US')} remaining</span>
												{g.deadline && <span>Due {g.deadline}</span>}
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					</LagoonReveal>
				</div>
			</div>
		</section>
	);
}
