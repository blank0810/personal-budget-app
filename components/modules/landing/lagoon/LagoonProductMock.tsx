'use client';

import { m, useReducedMotion } from 'motion/react';
import { useMounted } from '@/components/modules/landing/ui/use-mounted';

/**
 * Sample data for the product mock.
 * All values use ₱ (Philippine peso) with realistic figures.
 * Neutral account names only — no real person data.
 */
const ACCOUNT = {
	name: 'Main Bank',
	type: 'bank',
	masked: '•••• •••• •••• 4821',
	balance: '₱35,500.00',
};

const TOTAL_BALANCE = '₱68,250.00';

// Health overview KPIs matching the real DashboardTabs "Health" tab
const KPIS = [
	{ label: 'Net Worth', value: '₱68,250', variant: 'positive' as const },
	{ label: 'Savings Rate', value: '28.5%', variant: 'positive' as const },
	{ label: 'Emergency Fund', value: '4.2 mo', variant: 'warn' as const },
	{ label: 'Credit Usage', value: 'N/A', variant: 'neutral' as const },
];

// Recent transactions grouped by date — format mirrors RecentTransactions.tsx
// (description, "category • accountName", signed amount)
const TRANSACTION_GROUPS = [
	{
		date: 'Jun 27',
		txns: [
			{ desc: 'June Salary', sub: 'Salary • Main Bank', amt: '+₱42,000', pos: true },
			{ desc: 'Rent', sub: 'Housing • Main Bank', amt: '−₱12,000', pos: false },
		],
	},
	{
		date: 'Jun 26',
		txns: [
			{ desc: 'Groceries', sub: 'Food & Dining • Cash Wallet', amt: '−₱1,450', pos: false },
			{ desc: 'Grab ride', sub: 'Transport • Cash Wallet', amt: '−₱180', pos: false },
		],
	},
];

// Income vs Expenses chart — last 4 months, relative pixel heights (max bar = 72px)
// Mirrors IncomeExpenseTrend.tsx (income green, expense red)
const CHART_BARS = [
	{ month: 'Mar', income: 60, expense: 39 },
	{ month: 'Apr', income: 60, expense: 45 },
	{ month: 'May', income: 65, expense: 42 },
	{ month: 'Jun', income: 60, expense: 33 },
];

const CHART_SUMMARY = {
	income: '₱171,000',
	expense: '₱117,450',
	net: '+₱53,550',
};

// Quick action icons — matches AccountCardCarousel.tsx (Send / Receive / Transfer / Payment)
const QUICK_ACTIONS = [
	{
		label: 'Send',
		// Arrow up-right
		path: (
			<path
				d='M5 11L11 5M11 5H7M11 5V9'
				stroke='currentColor'
				strokeWidth='1.4'
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
		),
	},
	{
		label: 'Receive',
		// Arrow down-left
		path: (
			<path
				d='M11 5L5 11M5 11H9M5 11V7'
				stroke='currentColor'
				strokeWidth='1.4'
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
		),
	},
	{
		label: 'Transfer',
		// Left-right arrows
		path: (
			<path
				d='M3 5h10M10 3l2 2-2 2M13 11H3M6 9l-2 2 2 2'
				stroke='currentColor'
				strokeWidth='1.3'
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
		),
	},
	{
		label: 'Payment',
		// Credit card
		path: (
			<>
				<rect x='2' y='4' width='12' height='8' rx='1.5' stroke='currentColor' strokeWidth='1.3' fill='none' />
				<path d='M2 7h12' stroke='currentColor' strokeWidth='1.3' />
			</>
		),
	},
];

/**
 * Sidebar navigation icons — active uses --lagoon-accent; inactive uses --lagoon-muted.
 */
