'use client';

import { m, useReducedMotion } from 'motion/react';
import { useMounted } from '@/components/modules/landing/ui/use-mounted';
import { LagoonReveal } from '@/components/modules/landing/lagoon/LagoonReveal';

// ─── Real app: reports/page.tsx — Overview tab layout ─────────
// Row 1: FinancialHealthCheck (badge variant) + KPICards
//         (Net Result / Inflow Velocity / Burn Rate / Savings Ratio)
// Row 2: NetWorthTrendChart (Net Worth / Total Assets / Total Liabilities)
// Row 3: FinancialHealthCheck (pillars-only) —
//         5 dimensions: Solvency / Liquidity / Savings / Debt Management / Cash Flow
//         each with score, grade (A–F), and progress bar.
// Tabs: Overview / Income & Expenses / Budget Analytics / Statements

const HEALTH_SCORE = 94;
const SCORE_R = 26;
const SCORE_CIRC = 2 * Math.PI * SCORE_R;

const KPI = [
	{ label: 'Net Result',      value: '₱16,200', pct: '+12.3%', positive: true  },
	{ label: 'Inflow Velocity', value: '₱42,000', pct: '0.0%',   positive: null  },
	{ label: 'Burn Rate',       value: '₱25,800', pct: '+5.2%',  positive: false },
] as const;

// 5-pillar Financial Health Breakdown — matching FinancialHealthCheck.tsx
const PILLARS = [
	{ name: 'Solvency',         score: 100, grade: 'A' },
	{ name: 'Liquidity',        score: 95,  grade: 'A' },
	{ name: 'Savings',          score: 82,  grade: 'B' },
	{ name: 'Debt Management',  score: 100, grade: 'A' },
	{ name: 'Cash Flow',        score: 88,  grade: 'A' },
] as const;

// Net Worth Trend — three series on a shared Y scale (₱)
const NW_W = 200;
const NW_H = 36;
const NW_NET   = [12000, 13500, 15200, 14800, 16100, 17400, 19200];
const NW_ASSET = [16000, 18000, 19800, 19200, 21000, 22500, 24000];
const NW_LIAB  = [4000,  4500,  4600,  4400,  4900,  5100,  4800];

const ALL_NW = [...NW_NET, ...NW_ASSET, ...NW_LIAB];
const NW_MIN = Math.min(...ALL_NW);
const NW_MAX = Math.max(...ALL_NW);

function nwPath(pts: number[]): string {
	const range = NW_MAX - NW_MIN;
	return pts
		.map((v, i) => {
			const x = (i / (pts.length - 1)) * NW_W;
			const y = NW_H - ((v - NW_MIN) / range) * NW_H * 0.88;
			return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
		})
		.join(' ');
}

const TABS = ['Overview', 'Income & Expenses', 'Budget Analytics', 'Statements'];

const BENEFITS = [
	'Financial Health Score across 5 pillars — Solvency, Liquidity, Savings, Debt Management, Cash Flow',
	'Net Worth Trend tracking total assets and liabilities over time',
	'PDF-exportable statements — export a clean report in one click',
];

/**
 * FeatureRowReports — financial analytics deep-dive mock.
 * Client component: animated health score ring.
 * Mirrors the real /reports Overview tab:
 *   - FinancialHealthCheck badge (score ring + label)
 *   - KPI cards: Net Result / Inflow Velocity / Burn Rate / Savings Ratio
 *   - Net Worth Trend (3-series SVG sparkline)
 *   - Financial Health Breakdown (5 pillars with grade badges + progress bars)
 * Layout: mock left, text right (canvas background).
 */
