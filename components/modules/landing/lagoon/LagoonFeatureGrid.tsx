import { LagoonReveal } from './LagoonReveal';
import Link from 'next/link';

const FEATURES = [
	{
		title: 'Envelope budgets',
		desc: 'Assign every peso to a category before the month starts. See at a glance how much is left and where you\'re trending.',
		icon: (
			<svg viewBox='0 0 24 24' fill='none' className='h-6 w-6' aria-hidden='true'>
				<path d='M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z' stroke='currentColor' strokeWidth='1.5' />
				<path d='M3 7l9 6 9-6' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
			</svg>
		),
	},
	{
		title: 'Unified transactions',
		desc: 'Log income, expenses, transfers, and payments in one place. Every peso tracked — nothing falls through.',
		icon: (
			<svg viewBox='0 0 24 24' fill='none' className='h-6 w-6' aria-hidden='true'>
				<path d='M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
				<path d='M9 12h6M9 16h4' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
			</svg>
		),
	},
	{
		title: 'Savings goals',
		desc: 'Create a goal, link it to a savings account, and watch the progress ring fill. The dashboard shows exactly when you\'ll hit your target.',
		icon: (
			<svg viewBox='0 0 24 24' fill='none' className='h-6 w-6' aria-hidden='true'>
				<path d='M12 2a10 10 0 1 0 10 10' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
				<path d='M12 6v6l4 2' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
				<path d='M19 2v4M21 4h-4' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
			</svg>
		),
	},
	{
		title: 'Financial health dashboard',
		desc: 'Net worth, savings rate, emergency fund coverage, and credit utilisation — all on one screen, updated in real time.',
		icon: (
			<svg viewBox='0 0 24 24' fill='none' className='h-6 w-6' aria-hidden='true'>
				<path d='M3 12l4-4 4 4 4-6 4 2' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
				<rect x='3' y='3' width='18' height='18' rx='2' stroke='currentColor' strokeWidth='1.5' />
			</svg>
		),
	},
	{
		title: 'Multiple accounts',
		desc: 'Track cash, bank, savings, credit, and loan accounts together. Each account keeps its own clear transaction ledger.',
		icon: (
			<svg viewBox='0 0 24 24' fill='none' className='h-6 w-6' aria-hidden='true'>
				<rect x='3' y='5' width='18' height='14' rx='2' stroke='currentColor' strokeWidth='1.5' />
				<path d='M3 9h18M7 14h4' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
			</svg>
		),
	},
	{
		title: 'CSV import & reports',
		desc: 'Import bank statements in seconds — duplicates flagged automatically. Export PDF monthly reports broken down by category and account.',
		icon: (
			<svg viewBox='0 0 24 24' fill='none' className='h-6 w-6' aria-hidden='true'>
				<path d='M12 3v10M8 9l4 4 4-4' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
				<path d='M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
			</svg>
		),
	},
] as const;

/**
 * LagoonFeatureGrid — 6 feature cards in a responsive 2/3-column grid.
 *
 * Cards have hover lift + teal glow (via .lagoon-feature-card CSS class).
 * Each card is wrapped in LagoonReveal for staggered scroll reveal.
 * Server component — LagoonReveal is the only client piece.
 */
export function LagoonFeatureGrid() {
	return (
		<section
			id='features'
			aria-label='Features'
			className='py-20 md:py-28'
			style={{ background: 'var(--lagoon-canvas)' }}
		>
			<div className='mx-auto max-w-[1184px] px-6 md:px-10'>
				{/* Section header */}
				<LagoonReveal>
					<p
						className='mb-3 text-[12px] font-semibold uppercase tracking-[0.12em]'
						style={{ color: 'var(--lagoon-accent)' }}
					>
						What you get
					</p>
					<div className='flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
						<h2
							className='lagoon-section-title max-w-[22ch]'
							style={{
								color: 'var(--lagoon-ink)',
								fontFamily: 'var(--lagoon-font-heading, inherit)',
							}}
						>
							Everything you need to manage your money clearly.
						</h2>
						<Link
							href='/features'
							className='shrink-0 text-[14px] font-medium transition-colors text-[var(--lagoon-accent)] hover:text-[var(--lagoon-accent-strong)] focus-visible:outline-2 focus-visible:outline-[var(--lagoon-accent)] focus-visible:outline-offset-2 focus-visible:rounded-sm'
						>
							See all features →
						</Link>
					</div>
					<p
						className='mt-4 max-w-[52ch] text-[17px] leading-[1.7]'
						style={{ color: 'var(--lagoon-body)' }}
					>
						No bank sync required. Just a clear tool that keeps your budget honest
						— exactly the way you set it up.
					</p>
				</LagoonReveal>

				{/* Feature grid */}
				<div className='mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3'>
					{FEATURES.map((f, i) => (
						<LagoonReveal key={f.title} delay={i * 0.055}>
							<div className='lagoon-feature-card h-full'>
								<div
									className='mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl'
									style={{
										background: 'var(--lagoon-accent-tint)',
										color: 'var(--lagoon-accent)',
									}}
								>
									{f.icon}
								</div>
								<h3
									className='lagoon-feature-title mb-2'
									style={{
										color: 'var(--lagoon-ink)',
										fontFamily: 'var(--lagoon-font-heading, inherit)',
									}}
								>
									{f.title}
								</h3>
								<p
									className='text-[15px] leading-[1.65]'
									style={{ color: 'var(--lagoon-body)' }}
								>
									{f.desc}
								</p>
							</div>
						</LagoonReveal>
					))}
				</div>
			</div>
		</section>
	);
}