const SIDEBAR_ICONS = [
	{
		key: 'dash',
		active: true,
		path: (
			<>
				<rect x='2' y='2' width='5' height='5' rx='1' fill='var(--lagoon-accent)' />
				<rect x='9' y='2' width='5' height='5' rx='1' fill='var(--lagoon-accent)' fillOpacity='.4' />
				<rect x='2' y='9' width='5' height='5' rx='1' fill='var(--lagoon-accent)' fillOpacity='.4' />
				<rect x='9' y='9' width='5' height='5' rx='1' fill='var(--lagoon-accent)' fillOpacity='.4' />
			</>
		),
	},
	{
		key: 'txn',
		active: false,
		path: (
			<path
				d='M2 4h8M2 8h6M2 12h4M12 6l-2-2 2-2M12 6h-4M12 10l2 2-2 2M12 10H8'
				stroke='var(--lagoon-muted)'
				strokeWidth='1.2'
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
		),
	},
	{
		key: 'goals',
		active: false,
		path: (
			<>
				<circle cx='8' cy='8' r='6' stroke='var(--lagoon-muted)' strokeWidth='1.2' fill='none' />
				<circle cx='8' cy='8' r='3' stroke='var(--lagoon-muted)' strokeWidth='1.2' fill='none' />
				<circle cx='8' cy='8' r='1' fill='var(--lagoon-muted)' />
			</>
		),
	},
	{
		key: 'budgets',
		active: false,
		path: (
			<>
				<rect x='2' y='10' width='3' height='4' rx='.5' fill='var(--lagoon-muted)' fillOpacity='.6' />
				<rect x='6.5' y='7' width='3' height='7' rx='.5' fill='var(--lagoon-muted)' fillOpacity='.6' />
				<rect x='11' y='4' width='3' height='10' rx='.5' fill='var(--lagoon-muted)' fillOpacity='.6' />
			</>
		),
	},
];

// KPI variant → semantic color (hardcoded — these are financial signal colours,
// not surface/text tokens, so they stay literal in both light and dark themes)
function kpiColor(variant: 'positive' | 'warn' | 'neutral'): string {
	if (variant === 'positive') return '#10b981'; // green
	if (variant === 'warn') return '#f59e0b'; // amber
	return 'var(--lagoon-muted)';
}

/**
 * LagoonProductMock — browser chrome + real-dashboard-faithful UI mock.
 *
 * Structure mirrors the actual dashboard:
 *  Left  — credit-card account widget + quick actions + total balance + recent transactions
 *  Right — Overview (Health KPIs: Net Worth / Savings Rate / Emergency Fund / Credit Usage)
 *          + Income vs Expenses mini bar chart
 *
 * Dark mode: all surfaces/text/borders use --lagoon-* CSS tokens.
 * Exception: traffic-light dots (OS chrome), card gradient (card metaphor),
 * and semantic income/expense colours remain hardcoded.
 *
 * Animations (gated behind useMounted + prefers-reduced-motion):
 *  - Bar chart bars: scaleY 0 → target (whileInView, staggered)
 */
