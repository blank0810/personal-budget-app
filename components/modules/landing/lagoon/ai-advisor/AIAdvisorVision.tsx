import { LagoonReveal } from '@/components/modules/landing/lagoon/LagoonReveal';

/**
 * AIAdvisorVision — planned capabilities section for /ai-advisor.
 *
 * HONESTY (hard gate): every sentence is future-tense. The advisor is NOT live.
 * No present-tense claims about what the AI "does" — only "will do" / "is planned".
 *
 * 3 planned capabilities grounded in how the existing app data model works:
 *   1. Reads your actual data (not population averages)
 *   2. Answers specific money questions
 *   3. Spots patterns across categories before they become problems
 *
 * Server component.
 */

const PLANNED = [
	{
		title: 'Will read your actual data',
		desc: 'Not population averages. Not generic tips. The advisor will read your transaction history, your category budgets, and your savings progress — then reason over those numbers specifically.',
		icon: (
			<svg viewBox='0 0 24 24' fill='none' className='h-6 w-6' aria-hidden='true'>
				<path
					d='M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2'
					stroke='currentColor'
					strokeWidth='1.5'
					strokeLinecap='round'
				/>
				<path d='M9 12h6M9 16h4' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
			</svg>
		),
	},
	{
		title: 'Will answer questions you actually ask',
		desc: '"Can I afford a ₱15,000 purchase this week?" "Which budget is about to tip over?" "Am I on track for my savings goal?" The advisor is planned to handle the questions you actually wonder about — not just show you a dashboard.',
		icon: (
			<svg viewBox='0 0 24 24' fill='none' className='h-6 w-6' aria-hidden='true'>
				<path
					d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z'
					stroke='currentColor'
					strokeWidth='1.5'
					strokeLinecap='round'
					strokeLinejoin='round'
				/>
			</svg>
		),
	},
	{
		title: 'Will spot patterns before they become problems',
		desc: 'We are planning category-level trend analysis: if your Food budget has been creeping up for three months, or your savings rate is slipping, the advisor will flag it — before the month is over.',
		icon: (
			<svg viewBox='0 0 24 24' fill='none' className='h-6 w-6' aria-hidden='true'>
				<path
					d='M3 12l4-4 4 4 4-6 4 2'
					stroke='currentColor'
					strokeWidth='1.5'
					strokeLinecap='round'
					strokeLinejoin='round'
				/>
				<rect x='3' y='3' width='18' height='18' rx='2' stroke='currentColor' strokeWidth='1.5' />
			</svg>
		),
	},
] as const;

export function AIAdvisorVision() {
	return (
		<section
			id='vision'
			aria-label='AI advisor planned capabilities'
			className='py-20 md:py-28'
			style={{ background: 'var(--lagoon-surface)' }}
		>
			<div className='mx-auto max-w-[1184px] px-6 md:px-10'>
				{/* Section header */}
				<LagoonReveal>
					<div className='mb-3 flex flex-wrap items-center gap-2'>
						<p
							className='text-[12px] font-semibold uppercase tracking-[0.12em]'
							style={{ color: 'var(--lagoon-accent)' }}
						>
							What&apos;s planned
						</p>
						{/* Status pill — reinforces future-tense on scroll */}
						<span
							className='rounded-full border px-2.5 py-0.5 text-[10px] font-semibold'
							style={{
								borderColor: 'var(--lagoon-accent-border)',
								background: 'var(--lagoon-accent-bg)',
								color: 'var(--lagoon-accent-strong)',
							}}
						>
							In development
						</span>
					</div>
					<h2
						className='lagoon-section-title max-w-[26ch]'
						style={{
							color: 'var(--lagoon-ink)',
							fontFamily: 'var(--lagoon-font-heading, inherit)',
						}}
					>
						Most money apps stop at charts. This won&apos;t.
					</h2>
					<p
						className='mt-4 max-w-[52ch] text-[17px] leading-[1.7]'
						style={{ color: 'var(--lagoon-body)' }}
					>
						The AI advisor is being built to go further than visualisation. It
						is designed to read your specific numbers and give you answers — not
						generic recommendations about saving more.
					</p>
					{/* Inline honesty note — can't miss it */}
					<p
						className='mt-3 text-[14px] italic leading-[1.6]'
						style={{ color: 'var(--lagoon-muted)' }}
					>
						None of this is available yet. These are planned capabilities — we
						will announce in the{' '}
						<a
							href='/changelog'
							className='underline underline-offset-2 transition-colors hover:opacity-80'
							style={{ color: 'var(--lagoon-accent)' }}
						>
							changelog
						</a>{' '}
						when each part ships.
					</p>
				</LagoonReveal>

				{/* Planned capability cards */}
				<div className='mt-12 grid gap-5 md:grid-cols-3'>
					{PLANNED.map((item, i) => (
						<LagoonReveal key={item.title} delay={i * 0.08}>
							<div className='lagoon-feature-card h-full'>
								<div
									className='mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl'
									style={{
										background: 'var(--lagoon-accent-tint)',
										color: 'var(--lagoon-accent)',
									}}
								>
									{item.icon}
								</div>
								<h3
									className='lagoon-feature-title mb-2'
									style={{
										color: 'var(--lagoon-ink)',
										fontFamily: 'var(--lagoon-font-heading, inherit)',
									}}
								>
									{item.title}
								</h3>
								<p
									className='text-[15px] leading-[1.65]'
									style={{ color: 'var(--lagoon-body)' }}
								>
									{item.desc}
								</p>
							</div>
						</LagoonReveal>
					))}
				</div>
			</div>
		</section>
	);
}
