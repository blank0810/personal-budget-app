'use client';

import { m, useReducedMotion } from 'motion/react';
import { LagoonReveal } from '../LagoonReveal';
import { useMounted } from '@/components/modules/landing/ui/use-mounted';

// ── Per-step in-code visual mocks ──────────────────────────────────────────
// All aria-hidden; no external images; HTML + inline SVG only.
// Colors mirror the real app: income=emerald, expense=red, transfer=blue, over-budget=amber.

const ChevronDown = () => (
	<svg viewBox='0 0 12 12' fill='none' className='h-3 w-3 shrink-0 text-[var(--lagoon-muted)]' aria-hidden='true'>
		<path d='M2 4l4 4 4-4' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
	</svg>
);

/** Step 1: Real "Set Budget" form — Budget Name, Limit, Category, Month dropdowns, Create Budget CTA */
function Step1Mock() {
	return (
		<div
			aria-hidden='true'
			className='select-none rounded-2xl border border-[var(--lagoon-border)] bg-[var(--lagoon-surface)] p-5 shadow-sm'
		>
			<p className='mb-4 text-[13px] font-semibold text-[var(--lagoon-ink)]'>Set Budget</p>

			<div className='space-y-3'>
				{/* Budget Name */}
				<div>
					<p className='mb-1 text-[11px] font-medium text-[var(--lagoon-ink-2)]'>Budget Name</p>
					<div className='rounded-lg border border-[var(--lagoon-border)] px-3 py-2'>
						<span className='text-[12px] text-[var(--lagoon-muted)]'>e.g., &quot;Groceries Budget&quot;</span>
					</div>
				</div>

				{/* Budget Limit */}
				<div>
					<p className='mb-1 text-[11px] font-medium text-[var(--lagoon-ink-2)]'>Budget Limit</p>
					<div className='rounded-lg border border-[var(--lagoon-border)] px-3 py-2'>
						<span className='text-[12px] text-[var(--lagoon-ink)]'>6,000.00</span>
					</div>
				</div>

				{/* Category */}
				<div>
					<p className='mb-1 text-[11px] font-medium text-[var(--lagoon-ink-2)]'>Category</p>
					<div className='flex items-center justify-between rounded-lg border border-[var(--lagoon-border)] px-3 py-2'>
						<span className='text-[12px] text-[var(--lagoon-ink-2)]'>Food &amp; Dining</span>
						<ChevronDown />
					</div>
				</div>

				{/* Budget Month — two inline dropdowns (month | year) */}
				<div>
					<p className='mb-1 text-[11px] font-medium text-[var(--lagoon-ink-2)]'>Budget Month</p>
					<div className='flex gap-2'>
						<div className='flex flex-1 items-center justify-between rounded-lg border border-[var(--lagoon-border)] px-3 py-2'>
							<span className='text-[12px] text-[var(--lagoon-ink-2)]'>June</span>
							<ChevronDown />
						</div>
						<div className='flex flex-1 items-center justify-between rounded-lg border border-[var(--lagoon-border)] px-3 py-2'>
							<span className='text-[12px] text-[var(--lagoon-ink-2)]'>2026</span>
							<ChevronDown />
						</div>
					</div>
				</div>

				{/* CTA */}
				<div
					className='flex items-center justify-center rounded-lg py-2 text-[12px] font-semibold text-white'
					style={{ background: 'var(--lagoon-accent)' }}
				>
					Create Budget
				</div>
			</div>
		</div>
	);
}