export function FeatureRowReports() {
	const mounted = useMounted();
	const prefersReduced = useReducedMotion();
	const shouldAnimate = mounted && !prefersReduced;

	return (
		<section aria-label='Reports and health score' className='bg-[var(--lagoon-canvas)] py-20 md:py-28'>
			<div className='mx-auto max-w-[1184px] px-6 md:px-10'>
				<div className='grid items-center gap-12 lg:grid-cols-2 lg:gap-20'>
					{/* Text side — first in DOM (mobile), right column on desktop */}
					<LagoonReveal className='lg:order-2'>
						<p className='mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--lagoon-accent)]'>
							Feature 05
						</p>
						<h2
							className='lagoon-section-title mb-5 text-[var(--lagoon-ink)]'
							style={{ fontFamily: 'var(--lagoon-font-heading, inherit)' }}
						>
							Reports that tell the full story.
						</h2>
						<p className='mb-8 text-[17px] leading-[1.7] text-[var(--lagoon-body)]'>
							A live Financial Health Score across five pillars, KPI cards with
							trend indicators, Net Worth Trend, and one-click PDF statements — all
							in a single view.
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
										<span className='truncate text-[11px] text-[var(--lagoon-muted)]'>budget.umbra.build/reports</span>
									</div>
								</div>
							</div>

							{/* Content */}
							<div className='space-y-3 p-4'>
								{/* Page header */}
								<div className='flex items-center justify-between'>
									<div>
										<p
											className='text-[13px] font-semibold text-[var(--lagoon-ink)]'
											style={{ fontFamily: 'var(--lagoon-font-heading, inherit)' }}
										>
											Financial Analytics
										</p>
										<p className='text-[10px] text-[var(--lagoon-muted)]'>
											Deep dive into your financial performance.
										</p>
									</div>
									<div className='flex items-center gap-1.5'>
										<div className='rounded-md border border-[var(--lagoon-border)] bg-[var(--lagoon-surface)] px-2 py-1 text-[9px] text-[var(--lagoon-muted)]'>
											Jun 2026
										</div>
										<div className='rounded-md border border-[var(--lagoon-accent-border)] bg-[var(--lagoon-accent-bg)] px-2 py-1 text-[9px] font-medium text-[var(--lagoon-accent)]'>
											Send Report
										</div>
									</div>
								</div>

								{/* Tab strip — Overview active */}
								<div className='flex border-b border-[var(--lagoon-border)]'>
									{TABS.map((tab) => (
										<span
											key={tab}
											className='shrink-0 px-2 py-1.5 text-[9px]'
											style={{
												color: tab === 'Overview' ? 'var(--lagoon-accent)' : 'var(--lagoon-muted)',
												borderBottom: tab === 'Overview'
													? '2px solid var(--lagoon-accent)'
													: '2px solid transparent',
												fontWeight: tab === 'Overview' ? 600 : 400,
												marginBottom: -1,
											}}
										>
											{tab}
										</span>
									))}
								</div>

								{/* Row 1: Health badge + KPI cards */}
								<div className='grid grid-cols-4 gap-1.5'>
									{/* Health badge — FinancialHealthCheck variant="badge" */}
									<div className='col-span-1 flex flex-col items-center justify-center rounded-lg border border-[var(--lagoon-border)] bg-[var(--lagoon-surface)] p-2'>
										<div className='relative' style={{ width: 48, height: 48 }}>
											<svg width='48' height='48' viewBox='0 0 60 60' role='img' aria-label={`Health score: ${HEALTH_SCORE}/100`}>
												<circle
													cx='30'
													cy='30'
													r={SCORE_R}
													fill='none'
													stroke='var(--lagoon-surface-2)'
													strokeWidth='5'
												/>
												<m.circle
													cx='30'
													cy='30'
													r={SCORE_R}
													fill='none'
													stroke='#10b981'
													strokeWidth='5'
													strokeLinecap='round'
													strokeDasharray={SCORE_CIRC}
													initial={{ strokeDashoffset: SCORE_CIRC }}
													whileInView={{
														strokeDashoffset: shouldAnimate
															? SCORE_CIRC * (1 - HEALTH_SCORE / 100)
															: SCORE_CIRC * (1 - HEALTH_SCORE / 100),
													}}
													viewport={{ once: true, margin: '-40px' }}
													transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
													style={{ rotate: -90, transformOrigin: '30px 30px' }}
												/>
											</svg>
											<div className='absolute inset-0 flex flex-col items-center justify-center'>
												<span className='text-[12px] font-bold text-emerald-500'>{HEALTH_SCORE}</span>
												<span className='text-[7px] text-[var(--lagoon-muted)]'>/100</span>
											</div>
										</div>
										<p className='mt-1 text-[9px] font-bold text-emerald-500'>Excellent</p>
									</div>

									{/* KPI cards */}
									{KPI.map((k) => (
										<div key={k.label} className='rounded-lg border border-[var(--lagoon-border)] bg-[var(--lagoon-surface)] p-2'>
											<p className='text-[8px] text-[var(--lagoon-muted)]'>{k.label}</p>
											<p className='mt-0.5 text-[11px] font-bold text-[var(--lagoon-ink)]'>{k.value}</p>
											<p
												className={`mt-0.5 text-[8px] font-medium ${
													k.positive === true
														? 'text-emerald-500'
														: k.positive === false
															? 'text-rose-500'
															: 'text-[var(--lagoon-muted)]'
												}`}
											>
												{k.pct}
											</p>
										</div>
									))}
								</div>

								{/* Row 2: Net Worth Trend — 3-series SVG sparkline */}
								<div className='rounded-lg border border-[var(--lagoon-border)] bg-[var(--lagoon-surface)] p-2.5'>
									<div className='mb-2 flex items-center justify-between'>
										<p className='text-[10px] font-semibold text-[var(--lagoon-ink)]'>Net Worth Trend</p>
										<div className='flex items-center gap-2.5'>
											<span className='flex items-center gap-1 text-[8px] text-[var(--lagoon-muted)]'>
												<span className='inline-block h-1.5 w-3 rounded' style={{ background: 'var(--lagoon-accent)' }} />
												Net Worth
											</span>
											<span className='flex items-center gap-1 text-[8px] text-[var(--lagoon-muted)]'>
												<span className='inline-block h-1.5 w-3 rounded bg-emerald-500' />
												Assets
											</span>
											<span className='flex items-center gap-1 text-[8px] text-[var(--lagoon-muted)]'>
												<span className='inline-block h-1.5 w-3 rounded bg-rose-500' />
												Liabilities
											</span>
										</div>
									</div>
									<svg
										viewBox={`0 0 ${NW_W} ${NW_H}`}
										className='w-full'
										style={{ height: 36, display: 'block' }}
									>
										<path
											d={nwPath(NW_NET)}
											fill='none'
											stroke='var(--lagoon-accent)'
											strokeWidth='1.8'
											strokeLinecap='round'
											strokeLinejoin='round'
										/>
										<path
											d={nwPath(NW_ASSET)}
											fill='none'
											stroke='#10b981'
											strokeWidth='1'
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeDasharray='3 2'
										/>
										<path
											d={nwPath(NW_LIAB)}
											fill='none'
											stroke='#f43f5e'
											strokeWidth='1'
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeDasharray='3 2'
										/>
									</svg>
								</div>

								{/* Row 3: Financial Health Breakdown — 5 pillars */}
								<div className='rounded-lg border border-[var(--lagoon-border)] bg-[var(--lagoon-surface)] p-2.5'>
									<p className='mb-2 text-[10px] font-semibold text-[var(--lagoon-ink)]'>
										Financial Health Breakdown
									</p>
									<div className='space-y-1.5'>
										{PILLARS.map((p) => (
											<div key={p.name} className='flex items-center gap-2'>
												<span className='w-[76px] shrink-0 truncate text-[8px] text-[var(--lagoon-body)]'>
													{p.name}
												</span>
												<div className='h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--lagoon-surface-2)]'>
													<div
														className='h-full rounded-full bg-emerald-500'
														style={{ width: `${p.score}%` }}
													/>
												</div>
												<span className='w-6 shrink-0 text-right text-[8px] tabular-nums text-[var(--lagoon-muted)]'>
													{p.score}
												</span>
												<span
													className={`shrink-0 rounded px-1 py-0.5 text-[7px] font-bold ${
														p.grade === 'A'
															? 'bg-emerald-500/10 text-emerald-600'
															: 'bg-green-500/10 text-green-600'
													}`}
												>
													{p.grade}
												</span>
											</div>
										))}
									</div>
								</div>
							</div>
						</div>
					</LagoonReveal>
				</div>
			</div>
		</section>
	);
}
