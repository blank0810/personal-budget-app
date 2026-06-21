import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// INCOME TIMELINE — signature visual device.
//
// On desktop (compact=false), bars sit directly on the hero gradient with no
// container border/bg. The spike bar is set to h:100 (vs quiet weeks h:5),
// making it ~20x taller. The envelope detail below is a legible named-bar strip.
// ─────────────────────────────────────────────────────────────────────────────

const TIMELINE_WEEKS: {
	label: string;
	h: number;
	note: string | null;
	spike?: true;
	secondary?: true;
}[] = [
	{ label: 'Wk 1', h: 5,   note: null      },
	{ label: 'Wk 2', h: 5,   note: null      },
	{ label: 'Wk 3', h: 100, note: '₱64,200', spike: true },
	{ label: 'Wk 4', h: 36,  note: '₱18,500', secondary: true },
];

// Named envelope bars shown below the timeline on full size.
// Self-decoding: category + percent number without needing a caption.
const TIMELINE_ENV_BARS = [
	{ cat: 'Groceries', pct: 64 },
	{ cat: 'Transport', pct: 42 },
	{ cat: 'Software',  pct: 84, warn: true },
	{ cat: 'Utilities', pct: 35 },
];

export function IncomeTimeline({ compact = false }: { compact?: boolean }) {
	// Compact = inside the demo State C tile; frameless bars, no envelopes.
	// Full = hero right column; frameless, with named bar strip below.

	const colW   = compact ? 52  : 80;
	const padX   = compact ? 6   : 0;   // no horizontal pad on desktop: bars bleed to edges
	const barW   = compact ? 14  : 30;
	const svgH   = compact ? 64  : 130;
	const maxBarH = svgH - 20;
	const totalW  = TIMELINE_WEEKS.length * colW + padX * 2;

	return (
		<figure
			role='img'
			aria-label='Monthly income logged — 4-week view'
			className='select-none w-full'
		>
			{!compact && (
				<div className='mb-1 flex items-baseline justify-between'>
					<p className='text-[10px] font-semibold uppercase tracking-[0.1em] text-l-text-4'>
						Income · June
					</p>
					<p
						className='font-mono text-[12px] font-bold'
						style={{ color: 'var(--l-accent-amber)' }}
					>
						₱82,700 logged
					</p>
				</div>
			)}

			{/* SVG — no container on desktop, bars sit raw on the gradient */}
			<div className={cn(compact ? 'rounded-md border border-l-border bg-l-surface-1 overflow-hidden' : '')}>
				<svg
					width='100%'
					viewBox={`0 0 ${totalW} ${svgH}`}
					preserveAspectRatio='xMidYMax meet'
					className='block'
				>
					{/* Baseline */}
					<line
						x1={padX} y1={svgH - 16}
						x2={totalW - padX} y2={svgH - 16}
						stroke='var(--l-border-mid)' strokeWidth={1}
					/>

					{TIMELINE_WEEKS.map((wk, i) => {
						const cx   = padX + i * colW + colW / 2;
						const barH = Math.max(3, (wk.h / 100) * maxBarH);
						const barY = svgH - 16 - barH;
						const fill = wk.spike
							? 'var(--l-accent-amber)'
							: wk.secondary
							? 'oklch(0.82 0.14 75 / 50%)'
							: 'var(--l-surface-3)';

						return (
							<g key={wk.label}>
								<rect
									x={cx - barW / 2} y={barY}
									width={barW} height={barH}
									rx={2} fill={fill}
									style={{
										transformOrigin: `${cx}px ${svgH - 16}px`,
										animation: `l-bar-rise 0.65s ${i * 0.09}s cubic-bezier(0.16,1,0.3,1) both`,
									}}
								/>
								{/* Spike labels — larger & bold so readable without squinting */}
								{wk.note && (
									<text
										x={cx} y={barY - 6}
										textAnchor='middle'
										fontSize={compact ? 8 : 13}
										fill='var(--l-accent-amber)'
										fontFamily='ui-monospace, monospace'
										fontWeight='700'
									>
										{wk.note}
									</text>
								)}
								<text
									x={cx} y={svgH - 3}
									textAnchor='middle'
									fontSize={compact ? 7 : 9}
									fill='var(--l-text-4)'
								>
									{wk.label}
								</text>
							</g>
						);
					})}
				</svg>
			</div>

			{/* Named envelope bars — full size only, self-decoding */}
			{!compact && (
				<div className='mt-4 space-y-2'>
					{TIMELINE_ENV_BARS.map((e) => (
						<div key={e.cat} className='flex items-center gap-3'>
							<span className='w-[72px] shrink-0 text-[11px] text-l-text-3'>{e.cat}</span>
							<div className='flex-1 overflow-hidden rounded-sm bg-l-surface-3' style={{ height: 5 }}>
								<div
									style={{
										width: `${e.pct}%`, height: '100%',
										backgroundColor: e.warn ? 'var(--l-accent-amber)' : 'var(--l-accent)',
										transformOrigin: 'left',
										animation: `l-bar-rise 0.7s 0.3s cubic-bezier(0.16,1,0.3,1) both`,
									}}
								/>
							</div>
							<span
								className='w-[30px] shrink-0 text-right font-mono text-[11px]'
								style={{ color: e.warn ? 'var(--l-accent-amber)' : 'var(--l-text-4)' }}
							>
								{e.pct}%
							</span>
						</div>
					))}
					<p className='pt-1 text-[10px] text-l-text-4'>
						Bars = income you logged · envelope health after logging
					</p>
				</div>
			)}
		</figure>
	);
}
