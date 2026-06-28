import { NumberTicker } from '@/components/modules/landing/ui/NumberTicker';
import { LagoonReveal } from './LagoonReveal';

/**
 * LagoonStats — three KPI figures that count up on scroll.
 *
 * Every stat is factual about the product:
 *  - 7    — distinct feature areas in the real app
 *           (transactions, budgets, goals, accounts, reports, recurring, CSV import)
 *  - 3    — steps to get your first budget working
 *           (set up accounts → log transactions → read reports)
 *  - ₱0   — cost to start (free tier)
 */
export function LagoonStats() {
	const stats = [
		{
			prefix: '',
			value: 7,
			suffix: '+',
			label: 'Built-in features',
			sub: 'Budgets, goals, reports & more',
		},
		{
			prefix: '',
			value: 3,
			suffix: '',
			label: 'Steps to start',
			sub: 'Accounts → transactions → reports',
		},
		{
			prefix: '₱',
			value: 0,
			suffix: '/month',
			label: 'Free forever',
			sub: 'No credit card required',
		},
	];

	return (
		<section
			aria-label='Product highlights'
			className='border-y py-14'
			style={{
				borderColor: 'var(--lagoon-border)',
				background: 'var(--lagoon-surface)',
			}}
		>
			<div className='mx-auto max-w-[1184px] px-6 md:px-10'>
				<LagoonReveal>
					<div className='flex flex-col items-stretch divide-y divide-[var(--lagoon-border)] sm:flex-row sm:divide-x sm:divide-y-0'>
						{stats.map((s, i) => (
							<div
								key={s.label}
								className='flex flex-1 flex-col items-center gap-1 py-8 text-center first:pt-0 last:pb-0 sm:px-8 sm:py-0 sm:first:pl-0 sm:last:pr-0 sm:first:pt-0 sm:last:pb-0'
								style={{ animationDelay: `${i * 80}ms` }}
							>
								<p
									className='text-[48px] font-bold leading-none tracking-[-0.04em]'
									style={{
										color: 'var(--lagoon-ink)',
										fontFamily: 'var(--lagoon-font-heading, inherit)',
									}}
								>
									{s.prefix}
									<NumberTicker
										value={s.value}
										durationMs={900}
										className='tabular-nums'
									/>
									<span style={{ color: 'var(--lagoon-accent)' }}>{s.suffix}</span>
								</p>
								<p className='text-[15px] font-semibold' style={{ color: 'var(--lagoon-ink)' }}>
									{s.label}
								</p>
								<p className='text-[13px]' style={{ color: 'var(--lagoon-muted)' }}>
									{s.sub}
								</p>
							</div>
						))}
					</div>
				</LagoonReveal>
			</div>
		</section>
	);
}