/** Step 2: Transaction table with type badges (Income / Expense / Transfer) + CSV import block */
function Step2Mock() {
	const ROWS = [
		{ desc: 'Jollibee', sub: 'Food', type: 'Expense', amount: '-₱350', amtColor: '#ef4444', badgeColor: '#ef4444' },
		{ desc: 'Freelance', sub: 'Freelance Part 2', type: 'Income', amount: '+₱15,000', amtColor: '#10b981', badgeColor: '#10b981' },
		{ desc: 'Main Bank → Savings', sub: '', type: 'Transfer', amount: '-₱5,000', amtColor: '#3b82f6', badgeColor: '#3b82f6' },
	];

	return (
		<div
			aria-hidden='true'
			className='select-none rounded-2xl border border-[var(--lagoon-border)] bg-[var(--lagoon-surface)] p-5 shadow-sm'
		>
			{/* Type filter pills — mirrors real transaction page tabs */}
			<div className='mb-3 flex items-center gap-1.5 flex-wrap'>
				{(['All', 'Income', 'Expense', 'Transfer'] as const).map((f, i) => (
					<span
						key={f}
						className='rounded-full px-2.5 py-0.5 text-[10px] font-semibold'
						style={
							i === 0
								? { background: 'var(--lagoon-accent)', color: 'white' }
								: { background: 'var(--lagoon-surface-2)', color: 'var(--lagoon-muted)' }
						}
					>
						{f}
					</span>
				))}
			</div>

			{/* Transaction rows */}
			<div className='divide-y' style={{ borderColor: 'var(--lagoon-surface-2)' }}>
				{ROWS.map((r) => (
					<div key={r.desc} className='flex items-center gap-2 py-2'>
						{/* Type badge */}
						<span
							className='shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold text-white'
							style={{ background: r.badgeColor }}
						>
							{r.type}
						</span>
						{/* Description */}
						<div className='min-w-0 flex-1'>
							<p className='truncate text-[12px] font-medium text-[var(--lagoon-ink-2)]'>{r.desc}</p>
							{r.sub && (
								<p className='truncate text-[10px] text-[var(--lagoon-muted)]'>{r.sub}</p>
							)}
						</div>
						{/* Amount */}
						<span className='shrink-0 text-[12px] font-semibold' style={{ color: r.amtColor }}>
							{r.amount}
						</span>
					</div>
				))}
			</div>

			{/* CSV import divider */}
			<div className='mt-3 flex items-center gap-2'>
				<div className='h-px flex-1' style={{ background: 'var(--lagoon-surface-2)' }} />
				<span className='text-[11px] text-[var(--lagoon-muted)]'>or</span>
				<div className='h-px flex-1' style={{ background: 'var(--lagoon-surface-2)' }} />
			</div>
			<div
				className='mt-2 flex items-center justify-center gap-2 rounded-lg border border-dashed py-2.5'
				style={{ borderColor: 'var(--lagoon-border-soft)' }}
			>
				<svg
					viewBox='0 0 16 16'
					fill='none'
					className='h-4 w-4'
					style={{ color: 'var(--lagoon-accent)' }}
					aria-hidden='true'
				>
					<path
						d='M8 10V3M5 6l3-3 3 3'
						stroke='currentColor'
						strokeWidth='1.4'
						strokeLinecap='round'
						strokeLinejoin='round'
					/>
					<path d='M3 13h10' stroke='currentColor' strokeWidth='1.4' strokeLinecap='round' />
				</svg>
				<span className='text-[13px] font-medium text-[var(--lagoon-body)]'>Import CSV</span>
			</div>
		</div>
	);
}

/** Step 3: Animated budget envelope bars + a savings goal card — both update live */
function Step3Mock({ shouldAnimate }: { shouldAnimate: boolean }) {
	const BARS = [
		{ label: 'Food & Dining', used: 4200, total: 6000, pct: 70, warn: false },
		{ label: 'Transport', used: 2100, total: 3000, pct: 70, warn: false },
		{ label: 'Entertainment', used: 2800, total: 3500, pct: 80, warn: true },
	];

	// Savings goal — mirrors real Goals page card layout
	const GOAL = { name: 'Emergency Fund', saved: 8500, target: 20000, pct: 43 };

	return (
		<div
			aria-hidden='true'
			className='select-none rounded-2xl border border-[var(--lagoon-border)] bg-[var(--lagoon-surface)] p-5 shadow-sm'
		>
			<div className='mb-3 flex items-center justify-between'>
				<p className='text-[10px] font-semibold uppercase tracking-wider text-[var(--lagoon-muted)]'>
					Budgets — June 2026
				</p>
				<span className='rounded-full bg-[var(--lagoon-accent-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--lagoon-accent)]'>
					Live
				</span>
			</div>

			{/* Budget envelope bars */}
			<div className='space-y-3'>
				{BARS.map((b, i) => (
					<div key={b.label}>
						<div className='mb-1 flex items-baseline justify-between'>
							<span className='text-[12px] font-medium text-[var(--lagoon-ink-2)]'>{b.label}</span>
							<span className='text-[10px] text-[var(--lagoon-muted)]'>
								₱{b.used.toLocaleString()} / ₱{b.total.toLocaleString()}
							</span>
						</div>
						<div
							className='h-2 overflow-hidden rounded-full'
							style={{ background: 'var(--lagoon-surface-2)' }}
						>
							<m.div
								className='h-full rounded-full'
								style={{
									width: `${b.pct}%`,
									background: b.warn ? '#f59e0b' : 'var(--lagoon-accent)',
									transformOrigin: 'left',
								}}
								initial={shouldAnimate ? { scaleX: 0 } : { scaleX: 1 }}
								whileInView={{ scaleX: 1 }}
								viewport={{ once: true, margin: '-30px' }}
								transition={{
									duration: 0.75,
									delay: i * 0.08 + 0.15,
									ease: [0.25, 1, 0.35, 1],
								}}
							/>
						</div>
					</div>
				))}
			</div>

			{/* Savings goal card — mirrors real Goals page (name, ₱saved/₱target, % bar) */}
			<div
				className='mt-4 rounded-xl border p-3'
				style={{ borderColor: 'var(--lagoon-border)', background: 'var(--lagoon-canvas)' }}
			>
				<div className='mb-1.5 flex items-baseline justify-between'>
					<span className='text-[12px] font-semibold text-[var(--lagoon-ink-2)]'>{GOAL.name}</span>
					<span className='text-[11px] font-bold' style={{ color: 'var(--lagoon-accent)' }}>
						{GOAL.pct}%
					</span>
				</div>
				<div
					className='mb-1.5 h-1.5 overflow-hidden rounded-full'
					style={{ background: 'var(--lagoon-surface-2)' }}
				>
					<m.div
						className='h-full rounded-full'
						style={{
							width: `${GOAL.pct}%`,
							background: 'var(--lagoon-accent)',
							transformOrigin: 'left',
						}}
						initial={shouldAnimate ? { scaleX: 0 } : { scaleX: 1 }}
						whileInView={{ scaleX: 1 }}
						viewport={{ once: true, margin: '-30px' }}
						transition={{ duration: 0.8, delay: 0.45, ease: [0.25, 1, 0.35, 1] }}
					/>
				</div>
				<p className='text-[10px] text-[var(--lagoon-muted)]'>
					₱{GOAL.saved.toLocaleString()} of ₱{GOAL.target.toLocaleString()}
				</p>
			</div>
		</div>
	);
}

