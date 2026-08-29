import { LagoonReveal } from '@/components/modules/landing/lagoon/LagoonReveal';

/**
 * InvoicingWorkflow — 3-step "how it works" for /invoicing.
 *
 * Honesty: Step 3 explicitly says "you log it" — the invoice and budget
 * modules are co-located in one app but do NOT auto-sync. Logging a
 * client payment as income is a deliberate manual step.
 *
 * Uses the same lagoon-step-connector + step-number pattern as LagoonHowItWorks.
 * Server component.
 */

const STEPS = [
	{
		number: '01',
		title: 'Build the invoice',
		desc: 'Add your client\'s details, list the work you did as line items, set the amount and due date, apply a tax rate if needed, and attach your payment link.',
	},
	{
		number: '02',
		title: 'Send and share',
		desc: 'Email the invoice directly from the app, or download the PDF. Every invoice also gets a shareable payment link and a scannable QR code.',
	},
	{
		number: '03',
		title: 'Log the payment',
		desc: 'When your client pays, mark the invoice as Paid and log the income in your budget — all in the same app. No tab-switching, no separate spreadsheet.',
	},
] as const;

export function InvoicingWorkflow() {
	return (
		<section
			aria-label='How invoicing works'
			className='py-20 md:py-28'
			style={{ background: 'var(--lagoon-canvas)' }}
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
						className='lagoon-section-title max-w-[22ch]'
						style={{
							color: 'var(--lagoon-ink)',
							fontFamily: 'var(--lagoon-font-heading, inherit)',
						}}
					>
						From line items to payment in three steps.
					</h2>
				</LagoonReveal>

				{/* Steps */}
				<div className='mt-14 flex flex-col gap-12 md:flex-row md:items-start md:gap-0'>
					{STEPS.map((step, i) => (
						<div key={step.number} className='contents md:flex md:flex-1 md:items-start'>
							<LagoonReveal delay={i * 0.1} className='flex flex-1 flex-col gap-4 md:pr-6'>
								{/* Step number + connector */}
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
									{i < STEPS.length - 1 && (
										<span
											className='lagoon-step-connector hidden md:block'
											aria-hidden='true'
										/>
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

							{/* Vertical connector on mobile */}
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

				{/* Honest co-location note */}
				<LagoonReveal delay={0.3} className='mt-14'>
					<div
						className='flex flex-col gap-4 rounded-2xl border p-6 sm:flex-row sm:items-start sm:gap-6'
						style={{
							borderColor: 'var(--lagoon-border)',
							background: 'var(--lagoon-surface)',
						}}
					>
						{/* Icon */}
						<div
							className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl'
							style={{ background: 'var(--lagoon-accent-tint)', color: 'var(--lagoon-accent)' }}
						>
							<svg viewBox='0 0 24 24' fill='none' className='h-6 w-6' aria-hidden='true'>
								<path
									d='M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2'
									stroke='currentColor'
									strokeWidth='1.5'
									strokeLinecap='round'
								/>
								<path d='M9 12h6M9 16h4' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
							</svg>
						</div>
						{/* Text */}
						<div>
							<h3
								className='mb-1.5 text-[16px] font-semibold'
								style={{ color: 'var(--lagoon-ink)', fontFamily: 'var(--lagoon-font-heading, inherit)' }}
							>
								Invoicing and budgeting in one place
							</h3>
							<p className='text-[15px] leading-[1.7]' style={{ color: 'var(--lagoon-body)' }}>
								When a client pays, you log the income in the same app where you
								track your budget. One place for your money — no tab-switching
								between a separate invoicing tool and a separate budgeting
								spreadsheet.
							</p>
						</div>
					</div>
				</LagoonReveal>
			</div>
		</section>
	);
}
