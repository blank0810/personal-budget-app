import { LagoonReveal } from '../LagoonReveal';

const REASONS = [
	{
		title: 'Your score writes itself',
		desc: 'Every entry you log instantly recomputes your financial health score, savings rate, and net worth — no spreadsheets, no manual math. The work you put in comes straight back as insight.',
	},
	{
		title: 'You catch every peso',
		desc: 'Logging triggers a mental check-in. That tiny friction is how awareness habits form — and why budgets actually stick.',
	},
	{
		title: 'No bank access, ever',
		desc: 'We never see your credentials, never touch your accounts. Your data lives here, not in a third-party aggregation pipeline.',
	},
	{
		title: 'Works with any bank',
		desc: 'Rural banks, digital wallets, cash-only categories — if you can write it down, you can track it here. No integration required.',
	},
] as const;

/**
 * HowItWorksWhyManual — "Why manual logging?" reassurance section.
 *
 * Three cards addressing the common objection to manual data entry.
 * Canvas (#F8FAFC) background to alternate with the white Steps section above.
 * Server component.
 */
export function HowItWorksWhyManual() {
	return (
		<section
			className='py-20 md:py-28'
			style={{ background: 'var(--lagoon-canvas)' }}
			aria-labelledby='why-manual-heading'
		>
			<div className='mx-auto max-w-[1184px] px-6 md:px-10'>
				<LagoonReveal>
					<p className='mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--lagoon-accent)]'>
						Why manual
					</p>
					<h2
						id='why-manual-heading'
						className='lagoon-section-title max-w-[22ch] text-[var(--lagoon-ink)]'
						style={{ fontFamily: 'var(--lagoon-font-heading, inherit)' }}
					>
						You log it. You own it.
					</h2>
					<p className='mt-5 max-w-[52ch] text-[17px] leading-[1.7] text-[var(--lagoon-body)]'>
						No bank linking means no sync failures, no permission revokes, no
						aggregator data breaches. You stay aware of every peso because
						you&apos;re the one writing it down.
					</p>
				</LagoonReveal>

				{/* Three-column reason cards */}
				<div className='mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2'>
					{REASONS.map((r, i) => (
						<LagoonReveal key={r.title} delay={i * 0.08}>
							<div className='h-full rounded-2xl border border-[var(--lagoon-border)] bg-[var(--lagoon-surface)] p-7'>
								{/* Teal dot accent */}
								<span
									className='mb-5 block h-2.5 w-2.5 rounded-full'
									style={{ background: 'var(--lagoon-accent)' }}
									aria-hidden='true'
								/>
								<h3
									className='mb-2.5 text-[18px] font-bold tracking-[-0.02em] text-[var(--lagoon-ink)]'
									style={{ fontFamily: 'var(--lagoon-font-heading, inherit)' }}
								>
									{r.title}
								</h3>
								<p className='text-[15px] leading-[1.65] text-[var(--lagoon-body)]'>{r.desc}</p>
							</div>
						</LagoonReveal>
					))}
				</div>
			</div>
		</section>
	);
}