/** Step 4: Dashboard Overview KPIs (Net Worth / Savings Rate / Emergency Fund / Credit Usage)
 *  + Income vs Expenses mini grouped chart — mirrors real dashboard Overview panel */
function Step4Mock() {
	// Labels match the real dashboard Overview panel exactly
	const KPI = [
		{ label: 'Net Worth', value: '₱125,400', color: 'var(--lagoon-ink)' },
		{ label: 'Savings Rate', value: '35.0%', color: '#10b981' },
		{ label: 'Emergency Fund', value: '₱8,500', color: 'var(--lagoon-ink)' },
		{ label: 'Credit Usage', value: '49.3%', color: '#ef4444' },
	];

	// Income (green) vs Expenses (red) — last 6 months relative heights
	const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
	const INCOME  = [55, 62, 48, 70, 58, 72];
	const EXPENSE = [38, 44, 52, 42, 46, 40];

	return (
		<div
			aria-hidden='true'
			className='select-none rounded-2xl border border-[var(--lagoon-border)] bg-[var(--lagoon-surface)] p-5 shadow-sm'
		>
			{/* Panel header + health score badge */}
			<div className='mb-3 flex items-center justify-between'>
				<p className='text-[10px] font-semibold uppercase tracking-wider text-[var(--lagoon-muted)]'>
					Overview
				</p>
				<span
					className='rounded-full px-2.5 py-0.5 text-[10px] font-bold'
					style={{ background: 'var(--lagoon-accent-bg)', color: 'var(--lagoon-accent)' }}
				>
					87/100 Excellent
				</span>
			</div>

			{/* 2×2 KPI grid — mirrors real dashboard Health tab */}
			<div className='mb-4 grid grid-cols-2 gap-2'>
				{KPI.map((k) => (
					<div key={k.label} className='rounded-xl p-2.5' style={{ background: 'var(--lagoon-canvas)' }}>
						<p className='mb-0.5 text-[9px] font-medium uppercase tracking-wide text-[var(--lagoon-muted)]'>
							{k.label}
						</p>
						<p className='text-[12px] font-bold leading-none' style={{ color: k.color }}>
							{k.value}
						</p>
					</div>
				))}
			</div>

			{/* Income vs Expenses grouped bar chart */}
			<p className='mb-2 text-[9px] font-semibold uppercase tracking-wider text-[var(--lagoon-muted)]'>
				Income vs Expenses
			</p>
			<div className='flex items-end gap-1' style={{ height: 44 }}>
				{MONTHS.map((mo, i) => (
					<div key={mo} className='flex flex-1 items-end gap-0.5'>
						{/* Income bar — emerald */}
						<div
							className='flex-1 rounded-t'
							style={{ height: `${INCOME[i]}%`, background: '#10b981' }}
						/>
						{/* Expense bar — red */}
						<div
							className='flex-1 rounded-t'
							style={{ height: `${EXPENSE[i]}%`, background: '#ef4444' }}
						/>
					</div>
				))}
			</div>
			{/* Month labels */}
			<div className='mt-1 flex gap-1'>
				{MONTHS.map((mo) => (
					<p key={mo} className='flex-1 text-center text-[8px] text-[var(--lagoon-muted)]'>{mo}</p>
				))}
			</div>

			{/* Legend */}
			<div className='mt-2 flex items-center gap-3'>
				<span className='flex items-center gap-1 text-[9px] text-[var(--lagoon-muted)]'>
					<span className='h-2 w-2 rounded-sm' style={{ background: '#10b981' }} />
					Income
				</span>
				<span className='flex items-center gap-1 text-[9px] text-[var(--lagoon-muted)]'>
					<span className='h-2 w-2 rounded-sm' style={{ background: '#ef4444' }} />
					Expenses
				</span>
			</div>
		</div>
	);
}

