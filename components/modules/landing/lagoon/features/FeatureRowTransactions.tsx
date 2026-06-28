import { LagoonReveal } from '@/components/modules/landing/lagoon/LagoonReveal';

const KPI = [
	{ label: 'Total Income', value: '+₱42,500', colorClass: 'text-green-600' },
	{ label: 'Total Expenses', value: '-₱8,540', colorClass: 'text-red-600' },
	{ label: 'Net Flow', value: '₱33,960', colorClass: 'text-blue-600' },
	{ label: 'Avg Amount', value: '₱8,508', colorClass: 'text-[var(--lagoon-ink)]' },
] as const;

const TABS = ['All', 'Income', 'Expense', 'Transfer', 'Payment'] as const;

// Mirrors UnifiedTransaction rows from the real TransactionTable
const TRANSACTIONS = [
	{
		kind: 'income',
		name: 'Monthly Salary',
		subtitle: 'Salary',
		badge: 'Income',
		amt: '+₱17,500',
		date: 'Jun 10',
	},
	{
		kind: 'income',
		name: 'Freelance Project',
		subtitle: 'Freelance',
		badge: 'Income',
		amt: '+₱25,000',
		date: 'Jun 15',
	},
	{
		// Auto-created tithe transfer (app feature: income logs spawn a Tithe transfer)
		kind: 'transfer',
		name: 'Tithe for Freelance',
		subtitle: 'BDO Savings → Tithes',
		badge: 'Transfer',
		amt: '-₱2,500',
		date: 'Jun 15',
	},
	{
		kind: 'expense',
		name: 'SM Supermarket',
		subtitle: 'Groceries',
		badge: 'Expense',
		amt: '-₱2,180',
		date: 'Jun 14',
	},
	{
		kind: 'expense',
		name: 'Meralco Bill',
		subtitle: 'Utilities',
		badge: 'Expense',
		amt: '-₱1,840',
		date: 'Jun 13',
	},
] as const;

// Dark-safe: /10 opacity bg + medium text value legible on both light & dark surfaces
const KIND_STYLE = {
	income: {
		iconBg: 'bg-green-500/10',
		iconColor: 'text-green-600',
		badge: 'bg-green-500/10 text-green-600',
		amt: 'text-green-600',
	},
	expense: {
		iconBg: 'bg-red-500/10',
		iconColor: 'text-red-600',
		badge: 'bg-red-500/10 text-red-600',
		amt: 'text-red-600',
	},
	transfer: {
		iconBg: 'bg-blue-500/10',
		iconColor: 'text-blue-600',
		badge: 'bg-blue-500/10 text-blue-600',
		amt: 'text-blue-600',
	},
} as const;

type TxKind = keyof typeof KIND_STYLE;

// Inline SVG icons matching the real TransactionTable icon set (ArrowDownLeft / ArrowUpRight / ArrowLeftRight)
function TxIcon({ kind }: { kind: TxKind }) {
	if (kind === 'income') {
		return (
			<svg viewBox='0 0 12 12' fill='none' className='h-3.5 w-3.5' aria-hidden='true'>
				<path
					d='M10 2L2 10M2 5v5h5'
					stroke='currentColor'
					strokeWidth='1.5'
					strokeLinecap='round'
					strokeLinejoin='round'
				/>
			</svg>
		);
	}
	if (kind === 'expense') {
		return (
			<svg viewBox='0 0 12 12' fill='none' className='h-3.5 w-3.5' aria-hidden='true'>
				<path
					d='M2 10L10 2M10 7V2H5'
					stroke='currentColor'
					strokeWidth='1.5'
					strokeLinecap='round'
					strokeLinejoin='round'
				/>
			</svg>
		);
	}
	// transfer
	return (
		<svg viewBox='0 0 12 12' fill='none' className='h-3.5 w-3.5' aria-hidden='true'>
			<path
				d='M1 4h10M8 1l3 3-3 3M11 8H1m3 3L1 8l3-3'
				stroke='currentColor'
				strokeWidth='1.2'
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
		</svg>
	);
}

const BENEFITS = [
	'One place for income, expenses, transfers, and credit card payments',
	'Filter by type, search by name, or pick a custom date range',
	'Import from any bank CSV — no API key or bank linking required',
];

/**
 * FeatureRowTransactions — transaction log mock matching the real /transactions page:
 * KPI row (Total Income / Total Expenses / Net Flow / Avg Amount), type filter tabs
 * (All / Income / Expense / Transfer / Payment), and a 5-row table with icon circles,
 * description + subtitle, type badge, and amount — including a tithe transfer row.
 * Server component — static mock, no client JS needed.
 * Layout: mock left, text right (lagoon-canvas background).
 */
