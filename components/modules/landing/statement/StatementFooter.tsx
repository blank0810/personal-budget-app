import Link from 'next/link';
import { FOOTER_GROUPS } from './nav-links';
import { Wordmark } from './Wordmark';

/**
 * StatementFooter — hairline-ruled, no logo lockup, no social row we
 * don't actually maintain. Server component.
 */
export function StatementFooter() {
	const year = new Date().getFullYear();

	return (
		<footer
			className='border-t'
			style={{ borderColor: 'var(--st-rule)', background: 'var(--st-canvas-sunk)' }}
		>
			<div className='st-shell py-14 md:py-16'>
				<div className='grid gap-10 md:grid-cols-[minmax(0,1fr)_auto] md:gap-16'>
					<div className='max-w-[38ch]'>
						<Wordmark />
						<p
							className='mt-3 text-[0.9375rem] leading-relaxed'
							style={{ color: 'var(--st-body)' }}
						>
							A budgeting app that grades your finances from what you actually log.
							No bank linking, no ads, no selling your data.
						</p>
					</div>

					<div className='grid grid-cols-2 gap-x-10 gap-y-8 sm:grid-cols-3 md:gap-x-16'>
						{FOOTER_GROUPS.map((group) => (
							<nav key={group.heading} aria-label={group.heading}>
								<h2 className='st-micro'>{group.heading}</h2>
								<ul className='mt-3 flex flex-col'>
									{group.links.map((link) => (
										<li key={link.href}>
											<Link href={link.href} className='st-footer-link'>
												{link.label}
											</Link>
										</li>
									))}
								</ul>
							</nav>
						))}
					</div>
				</div>

				<div
					className='mt-12 flex flex-wrap items-center justify-between gap-3 border-t pt-6'
					style={{ borderColor: 'var(--st-rule)' }}
				>
					<p className='text-[0.875rem]' style={{ color: 'var(--st-muted)' }}>
						&copy; {year} Budget Planner
					</p>
					<p className='text-[0.875rem]' style={{ color: 'var(--st-muted)' }}>
						Built in the open ·{' '}
						<Link href='/changelog' className='st-link'>
							public changelog
						</Link>
					</p>
				</div>
			</div>
		</footer>
	);
}
