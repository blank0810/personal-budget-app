import Link from 'next/link';
import { LagoonReveal } from './LagoonReveal';

const STEPS = [
	{
		number: '01',
		title: 'Set your categories',
		desc: 'Create budget envelopes for food, transport, utilities, rent — whatever fits your life. Takes about two minutes.',
	},
	{
		number: '02',
		title: 'Log your spending',
		desc: 'Add transactions as they happen, import a CSV from your bank, or let recurring entries run on autopilot.',
	},
	{
		number: '03',
		title: 'Read the truth',
		desc: 'Your dashboard shows budget health, savings progress, and a clear monthly breakdown — by category and account.',
	},
] as const;

/**
 * LagoonHowItWorks — 3-step process section with teal-accented step numbers.
 *
 * Connectors between steps use the `.lagoon-step-connector` gradient line
 * (hidden on mobile, visible md+). Server component.
 */
export function LagoonHowItWorks() {
	return (
		<section
			id='how-it-works'
			aria-label='How it works'
			className='py-20 md:py-28'
			style={{ background: 'var(--lagoon-surface)' }}
		>
			<div className='mx-auto max-w-[1184px] px-6 md:px-10'>
				{/* Header */}
				<LagoonReveal>
					<p
						className='mb-3 text-[12px] font-semibold uppercase tracking-[0.12em]'
						style={{ color: 'var(--lagoon-accent)' }}
					>
						How it works
					</p>
					<h2
						className='lagoon-section-title max-w-[20ch]'
						style={{
							color: 'var(--lagoon-ink)',
							fontFamily: 'var(--lagoon-font-heading, inherit)',
						}}
					>
						Three steps, then you know.
					</h2>
				</LagoonReveal>

				{/* Steps */}
				<div className='mt-14 flex flex-col gap-12 md:flex-row md:items-start md:gap-0'>
					{STEPS.map((step, i) => (
						<div key={step.number} className='contents md:flex md:flex-1 md:items-start'>
							<LagoonReveal delay={i * 0.1} className='flex flex-1 flex-col gap-4 md:pr-6'>
								{/* Step number */}
								<div className='flex items-center gap-3'>
									<span
										className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold'
										style={{
											background: 'var(--lagoon-accent)',
											color: 'var(--lagoon-on-accent)',
										}}
										aria-hidden='true'
									>
										{step.number}
									</span>
									{/* Connector line visible only md+ between steps */}
									{i < STEPS.length - 1 && (
										<span className='lagoon-step-connector hidden md:block' aria-hidden='true' />
									)}
								</div>

								{/* Content */}
								<div>
									<h3
										className='mb-2 text-[19px] font-bold tracking-[-0.02em]'
										style={{
											color: 'var(--lagoon-ink)',
											fontFamily: 'var(--lagoon-font-heading, inherit)',
										}}
									>
										{step.title}
									</h3>
									<p
										className='max-w-[32ch] text-[15px] leading-[1.65]'
										style={{ color: 'var(--lagoon-body)' }}
									>
										{step.desc}
									</p>
								</div>
							</LagoonReveal>

							{/* Connector between steps on mobile */}
							{i < STEPS.length - 1 && (
								<div
									className='ml-5 h-10 w-px md:hidden'
									style={{ background: 'var(--lagoon-border)' }}
									aria-hidden='true'
								/>
							)}
						</div>
					))}
				</div>

				{/* Full guide link */}
				<LagoonReveal delay={0.25} className='mt-12'>
					<Link
						href='/how-it-works'
						className='inline-flex items-center gap-2 text-[14px] font-medium transition-colors text-[var(--lagoon-accent)] hover:text-[var(--lagoon-accent-strong)] focus-visible:outline-2 focus-visible:outline-[var(--lagoon-accent)] focus-visible:outline-offset-2 focus-visible:rounded-sm'
					>
						See the full guide
						<svg aria-hidden='true' width='14' height='14' viewBox='0 0 14 14' fill='none'>
							<path d='M2.5 7h9M8.5 4l3 3-3 3' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
						</svg>
					</Link>
				</LagoonReveal>
			</div>
		</section>
	);
}
