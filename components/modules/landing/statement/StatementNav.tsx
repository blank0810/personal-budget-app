'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useMounted } from '@/components/modules/landing/ui/use-mounted';
import { PRIMARY_LINKS } from './nav-links';
import { Wordmark } from './Wordmark';

/* Written here, read by the no-flash script in app/(public)/layout.tsx —
   which also migrates the retired system's key on first load. */
const THEME_KEY = 'bp-public-theme';

const useIsoLayoutEffect =
	typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * StatementNav — the public header.
 *
 * Sticky, hairline-bottomed once scrolled. No pill, no glass card, no
 * floating dock: it is a rule and a row of type.
 *
 * The mobile menu is a native <dialog>. That buys focus trapping,
 * Escape-to-close, inert background and focus restoration from the
 * platform instead of from hand-written key handlers, and it renders in
 * the top layer so no ancestor's overflow can clip it.
 *
 * Auth-aware without breaking static rendering: the markup ships in its
 * logged-out state and swaps after `useSession` resolves client-side, so
 * every public route stays cacheable for crawlers.
 */
export function StatementNav() {
	const pathname = usePathname();
	const mounted = useMounted();
	const { data: session } = useSession();

	const [scrolled, setScrolled] = useState(false);
	const [theme, setTheme] = useState<'light' | 'dark'>('light');
	const dialogRef = useRef<HTMLDialogElement>(null);

	/* Read the theme the no-flash script already applied, before paint,
	   so the Sun/Moon glyph never flashes the wrong state. */
	useIsoLayoutEffect(() => {
		const attr = document.documentElement.getAttribute('data-st-theme');
		setTheme(attr === 'dark' ? 'dark' : 'light');
	}, []);

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 8);
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, []);

	/* Close the drawer on navigation — the dialog outlives a route change. */
	useEffect(() => {
		dialogRef.current?.close();
	}, [pathname]);

	const toggleTheme = useCallback(() => {
		setTheme((current) => {
			const next = current === 'dark' ? 'light' : 'dark';
			document.documentElement.setAttribute('data-st-theme', next);
			try {
				localStorage.setItem(THEME_KEY, next);
			} catch {
				/* Storage can be blocked; the attribute swap still works. */
			}
			return next;
		});
	}, []);

	const isLoggedIn = mounted && Boolean(session?.user);

	const accountLinks = isLoggedIn ? (
		<Link href='/dashboard' className='st-btn st-btn--signal'>
			Go to dashboard
		</Link>
	) : (
		<>
			<Link href='/login' className='st-nav-link'>
				Sign in
			</Link>
			<Link href='/register' className='st-btn st-btn--signal'>
				Start for free
			</Link>
		</>
	);

	return (
		<header className='st-nav' data-scrolled={scrolled}>
			<div className='st-shell flex h-16 items-center justify-between gap-6 md:h-[4.5rem]'>
				<Link
					href='/'
					className='-m-2 flex items-center p-2 focus-visible:outline-2 focus-visible:outline-offset-2'
					style={{ outlineColor: 'var(--st-signal)' }}
					aria-label='Budget Planner — home'
				>
					<Wordmark />
				</Link>

				<nav aria-label='Primary' className='hidden items-center gap-7 lg:flex'>
					{PRIMARY_LINKS.map((link) => (
						<Link
							key={link.href}
							href={link.href}
							className='st-nav-link'
							aria-current={pathname === link.href ? 'page' : undefined}
						>
							{link.label}
						</Link>
					))}
				</nav>

				<div className='flex items-center gap-1 md:gap-3'>
					<button
						type='button'
						onClick={toggleTheme}
						className='st-icon-btn'
						aria-label={
							theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
						}
					>
						{theme === 'dark' ? (
							<Sun size={18} aria-hidden='true' />
						) : (
							<Moon size={18} aria-hidden='true' />
						)}
					</button>

					<div className='hidden items-center gap-4 md:flex'>{accountLinks}</div>

					<button
						type='button'
						className='st-icon-btn st-lg-hide'
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
				className='st-drawer'
				aria-label='Site menu'
				onClick={(event) => {
					/* Clicks land on the <dialog> itself only when they hit the
					   backdrop — the panel inside stops them. */
					if (event.target === dialogRef.current) dialogRef.current?.close();
				}}
			>
				<div className='st-drawer-panel'>
					<div className='flex h-16 items-center justify-between'>
						<Wordmark />
						<button
							type='button'
							className='st-icon-btn -mr-3'
							aria-label='Close menu'
							onClick={() => dialogRef.current?.close()}
						>
							<X size={20} aria-hidden='true' />
						</button>
					</div>

					<nav aria-label='Site' className='mt-4 flex flex-col'>
						{PRIMARY_LINKS.map((link) => (
							<Link
								key={link.href}
								href={link.href}
								className='st-drawer-link'
								aria-current={pathname === link.href ? 'page' : undefined}
							>
								{link.label}
							</Link>
						))}
						<Link href='/changelog' className='st-drawer-link'>
							Changelog
						</Link>
					</nav>

					<div className='mt-8 flex flex-col gap-3'>
						{isLoggedIn ? (
							<Link href='/dashboard' className='st-btn st-btn--signal st-btn--lg'>
								Go to dashboard
							</Link>
						) : (
							<>
								<Link href='/register' className='st-btn st-btn--signal st-btn--lg'>
									Start for free
								</Link>
								<Link href='/login' className='st-btn st-btn--ghost st-btn--lg'>
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
