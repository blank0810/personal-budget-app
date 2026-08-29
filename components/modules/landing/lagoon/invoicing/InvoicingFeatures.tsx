import { LagoonReveal } from '@/components/modules/landing/lagoon/LagoonReveal';

/**
 * InvoicingFeatures — 5 feature cards grounded in what the invoicing module
 * actually ships: email sending, PDF export, payment link + QR, multi-currency
 * per-invoice, and business identity.
 *
 * Honesty note: no "auto-sync" or "closed-loop" language.
 * Logging a client payment as income is a manual step (see InvoicingWorkflow).
 *
 * Server component.
 */

const FEATURES = [
	{
		title: 'Send invoices by email',
		desc: 'Compose and send a polished invoice directly from the app. Your client receives a professional email — no third-party tool needed.',
		icon: (
			<svg viewBox='0 0 24 24' fill='none' className='h-6 w-6' aria-hidden='true'>
				<rect x='2' y='5' width='20' height='14' rx='2' stroke='currentColor' strokeWidth='1.5' />
				<path d='M2 8l10 7 10-7' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
			</svg>
		),
	},
	{
		title: 'PDF export',
		desc: 'Download any invoice as a PDF. Attach it to your own email, archive it, or hand it to your accountant — however your client prefers.',
		icon: (
			<svg viewBox='0 0 24 24' fill='none' className='h-6 w-6' aria-hidden='true'>
				<path
					d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z'
					stroke='currentColor'
					strokeWidth='1.5'
					strokeLinecap='round'
					strokeLinejoin='round'
				/>
				<path d='M14 2v6h6' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
				<path d='M9 13h6M9 17h4' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
			</svg>
		),
	},
	{
		title: 'Payment links and QR codes',
		desc: 'Every invoice includes a shareable payment link and a scannable QR code so clients can see your total and payment details in one tap.',
		icon: (
			<svg viewBox='0 0 24 24' fill='none' className='h-6 w-6' aria-hidden='true'>
				<rect x='3' y='3' width='7' height='7' rx='1' stroke='currentColor' strokeWidth='1.5' />
				<rect x='14' y='3' width='7' height='7' rx='1' stroke='currentColor' strokeWidth='1.5' />
				<rect x='3' y='14' width='7' height='7' rx='1' stroke='currentColor' strokeWidth='1.5' />
				<path d='M14 14h2v2h-2ZM18 14h3M14 18h2M18 18h3v3M18 18v2' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
			</svg>
		),
	},
	{
		title: 'Multi-currency',
		desc: 'Invoice in any currency — set it per invoice. Bill international clients without changing your account settings.',
		icon: (
			<svg viewBox='0 0 24 24' fill='none' className='h-6 w-6' aria-hidden='true'>
				<circle cx='12' cy='12' r='9' stroke='currentColor' strokeWidth='1.5' />
				<path d='M9 12h6M12 9v6' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
				<path d='M9 9c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2h-2c-1.1 0-2-.9-2-2' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
			</svg>
		),
	},
	{
		title: 'Your business identity on every invoice',
		desc: 'Add your business name, address, and contact details once. They appear on every invoice you create — no re-entering per client.',
		icon: (
			<svg viewBox='0 0 24 24' fill='none' className='h-6 w-6' aria-hidden='true'>
				<path
					d='M3 21V8a2 2 0 0 1 .93-1.69l7-4.67a2 2 0 0 1 2.14 0l7 4.67A2 2 0 0 1 21 8v13'
					stroke='currentColor'
					strokeWidth='1.5'
					strokeLinecap='round'
					strokeLinejoin='round'
				/>
				<path d='M9 21V15h6v6' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
				<path d='M9 9h.01M12 9h.01M15 9h.01M9 12h.01M12 12h.01M15 12h.01' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
			</svg>
		),
	},
] as const;

export function InvoicingFeatures() {
	return (
		<section
			id='features'
			aria-label='Invoicing features'
			className='py-20 md:py-28'
			style={{ background: 'var(--lagoon-surface)' }}
		>
			<div className='mx-auto max-w-[1184px] px-6 md:px-10'>
				{/* Section header */}
				<LagoonReveal>
					<p
						className='mb-3 text-[12px] font-semibold uppercase tracking-[0.12em]'
						style={{ color: 'var(--lagoon-accent)' }}
					>
						What&apos;s included
					</p>
					<h2
						className='lagoon-section-title max-w-[22ch]'
						style={{
							color: 'var(--lagoon-ink)',
							fontFamily: 'var(--lagoon-font-heading, inherit)',
						}}
					>
						Everything you need to invoice clients professionally.
					</h2>
					<p
						className='mt-4 max-w-[52ch] text-[17px] leading-[1.7]'
						style={{ color: 'var(--lagoon-body)' }}
					>
						No sign-up for a separate invoicing platform. These features are
						built into the same app where you manage your budget and savings goals.
					</p>
				</LagoonReveal>

				{/* Feature grid */}
				<div className='mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3'>
					{FEATURES.map((f, i) => (
						<LagoonReveal key={f.title} delay={i * 0.06}>
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
