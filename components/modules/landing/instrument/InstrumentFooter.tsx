import Link from 'next/link';
import { FOOTER_GROUPS } from './nav-links';

/** Hairline-ruled, no logo lockup, no social row we do not maintain. */
export function InstrumentFooter() {
	const year = new Date().getFullYear();

	return (
		<footer className='foot'>
			<div className='shell'>
				<div className='foot-grid'>
					<div>
						<span className='wordmark'>Budget Planner</span>
						<p className='fine' style={{ marginTop: '.6rem', maxWidth: '38ch' }}>
							A budgeting app that grades your finances from what you actually
							log. No bank linking, no ads, no selling your data.
						</p>
					</div>

					<div className='foot-cols'>
						{FOOTER_GROUPS.map((group) => (
							<nav key={group.heading} aria-label={group.heading}>
								<h2 className='micro'>{group.heading}</h2>
								<ul>
									{group.links.map((link) => (
										<li key={link.href}>
											<Link href={link.href}>{link.label}</Link>
										</li>
									))}
								</ul>
							</nav>
						))}
					</div>
				</div>

				<div className='foot-base'>
					<span>&copy; {year} Budget Planner</span>
					<span>
						Built in the open &middot;{' '}
						<Link href='/changelog' className='link'>
							public changelog
						</Link>
					</span>
				</div>
			</div>
		</footer>
	);
}
