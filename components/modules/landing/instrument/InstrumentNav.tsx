'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useMounted } from '@/components/modules/landing/ui/use-mounted';
import { PRIMARY_LINKS } from './nav-links';
import { ThemeToggle } from './ThemeToggle';

/**
 * InstrumentNav — the public header.
 *
 * The mobile menu is a native <dialog>. That buys focus trapping,
 * Escape-to-close, an inert background and focus restoration from the
 * platform rather than from hand-written key handlers, and it renders
 * in the top layer so no ancestor's overflow can clip it.
 *
 * Auth-aware without breaking static rendering: the markup ships in its
 * logged-out state and swaps once `useSession` resolves client-side, so
 * every public route stays cacheable for crawlers.
 */
export function InstrumentNav() {
	const pathname = usePathname();
	const mounted = useMounted();
	const { data: session } = useSession();
	const dialogRef = useRef<HTMLDialogElement>(null);

	/* The dialog outlives a route change, so close it on navigation. */
	useEffect(() => {
		dialogRef.current?.close();
	}, [pathname]);

	const isLoggedIn = mounted && Boolean(session?.user);

	return (
		<header className='nav'>
			<div className='shell nav-in'>
				<Link className='wordmark' href='/'>
					Budget Planner
				</Link>

				<nav className='nav-links' aria-label='Primary'>
					{PRIMARY_LINKS.map((link) => (
						<Link
							key={link.href}
							href={link.href}
							className='nav-link'
							aria-current={pathname === link.href ? 'page' : undefined}
						>
							{link.label}
						</Link>
					))}
				</nav>

				<div className='nav-cta'>
					<ThemeToggle />

					{isLoggedIn ? (
						<Link href='/dashboard' className='btn btn--orange'>
							Go to dashboard
						</Link>
					) : (
						<>
							<Link href='/login' className='nav-link in-lg-only'>
								Sign in
							</Link>
							<Link href='/register' className='btn btn--orange'>
								Start for free
							</Link>
						</>
					)}

					<button
						type='button'
						className='toggle in-lg-hide'
						aria-label='Open menu'
						aria-haspopup='dialog'
						onClick={() => dialogRef.current?.showModal()}
					>
						<Menu size={20} aria-hidden='true' />
					</button>
				</div>
			</div>

			<dialog
				ref={dialogRef}
				className='drawer'
				aria-label='Site menu'
				onClick={(event) => {
					/* Clicks reach the <dialog> itself only from the backdrop;
					   the panel inside stops them. */
					if (event.target === dialogRef.current) dialogRef.current?.close();
				}}
			>
				<div className='drawer-panel'>
					<div className='drawer-head'>
						<span className='wordmark'>Budget Planner</span>
						<button
							type='button'
							className='toggle'
							aria-label='Close menu'
							onClick={() => dialogRef.current?.close()}
						>
							<X size={20} aria-hidden='true' />
						</button>
					</div>

					<nav aria-label='Site'>
						{PRIMARY_LINKS.map((link) => (
							<Link
								key={link.href}
								href={link.href}
								className='drawer-link'
								aria-current={pathname === link.href ? 'page' : undefined}
							>
								{link.label}
							</Link>
						))}
						<Link href='/changelog' className='drawer-link'>
							Changelog
						</Link>
					</nav>

					<div className='drawer-cta'>
						{isLoggedIn ? (
							<Link href='/dashboard' className='btn btn--orange btn--lg'>
								Go to dashboard
							</Link>
						) : (
							<>
								<Link href='/register' className='btn btn--orange btn--lg'>
									Start for free
								</Link>
								<Link href='/login' className='btn btn--outline btn--lg'>
									Sign in
								</Link>
							</>
						)}
					</div>
				</div>
			</dialog>
		</header>
	);
}