// ── Mock dispatcher ───────────────────────────────────────────────────────────

function StepMock({ index, shouldAnimate }: { index: number; shouldAnimate: boolean }) {
	if (index === 0) return <Step2Mock />;                       // 01 Log → transactions
	if (index === 1) return <Step4Mock />;                       // 02 Score → dashboard + 87/100 badge
	if (index === 2) return <Step1Mock />;                       // 03 Budgets → Set Budget form
	return <Step3Mock shouldAnimate={shouldAnimate} />;          // 04 Together → live budget/goal bars
}

// ── Steps metadata ────────────────────────────────────────────────────────────

const STEPS = [
	{
		number: '01',
		title: 'Log a transaction — or import a CSV',
		desc: 'Add income and expenses as they happen. Got a month of bank history? Import it as a CSV in one go. Recurring bills can run on autopilot. No bank linking, ever.',
	},
	{
		number: '02',
		title: 'Get your financial health score',
		desc: 'The moment you log, the app grades your finances across five pillars — Solvency, Liquidity, Savings, Debt, and Cash Flow — into one honest score out of 100. It sharpens as you log more.',
	},
	{
		number: '03',
		title: 'Set budgets and savings goals',
		desc: 'Want more control? Create budget envelopes and savings goals. Every transaction you log updates them in real time, so you always know your headroom before the month ends.',
	},
	{
		number: '04',
		title: 'Watch it all come together',
		desc: 'Your dashboard and monthly reports turn everything you logged into a clear picture — by category, by account, by goal — and land in your inbox automatically.',
	},
] as const;

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * HowItWorksSteps — animated vertical step timeline.
 *
 * Layout: single left-column vertical line (absolutely positioned, spans all steps)
 * with teal numbered badges riding on it. Each step row holds a 2-col grid:
 * text (left) + in-code visual mock (right). On mobile the columns stack.
 *
 * This avoids the gappy horizontal connector from Phase 1 — the connector is
 * a single continuous line outside the step cards, not inside step rows.
 */
export function HowItWorksSteps() {
	const mounted = useMounted();
	const prefersReduced = useReducedMotion();
	const shouldAnimate = mounted && !prefersReduced;

	return (
		<section
			className='bg-[var(--lagoon-surface)] py-20 md:py-28'
			aria-label='Step-by-step workflow'
		>
			<div className='mx-auto max-w-[1184px] px-6 md:px-10'>
				<div className='relative'>
					{/*
					 * Single vertical connector line — absolutely positioned,
					 * runs from the center of the first badge to the center of the last.
					 * Offset by 21px (half of the 44px badge width) to center on the dots.
					 * Starts at top:22px (half-badge), ends 22px before container bottom.
					 */}
					<div
						aria-hidden='true'
						className='absolute top-[22px] bottom-[22px] w-px'
						style={{
							left: '21px',
							background: 'linear-gradient(to bottom, var(--lagoon-accent) 0%, var(--lagoon-accent-tint) 100%)',
						}}
					/>

					{STEPS.map((step, i) => (
						<LagoonReveal key={step.number} delay={i * 0.07}>
							<div
								className={
									'relative flex items-start gap-6 md:gap-10' +
									(i < STEPS.length - 1 ? ' mb-14 md:mb-20' : '')
								}
							>
								{/* Step badge — z-10 so it sits above the connector line */}
								<div
									className='relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold text-white'
									style={{ background: 'var(--lagoon-accent)' }}
									aria-hidden='true'
								>
									{step.number}
								</div>

								{/* Content row: text + mock */}
								<div className='min-w-0 flex-1 grid grid-cols-1 gap-6 pt-1.5 md:grid-cols-2 md:gap-12'>
									{/* Text */}
									<div>
										<h2
											className='mb-3 text-[22px] font-bold leading-tight tracking-[-0.025em] text-[var(--lagoon-ink)] md:text-[26px]'
											style={{ fontFamily: 'var(--lagoon-font-heading, inherit)' }}
										>
											{step.title}
										</h2>
										<p className='max-w-[42ch] text-[15px] leading-[1.7] text-[var(--lagoon-body)]'>
											{step.desc}
										</p>
									</div>

									{/* Visual mock */}
									<StepMock index={i} shouldAnimate={shouldAnimate} />
								</div>
							</div>
						</LagoonReveal>
					))}
				</div>
			</div>
		</section>
	);
}