export function FeatureRowTransactions() {
	return (
		<section aria-label='Transaction tracking' className='bg-[var(--lagoon-canvas)] py-20 md:py-28'>
			<div className='mx-auto max-w-[1184px] px-6 md:px-10'>
				<div className='grid items-center gap-12 lg:grid-cols-2 lg:gap-20'>
					{/* Text side — first in DOM (mobile), right column on desktop */}
					<LagoonReveal className='lg:order-2'>
						<p className='mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--lagoon-accent)]'>
							Feature 02
						</p>
						<h2
							className='lagoon-section-title mb-5 text-[var(--lagoon-ink)]'
							style={{ fontFamily: 'var(--lagoon-font-heading, inherit)' }}
						>
							Every transaction, in one place.
						</h2>
						<p className='mb-8 text-[17px] leading-[1.7] text-[var(--lagoon-body)]'>
							Log income, expenses, transfers, and payments between accounts. Filter
							by type or date range, search by name, or import a CSV from your bank
							and columns map automatically.
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
											budgetplanner.app/transactions
										</span>
									</div>
								</div>
							</div>

							{/* Page content */}
							<div className='p-4'>
								{/* Page title + add button */}
								<div className='mb-3 flex items-center justify-between'>
									<p
										className='text-[13px] font-semibold text-[var(--lagoon-ink)]'
										style={{ fontFamily: 'var(--lagoon-font-heading, inherit)' }}
									>
										Transactions
									</p>
									<span className='rounded-full border border-[var(--lagoon-accent-border)] bg-[var(--lagoon-accent-bg)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--lagoon-accent)]'>
										+ Add Transaction
									</span>
								</div>

								{/* KPI cards — mirrors TransactionKPICards (Total Income / Expenses / Net Flow / Avg Amount) */}
								<div className='mb-3 grid grid-cols-4 gap-1.5'>
									{KPI.map((k) => (
										<div
											key={k.label}
											className='rounded-lg border border-[var(--lagoon-border)] p-2'
											style={{ background: 'var(--lagoon-surface)' }}
										>
											<p className='mb-0.5 text-[9px] leading-tight text-[var(--lagoon-muted)]'>{k.label}</p>
											<p className={`text-[11px] font-bold tabular-nums ${k.colorClass}`}>{k.value}</p>
										</div>
									))}
								</div>

								{/* Type filter tabs — mirrors TransactionFilters (All / Income / Expense / Transfer / Payment) */}
								<div className='mb-3 flex flex-wrap gap-1'>
									{TABS.map((tab, i) => (
										<span
											key={tab}
											className={
												i === 0
													? 'rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-[var(--lagoon-on-accent)]'
													: 'rounded-full border border-[var(--lagoon-border)] px-2.5 py-0.5 text-[10px] text-[var(--lagoon-body)]'
											}
											style={i === 0 ? { background: 'var(--lagoon-ink)' } : undefined}
										>
											{tab}
										</span>
									))}
								</div>

								{/* Table header — Description / Type / Amount (mirrors TransactionTable thead) */}
								<div className='mb-1 grid grid-cols-[1fr_auto_auto] border-b border-[var(--lagoon-border)] pb-1'>
									<span className='text-[10px] font-medium text-[var(--lagoon-muted)]'>Description</span>
									<span className='pr-3 text-[10px] font-medium text-[var(--lagoon-muted)]'>Type</span>
									<span className='text-right text-[10px] font-medium text-[var(--lagoon-muted)]'>Amount</span>
								</div>

								{/* Transaction rows */}
								<div className='divide-y divide-[var(--lagoon-border)]'>
									{TRANSACTIONS.map((tx) => {
										const s = KIND_STYLE[tx.kind as TxKind];
										return (
											<div
												key={`${tx.name}-${tx.date}`}
												className='grid grid-cols-[1fr_auto_auto] items-center gap-2 py-2'
											>
												{/* Description: icon circle + name + subtitle */}
												<div className='flex min-w-0 items-center gap-2'>
													<span
														className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${s.iconBg} ${s.iconColor}`}
													>
														<TxIcon kind={tx.kind as TxKind} />
													</span>
													<div className='min-w-0'>
														<p className='truncate text-[11px] font-medium text-[var(--lagoon-ink)]'>
															{tx.name}
														</p>
														<p className='truncate text-[10px] text-[var(--lagoon-muted)]'>
															{tx.subtitle}
														</p>
													</div>
												</div>
												{/* Type badge */}
												<span
													className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold ${s.badge}`}
												>
													{tx.badge}
												</span>
												{/* Amount */}
												<span
													className={`shrink-0 text-right text-[11px] font-semibold tabular-nums ${s.amt}`}
												>
													{tx.amt}
												</span>
											</div>
										);
									})}
								</div>

								{/* Pagination strip */}
								<div className='mt-2 flex items-center justify-between border-t border-[var(--lagoon-border)] pt-2'>
									<p className='text-[10px] text-[var(--lagoon-muted)]'>Showing 1–5 of 28 transactions</p>
									<div className='flex items-center gap-1'>
										<span className='flex h-5 w-5 items-center justify-center rounded border border-[var(--lagoon-border)] text-[10px] text-[var(--lagoon-muted)]'>
											‹
										</span>
										<span className='flex h-5 w-5 items-center justify-center rounded border border-[var(--lagoon-accent)] text-[10px] font-semibold text-[var(--lagoon-accent)]'>
											1
										</span>
										<span className='flex h-5 w-5 items-center justify-center rounded border border-[var(--lagoon-border)] text-[10px] text-[var(--lagoon-muted)]'>
											2
										</span>
										<span className='flex h-5 w-5 items-center justify-center rounded border border-[var(--lagoon-border)] text-[10px] text-[var(--lagoon-muted)]'>
											›
										</span>
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