export function LagoonProductMock() {
	const mounted = useMounted();
	const prefersReduced = useReducedMotion();
	const shouldAnimate = mounted && !prefersReduced;

	return (
		<div className='lagoon-browser w-full select-none text-left' aria-hidden='true'>
			{/* ── Browser chrome ─────────────────────────────── */}
			<div
				className='flex items-center gap-3 border-b px-4 py-2.5'
				style={{
					background: 'var(--lagoon-canvas)',
					borderColor: 'var(--lagoon-border)',
				}}
			>
				{/* Traffic lights — OS chrome metaphor, stays hardcoded */}
				<div className='flex items-center gap-1.5' aria-hidden='true'>
					<span className='inline-block h-3 w-3 rounded-full' style={{ background: '#ff5f57' }} />
					<span className='inline-block h-3 w-3 rounded-full' style={{ background: '#febc2e' }} />
					<span className='inline-block h-3 w-3 rounded-full' style={{ background: '#28c840' }} />
				</div>

				{/* Address bar */}
				<div className='flex flex-1 justify-center'>
					<div
						className='flex w-[240px] max-w-full items-center gap-1.5 rounded-md border px-3 py-1'
						style={{
							borderColor: 'var(--lagoon-border)',
							background: 'var(--lagoon-surface)',
						}}
					>
						<svg
							viewBox='0 0 16 16'
							fill='none'
							className='h-3 w-3 shrink-0'
							style={{ color: 'var(--lagoon-muted)' }}
						>
							<path
								d='M11.5 7V5.5a3.5 3.5 0 0 0-7 0V7M3 7h10a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z'
								stroke='currentColor'
								strokeWidth='1.2'
								strokeLinecap='round'
							/>
						</svg>
						<span className='truncate text-[11px]' style={{ color: 'var(--lagoon-muted)' }}>
							budgetplanner.app/dashboard
						</span>
					</div>
				</div>
			</div>

			{/* ── App shell ──────────────────────────────────── */}
			<div className='flex' style={{ minHeight: 460 }}>
				{/* Sidebar */}
				<div
					className='flex w-12 shrink-0 flex-col items-center gap-1.5 border-r py-3'
					style={{
						background: 'var(--lagoon-canvas)',
						borderColor: 'var(--lagoon-border)',
					}}
				>
					{SIDEBAR_ICONS.map(({ key, active, path }) => (
						<div
							key={key}
							className='flex h-8 w-8 items-center justify-center rounded-lg'
							style={active ? { background: 'var(--lagoon-accent-tint)' } : {}}
						>
							<svg viewBox='0 0 16 16' fill='none' className='h-4 w-4'>
								{path}
							</svg>
						</div>
					))}
				</div>

				{/* Main content */}
				<div className='min-w-0 flex-1 overflow-hidden p-3'>
					{/* Page header */}
					<p
						className='mb-3 text-[10px] font-medium'
						style={{ color: 'var(--lagoon-muted)' }}
					>
						Dashboard · June 2026
					</p>

					{/* Two-column layout */}
					<div className='flex gap-3'>
						{/* ── LEFT: account card + transactions ── */}
						<div className='flex min-w-0 flex-1 flex-col gap-3'>
							{/* Account card widget — gradient bg is a card metaphor, stays hardcoded */}
							<div
								className='overflow-hidden rounded-xl p-3'
								style={{
									background:
										'linear-gradient(135deg, #334155 0%, #1e293b 60%, #7c2d12 100%)',
								}}
							>
								{/* Card top row: icon + type */}
								<div className='mb-2 flex items-center justify-between'>
									<span className='flex h-6 w-6 items-center justify-center rounded-full bg-white/15'>
										{/* Bank icon */}
										<svg viewBox='0 0 14 14' fill='none' className='h-3.5 w-3.5'>
											<path
												d='M1 5.5L7 2l6 3.5M1 5.5v1h12v-1M2 6.5v4M5 6.5v4M9 6.5v4M12 6.5v4M1 10.5h12'
												stroke='rgba(255,255,255,0.75)'
												strokeWidth='1.1'
												strokeLinecap='round'
											/>
										</svg>
									</span>
									<span className='text-[9px] font-semibold italic text-white/70'>bank</span>
								</div>

								{/* Masked card number */}
								<p className='mb-1 font-mono text-[11px] font-bold tracking-[0.12em] text-white'>
									{ACCOUNT.masked}
								</p>

								{/* Account name */}
								<p className='text-[9px] font-medium text-white/50'>{ACCOUNT.name}</p>

								{/* Divider */}
								<div className='my-2 h-px bg-white/10' />

								{/* Balance row */}
								<div className='mb-2 flex items-end justify-between'>
									<div>
										<p className='text-[8px] font-bold uppercase tracking-[0.12em] text-white/40'>
											Balance
										</p>
										<p className='text-[15px] font-bold tabular-nums text-white'>
											{ACCOUNT.balance}
										</p>
									</div>
									{/* EMV chip */}
									<div
										className='rounded-sm border border-white/25 p-[2px]'
										style={{ width: 26, height: 20 }}
									>
										<div className='grid h-full w-full grid-cols-3 grid-rows-3 gap-[1px]'>
											{Array.from({ length: 9 }).map((_, i) => (
												<div
													key={i}
													className='rounded-[1px]'
													style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.3)' }}
												/>
											))}
										</div>
									</div>
								</div>

								{/* Quick actions */}
								<div className='flex items-center gap-2'>
									{QUICK_ACTIONS.map(({ label, path }) => (
										<div key={label} className='flex flex-col items-center gap-0.5'>
											<span className='flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white/70'>
												<svg viewBox='0 0 16 16' fill='none' className='h-3.5 w-3.5'>
													{path}
												</svg>
											</span>
											<span className='text-[8px] text-white/50'>{label}</span>
										</div>
									))}
								</div>

								{/* Total balance footer */}
								<div className='mt-2 flex items-center justify-between border-t border-white/10 pt-2'>
									<span className='text-[8px] font-medium uppercase tracking-wider text-white/40'>
										Total Balance
									</span>
									<span className='text-[11px] font-semibold tabular-nums text-white/80'>
										{TOTAL_BALANCE}
									</span>
								</div>
							</div>

							{/* Recent Transactions */}
							<div
								className='overflow-hidden rounded-xl border'
								style={{
									borderColor: 'var(--lagoon-border)',
									background: 'var(--lagoon-surface)',
								}}
							>
								<div
									className='flex items-center justify-between border-b px-3 py-2'
									style={{ borderColor: 'var(--lagoon-border)' }}
								>
									<p
										className='text-[11px] font-semibold'
										style={{ color: 'var(--lagoon-ink)' }}
									>
										Transactions
									</p>
									<span className='text-[9px]' style={{ color: 'var(--lagoon-accent)' }}>
										Show more
									</span>
								</div>

								<div className='px-3 py-2'>
									{TRANSACTION_GROUPS.map((group) => (
										<div key={group.date} className='mb-2 last:mb-0'>
											<p
												className='mb-1.5 text-[9px] font-medium uppercase tracking-wider'
												style={{ color: 'var(--lagoon-muted)' }}
											>
												{group.date}
											</p>
											<div className='space-y-1.5'>
												{group.txns.map((tx) => (
													<div key={tx.desc} className='flex items-center gap-2'>
														{/* Icon */}
														<span
															className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full'
															style={{
																background: tx.pos
																	? 'rgba(16,185,129,0.12)'
																	: 'rgba(239,68,68,0.10)',
															}}
														>
															<svg viewBox='0 0 12 12' fill='none' className='h-3 w-3'>
																{tx.pos ? (
																	// Arrow down-left (income)
																	<path
																		d='M9 3L3 9M3 9H7M3 9V5'
																		stroke='#10b981'
																		strokeWidth='1.3'
																		strokeLinecap='round'
																		strokeLinejoin='round'
																	/>
																) : (
																	// Arrow up-right (expense)
																	<path
																		d='M3 9L9 3M9 3H5M9 3V7'
																		stroke='#ef4444'
																		strokeWidth='1.3'
																		strokeLinecap='round'
																		strokeLinejoin='round'
																	/>
																)}
															</svg>
														</span>
														{/* Description */}
														<div className='min-w-0 flex-1'>
															<p
																className='truncate text-[10px] font-medium'
																style={{ color: 'var(--lagoon-ink)' }}
															>
																{tx.desc}
															</p>
															<p
																className='truncate text-[8px]'
																style={{ color: 'var(--lagoon-muted)' }}
															>
																{tx.sub}
															</p>
														</div>
														{/* Amount — income green, expense red (semantic, hardcoded) */}
														<span
															className='shrink-0 text-[10px] font-semibold tabular-nums'
															style={{ color: tx.pos ? '#10b981' : '#ef4444' }}
														>
															{tx.amt}
														</span>
													</div>
												))}
											</div>
										</div>
									))}
								</div>
							</div>
						</div>

						{/* ── RIGHT: Overview + Income vs Expenses ── */}
						<div className='flex shrink-0 flex-col gap-3' style={{ width: 168 }}>
							{/* Overview — Health tab */}
							<div
								className='overflow-hidden rounded-xl border'
								style={{
									borderColor: 'var(--lagoon-border)',
									background: 'var(--lagoon-surface)',
								}}
							>
								{/* Header + tab pills */}
								<div className='px-3 pt-2.5 pb-2'>
									<div className='mb-2 flex items-center justify-between'>
										<p
											className='text-[11px] font-semibold'
											style={{ color: 'var(--lagoon-ink)' }}
										>
											Overview
										</p>
										<span
											className='text-[9px]'
											style={{ color: 'var(--lagoon-accent)' }}
										>
											Show more →
										</span>
									</div>

									{/* Pill tabs — Health active, others inactive */}
									<div
										className='flex gap-0.5 rounded-full p-0.5'
										style={{ background: 'var(--lagoon-surface-2)' }}
									>
										{['Health', 'Invoices', 'Goals'].map((tab) => (
											<div
												key={tab}
												className='flex-1 rounded-full py-0.5 text-center text-[8px] font-medium'
												style={
													tab === 'Health'
														? {
																background: 'var(--lagoon-canvas)',
																color: 'var(--lagoon-ink)',
															}
														: { color: 'var(--lagoon-muted)' }
												}
											>
												{tab}
											</div>
										))}
									</div>
								</div>

								{/* Health KPI 2x2 grid — matches DashboardTabs HealthTab */}
								<div className='grid grid-cols-2 gap-1.5 px-3 pb-3'>
									{KPIS.map((kpi) => (
										<div
											key={kpi.label}
											className='flex flex-col gap-0.5 rounded-lg p-2'
											style={{ background: 'var(--lagoon-surface-2)' }}
										>
											<p
												className='text-[8px] font-medium uppercase tracking-wide'
												style={{ color: 'var(--lagoon-muted)' }}
											>
												{kpi.label}
											</p>
											<p
												className='text-[11px] font-semibold'
												style={{ color: kpiColor(kpi.variant) }}
											>
												{kpi.value}
											</p>
										</div>
									))}
								</div>
							</div>

							{/* Income vs Expenses mini chart */}
							<div
								className='overflow-hidden rounded-xl border'
								style={{
									borderColor: 'var(--lagoon-border)',
									background: 'var(--lagoon-surface)',
								}}
							>
								<div className='px-3 pt-2.5 pb-2'>
									<div className='mb-2 flex items-center justify-between'>
										<p
											className='text-[10px] font-semibold'
											style={{ color: 'var(--lagoon-ink)' }}
										>
											Income vs Expenses
										</p>
										<span className='text-[8px]' style={{ color: 'var(--lagoon-muted)' }}>
											6 mo
										</span>
									</div>

									{/* Bar chart — animated scaleY on scroll */}
									<div className='flex items-end justify-between gap-1' style={{ height: 72 }}>
										{CHART_BARS.map((bar, i) => (
											<div
												key={bar.month}
												className='flex flex-1 flex-col items-center justify-end gap-0.5'
											>
												<div className='flex w-full items-end justify-center gap-0.5'>
													{/* Income bar (green) */}
													<m.div
														className='rounded-t-sm'
														style={{
															width: '44%',
															height: bar.income,
															/* #10b981 = emerald-500 — income semantic colour, hardcoded */
															background: '#10b981',
															transformOrigin: 'bottom',
														}}
														initial={shouldAnimate ? { scaleY: 0 } : { scaleY: 1 }}
														whileInView={{ scaleY: 1 }}
														viewport={{ once: true, margin: '-20px' }}
														transition={{
															duration: 0.65,
															delay: i * 0.07 + 0.1,
															ease: [0.25, 1, 0.35, 1],
														}}
													/>
													{/* Expense bar (red) */}
													<m.div
														className='rounded-t-sm'
														style={{
															width: '44%',
															height: bar.expense,
															/* #ef4444 = red-500 — expense semantic colour, hardcoded */
															background: '#ef4444',
															transformOrigin: 'bottom',
														}}
														initial={shouldAnimate ? { scaleY: 0 } : { scaleY: 1 }}
														whileInView={{ scaleY: 1 }}
														viewport={{ once: true, margin: '-20px' }}
														transition={{
															duration: 0.65,
															delay: i * 0.07 + 0.18,
															ease: [0.25, 1, 0.35, 1],
														}}
													/>
												</div>
												{/* Month label */}
												<p
													className='text-[8px]'
													style={{ color: 'var(--lagoon-muted)' }}
												>
													{bar.month}
												</p>
											</div>
										))}
									</div>

									{/* Summary stats — matches IncomeExpenseTrend.tsx */}
									<div
										className='mt-2 border-t pt-2'
										style={{ borderColor: 'var(--lagoon-border)' }}
									>
										<div className='flex items-center justify-between'>
											<div>
												<p
													className='text-[7px]'
													style={{ color: 'var(--lagoon-muted)' }}
												>
													Total Income
												</p>
												{/* Hardcoded green — income semantic colour */}
												<p className='text-[9px] font-semibold tabular-nums' style={{ color: '#10b981' }}>
													{CHART_SUMMARY.income}
												</p>
											</div>
											<div>
												<p
													className='text-[7px]'
													style={{ color: 'var(--lagoon-muted)' }}
												>
													Expenses
												</p>
												{/* Hardcoded red — expense semantic colour */}
												<p className='text-[9px] font-semibold tabular-nums' style={{ color: '#ef4444' }}>
													{CHART_SUMMARY.expense}
												</p>
											</div>
											<div>
												<p
													className='text-[7px]'
													style={{ color: 'var(--lagoon-muted)' }}
												>
													Net
												</p>
												<p
													className='text-[9px] font-semibold tabular-nums'
													style={{ color: '#10b981' }}
												>
													{CHART_SUMMARY.net}
												</p>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
