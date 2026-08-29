import { LagoonReveal } from '@/components/modules/landing/lagoon/LagoonReveal';

/**
 * Real wizard steps from components/modules/import/ImportWizard.tsx:
 * STEPS = ['Upload', 'Map Columns', 'Review & Import']
 * Active step = Review & Import (step 3), progress bar at 100%.
 */
const IMPORT_STEPS = [
	{
		step: 1,
		label: 'Upload',
		status: 'done' as const,
		note: 'statement_june.csv — 50 rows detected',
	},
	{
		step: 2,
		label: 'Map Columns',
		status: 'done' as const,
		note: 'Date, Description, Amount — auto-mapped',
	},
	{
		step: 3,
		label: 'Review & Import',
		status: 'active' as const,
		note: '47 ready · 3 duplicates skipped',
	},
];

/** Sample rows shown in the Review step table */
const PREVIEW_ROWS = [
	{ date: 'Jun 28', desc: 'SM Grocery', amt: '−₱1,240', type: 'EXPENSE' as const },
	{ date: 'Jun 27', desc: 'Freelance — Acme Co', amt: '+₱15,000', type: 'INCOME' as const },
	{ date: 'Jun 26', desc: 'Grab Ride', amt: '−₱185', type: 'EXPENSE' as const },
];

const BENEFITS = [
	'Export a CSV from your online bank portal, drag it in — done in under a minute',
	'Auto-detects duplicate transactions and flags them before you confirm',
	'Batch undo available for 30 days if you need to roll back an import',
];

/**
 * FeatureRowImport — CSV import wizard mock.
 * Server component — static.
 * Mirrors the real 3-step wizard (Upload → Map Columns → Review & Import)
 * from components/modules/import/ImportWizard.tsx, with duplicate detection
 * callout (from ReviewStep.tsx) and batch undo.
 * Layout: text left, mock right (white/surface background).
 */
export function FeatureRowImport() {
	return (
		<section aria-label='CSV import' className='bg-[var(--lagoon-surface)] py-20 md:py-28'>
			<div className='mx-auto max-w-[1184px] px-6 md:px-10'>
				<div className='grid items-center gap-12 lg:grid-cols-2 lg:gap-20'>
					{/* Text side */}
					<LagoonReveal>
						<p className='mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--lagoon-accent)]'>
							Feature 04
						</p>
						<h2
							className='lagoon-section-title mb-5 text-[var(--lagoon-ink)]'
							style={{ fontFamily: 'var(--lagoon-font-heading, inherit)' }}
						>
							Import from any bank, in seconds.
						</h2>
						<p className='mb-8 text-[17px] leading-[1.7] text-[var(--lagoon-body)]'>
							No API integration. Export a CSV from your bank&apos;s website, upload
							it, and the wizard maps your columns and catches duplicates before
							anything is committed.
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

					{/* Mock side */}
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
										<span className='truncate text-[11px] text-[var(--lagoon-muted)]'>budget.umbra.build/import</span>
									</div>
								</div>
							</div>

							{/* Import wizard */}
							<div className='p-5 space-y-3'>
								{/* Page heading + progress */}
								<div className='space-y-1.5'>
									<div className='flex justify-between'>
										<p
											className='text-[13px] font-semibold text-[var(--lagoon-ink)]'
											style={{ fontFamily: 'var(--lagoon-font-heading, inherit)' }}
										>
											Import CSV
										</p>
										<span className='text-[10px] text-[var(--lagoon-muted)]'>
											Step 3 of 3
										</span>
									</div>
									{/* Progress bar — 100% complete */}
									<div className='h-1.5 w-full overflow-hidden rounded-full bg-[var(--lagoon-surface-2)]'>
										<div
											className='h-full rounded-full bg-[var(--lagoon-accent)]'
											style={{ width: '100%' }}
										/>
									</div>
								</div>

								{/* Wizard steps */}
								<div className='space-y-2'>
									{IMPORT_STEPS.map((s) => (
										<div
											key={s.step}
											className='flex items-center gap-3 rounded-xl border p-2.5'
											style={{
												borderColor: s.status === 'active' ? 'var(--lagoon-accent)' : 'var(--lagoon-border)',
												background:
													s.status === 'active'
														? 'var(--lagoon-accent-bg)'
														: 'var(--lagoon-canvas)',
											}}
										>
											{/* Step dot */}
											<div
												className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold'
												style={
													s.status === 'done' || s.status === 'active'
														? { background: 'var(--lagoon-accent)', color: 'white' }
														: { background: 'var(--lagoon-surface-2)', color: 'var(--lagoon-muted)' }
												}
											>
												{s.status === 'done' ? (
													<svg viewBox='0 0 12 12' fill='none' className='h-3.5 w-3.5' aria-hidden='true'>
														<path
															d='M2 6l3 3 5-5'
															stroke='white'
															strokeWidth='1.5'
															strokeLinecap='round'
															strokeLinejoin='round'
														/>
													</svg>
												) : (
													s.step
												)}
											</div>
											<div className='min-w-0 flex-1'>
												<p
													className='text-[12px] font-semibold'
													style={{ color: s.status === 'active' ? 'var(--lagoon-ink)' : 'var(--lagoon-muted)' }}
												>
													{s.label}
												</p>
												<p className='text-[10px] text-[var(--lagoon-muted)]'>{s.note}</p>
											</div>
										</div>
									))}
								</div>

								{/* Review step — transaction preview table */}
								<div className='rounded-xl border border-[var(--lagoon-border)] bg-[var(--lagoon-canvas)] overflow-hidden'>
									<div className='grid grid-cols-3 border-b border-[var(--lagoon-border)] px-2.5 py-1.5'>
										<span className='text-[9px] font-medium text-[var(--lagoon-muted)]'>Date</span>
										<span className='text-[9px] font-medium text-[var(--lagoon-muted)]'>Description</span>
										<span className='text-right text-[9px] font-medium text-[var(--lagoon-muted)]'>Amount</span>
									</div>
									{PREVIEW_ROWS.map((row) => (
										<div
											key={row.desc}
											className='grid grid-cols-3 items-center border-b border-[var(--lagoon-border)] px-2.5 py-1.5 last:border-b-0'
										>
											<span className='text-[10px] text-[var(--lagoon-muted)]'>{row.date}</span>
											<span className='truncate text-[10px] text-[var(--lagoon-ink)]'>{row.desc}</span>
											<span
												className={`text-right text-[10px] font-semibold ${
													row.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'
												}`}
											>
												{row.amt}
											</span>
										</div>
									))}
								</div>

								{/* Duplicate warning — uses Tailwind amber safe on both light + dark */}
								<div className='flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3'>
									<svg viewBox='0 0 16 16' fill='none' className='mt-0.5 h-4 w-4 shrink-0' aria-hidden='true'>
										<path
											d='M8 2L1.5 13.5h13L8 2Z'
											stroke='#f59e0b'
											strokeWidth='1.2'
											fill='none'
											strokeLinejoin='round'
										/>
										<path
											d='M8 6v3M8 10.5v.5'
											stroke='#f59e0b'
											strokeWidth='1.2'
											strokeLinecap='round'
										/>
									</svg>
									<p className='text-[11px] leading-relaxed text-amber-600'>
										<span className='font-semibold'>3 duplicate transactions</span> detected and
										excluded. Review them before confirming.
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
