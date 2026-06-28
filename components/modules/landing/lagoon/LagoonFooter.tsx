import Link from 'next/link';

const FOOTER_LINKS = [
	{ group: 'Product', links: [
		{ label: 'Features', href: '/features' },
		{ label: 'Pricing', href: '/pricing' },
		{ label: 'How it works', href: '/how-it-works' },
		{ label: 'Invoicing', href: '/invoicing' },
		{ label: 'AI Advisor', href: '/ai-advisor' },
		{ label: 'FAQ', href: '/faq' },
	]},
	{ group: 'Account', links: [
		{ label: 'Sign in', href: '/login' },
		{ label: 'Create account', href: '/register' },
		{ label: 'Changelog', href: '/changelog' },
	]},
] as const;

/**
 * LagoonFooter — shared multi-page footer for all //* routes.
 * Server component — no client JS needed.
 * Hover states use Tailwind CSS-variable arbitrary-value classes, not event handlers.
 */
export function LagoonFooter() {
	return (
		<footer
			className='border-t py-14'
			style={{
				borderColor: 'var(--lagoon-border)',
				background: 'var(--lagoon-surface)',
			}}
			aria-label='Site footer'
		>
			<div className='mx-auto max-w-[1184px] px-6 md:px-10'>
				<div className='flex flex-col gap-10 md:flex-row md:items-start md:justify-between'>
					{/* Brand */}
					<div className='shrink-0'>
						<Link
							href='/'
							className='flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-[var(--lagoon-accent)] focus-visible:outline-offset-2 focus-visible:rounded-sm'
							aria-label='Budget Planner home'
						>
							<span
								aria-hidden='true'
								className='flex h-7 w-7 shrink-0 items-center justify-center rounded-lg'
								style={{ background: 'var(--lagoon-accent)' }}
							>
								<svg width='14' height='12' viewBox='0 0 14 12' fill='none'>
									<rect x='0' y='5' width='3' height='7' rx='1' fill='white' />
									<rect x='4' y='2' width='3' height='10' rx='1' fill='white' fillOpacity='0.85' />
									<rect x='8' y='0' width='3' height='12' rx='1' fill='white' fillOpacity='0.7' />
									<rect x='12' y='3' width='2' height='9' rx='1' fill='white' fillOpacity='0.5' />
								</svg>
							</span>
							<span
								className='text-[15px] font-semibold tracking-[-0.02em]'
								style={{ color: 'var(--lagoon-ink)' }}
							>
								Budget Planner
							</span>
						</Link>
						<p
							className='mt-3 max-w-[26ch] text-[13px] leading-[1.65]'
							style={{ color: 'var(--lagoon-muted)' }}
						>
							Free personal budgeting. Manual logging, CSV import, monthly reports.
						</p>
					</div>

					{/* Nav groups */}
					<div className='flex gap-14'>
						{FOOTER_LINKS.map((group) => (
							<nav key={group.group} aria-label={`${group.group} links`}>
								<p
									className='mb-4 text-[11px] font-semibold uppercase tracking-[0.1em]'
									style={{ color: 'var(--lagoon-muted)' }}
								>
									{group.group}
								</p>
								<ul className='flex flex-col gap-2.5'>
									{group.links.map((link) => (
										<li key={link.label}>
											<Link
												href={link.href}
												className='text-[14px] text-[var(--lagoon-body)] transition-colors hover:text-[var(--lagoon-ink)] focus-visible:text-[var(--lagoon-ink)] focus-visible:outline-2 focus-visible:outline-[var(--lagoon-accent)] focus-visible:outline-offset-2 focus-visible:rounded-sm'
											>
												{link.label}
											</Link>
										</li>
									))}
								</ul>
							</nav>
						))}
					</div>
				</div>

				{/* Bottom bar */}
				<div
					className='mt-12 flex flex-col gap-2 border-t pt-6 text-[12px] md:flex-row md:items-center md:justify-between'
					style={{
						borderColor: 'var(--lagoon-surface-2)',
						color: 'var(--lagoon-muted)',
					}}
				>
					<p>© 2026 Budget Planner. Free personal budgeting for everyone.</p>
				</div>
			</div>
		</footer>
	);
}
