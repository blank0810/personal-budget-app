'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Sun, Moon, Menu, X } from 'lucide-react';
import { m, AnimatePresence } from 'motion/react';
import { useSession } from 'next-auth/react';
import { useMounted } from '@/components/modules/landing/ui/use-mounted';

const NAV_LINKS = [
	{ label: 'Home', href: '/' },
	{ label: 'Features', href: '/features' },
	{ label: 'How it works', href: '/how-it-works' },
	{ label: 'Pricing', href: '/pricing' },
	{ label: 'FAQ', href: '/faq' },
] as const;

/**
 * SSR-safe layout effect — fires synchronously before browser paint on client.
 * Falls back to useEffect on the server to avoid the React SSR warning.
 */
const useIsomorphicLayoutEffect =
	typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const DRAWER_ID = 'lagoon-mobile-menu';

/**
 * LagoonNav — sticky multi-page navigation.
 *
 * Scroll behaviour: transparent + no border → canvas/96 + blur + border on scroll.
 * Active route: teal text + 2px underline bar (via usePathname).
 * Mobile: hamburger opens accessible slide-in drawer with all nav links + CTAs.
 * Dark mode toggle: reads data-lagoon-theme from DOM before first paint via
 *   useIsomorphicLayoutEffect — prevents Sun/Moon icon flash for returning dark users.
 * Auth-aware: logged-in users see "Go to dashboard"; logged-out see "Sign in" + "Start free".
 *   Hydration-safe: defaults to logged-out state; swaps after mount.
 */
export function LagoonNav() {
	const pathname = usePathname();
	const [scrolled, setScrolled] = useState(false);
	const [theme, setTheme] = useState<'light' | 'dark'>('light');
	const [menuOpen, setMenuOpen] = useState(false);

	const mounted = useMounted();
	const { data: session } = useSession();
	// Gate auth swap behind mounted so SSR markup === first client render (no hydration mismatch)
	const isLoggedIn = mounted && !!session?.user;

	const menuButtonRef = useRef<HTMLButtonElement>(null);
	const drawerRef = useRef<HTMLDivElement>(null);

	/* ── Scroll listener ──────────────────────────────────── */
	useEffect(() => {
		const handler = () => setScrolled(window.scrollY > 24);
		window.addEventListener('scroll', handler, { passive: true });
		return () => window.removeEventListener('scroll', handler);
	}, []);

	/* ── Theme flash fix: read DOM attribute before first paint ── */
	useIsomorphicLayoutEffect(() => {
		const attr = document.documentElement.getAttribute('data-lagoon-theme');
		if (attr === 'dark' || attr === 'light') setTheme(attr);
	}, []);

	/* ── Mobile drawer: body-scroll lock + Escape + focus trap ── */
	useEffect(() => {
		if (!menuOpen) return;

		const original = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		// Move focus into drawer after spring animation starts
		requestAnimationFrame(() => {
			const first = drawerRef.current?.querySelector<HTMLElement>(
				'a[href], button:not([disabled])'
			);
			first?.focus();
		});

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setMenuOpen(false);
				setTimeout(() => menuButtonRef.current?.focus(), 0);
				return;
			}
			if (e.key !== 'Tab' || !drawerRef.current) return;

			const focusables = Array.from(
				drawerRef.current.querySelectorAll<HTMLElement>(
					'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
				)
			);
			if (focusables.length === 0) return;
			const first = focusables[0];
			const last = focusables[focusables.length - 1];
			if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			} else if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.body.style.overflow = original;
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [menuOpen]);

	const closeMobileMenu = useCallback(() => {
		setMenuOpen(false);
		// Restore focus after React commits the state update
		setTimeout(() => menuButtonRef.current?.focus(), 0);
	}, []);

	const toggleTheme = () => {
		const next: 'light' | 'dark' = theme === 'dark' ? 'light' : 'dark';
		setTheme(next);
		document.documentElement.setAttribute('data-lagoon-theme', next);
		try {
			localStorage.setItem('lagoon-theme', next);
		} catch {}
	};

	return (
		<>
			<header
				className='fixed top-0 left-0 right-0 z-50'
				style={{
					transition: 'background 280ms ease, border-color 280ms ease, backdrop-filter 280ms ease',
					background: scrolled
						? 'color-mix(in srgb, var(--lagoon-canvas) 96%, transparent)'
						: 'transparent',
					backdropFilter: scrolled ? 'blur(12px)' : 'none',
					WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
					borderBottom: scrolled
						? '1px solid var(--lagoon-border)'
						: '1px solid transparent',
				}}
			>
				<nav
					className='mx-auto flex max-w-[1184px] items-center px-6 py-4 md:px-10'
					aria-label='Main navigation'
				>
					{/* Logo */}
					<Link
						href='/'
						className='flex shrink-0 items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-[var(--lagoon-accent)] focus-visible:outline-offset-2'
						aria-label='Budget Planner home'
					>
						<span
							aria-hidden='true'
							className='flex h-7 w-7 shrink-0 items-center justify-center rounded-lg'
							style={{ background: 'var(--lagoon-accent)' }}
						>
							{/* Minimal chart-bars logomark */}
							<svg width='14' height='12' viewBox='0 0 14 12' fill='none' aria-hidden='true'>
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

					{/* Center nav links — hidden on mobile */}
					<div className='hidden flex-1 items-center justify-center gap-0.5 md:flex' role='list'>
						{NAV_LINKS.map((link) => {
							const isActive = pathname === link.href;
							return (
								<Link
									key={link.label}
									href={link.href}
									role='listitem'
									className='relative flex items-center rounded-md px-3 py-2 text-[14px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--lagoon-accent)] focus-visible:outline-offset-1 focus-visible:rounded-md'
									style={{ color: isActive ? 'var(--lagoon-accent)' : 'var(--lagoon-body)' }}
									aria-current={isActive ? 'page' : undefined}
									onMouseEnter={(e) => {
										if (!isActive)
											(e.currentTarget as HTMLElement).style.color = 'var(--lagoon-ink)';
									}}
									onMouseLeave={(e) => {
										(e.currentTarget as HTMLElement).style.color = isActive
											? 'var(--lagoon-accent)'
											: 'var(--lagoon-body)';
									}}
								>
									{link.label}
									{isActive && (
										<span
											aria-hidden='true'
											className='absolute bottom-0.5 left-3 right-3 h-[2px] rounded-full'
											style={{ background: 'var(--lagoon-accent)' }}
										/>
									)}
								</Link>
							);
						})}
					</div>

					{/* Right: theme toggle + auth CTAs + hamburger */}
					<div className='ml-auto flex items-center gap-2'>
						{/* Theme toggle — sun/moon */}
						<button
							type='button'
							onClick={toggleTheme}
							aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
							aria-pressed={theme === 'dark'}
							className='flex h-9 w-9 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-[var(--lagoon-accent)] focus-visible:outline-offset-2'
							style={{ color: 'var(--lagoon-muted)' }}
							onMouseEnter={(e) =>
								((e.currentTarget as HTMLElement).style.color = 'var(--lagoon-ink)')
							}
							onMouseLeave={(e) =>
								((e.currentTarget as HTMLElement).style.color = 'var(--lagoon-muted)')
							}
						>
							{theme === 'dark' ? (
								<Sun size={17} aria-hidden='true' />
							) : (
								<Moon size={17} aria-hidden='true' />
							)}
						</button>

						{/* Desktop auth CTAs — hidden on mobile (hamburger drawer covers mobile) */}
						{isLoggedIn ? (
							<Link
								href='/dashboard'
								className='hidden md:inline-flex h-9 items-center rounded-full px-5 text-[14px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lagoon-accent)]'
								style={{ background: 'var(--lagoon-accent)', color: 'var(--lagoon-on-accent)' }}
								onMouseEnter={(e) =>
									((e.currentTarget as HTMLElement).style.background =
										'var(--lagoon-accent-strong)')
								}
								onMouseLeave={(e) =>
									((e.currentTarget as HTMLElement).style.background = 'var(--lagoon-accent)')
								}
							>
								Go to dashboard
							</Link>
						) : (
							<>
								<Link
									href='/login'
									className='hidden md:inline text-[14px] font-medium transition-colors hover:text-[var(--lagoon-ink)] focus-visible:outline-2 focus-visible:outline-[var(--lagoon-accent)] focus-visible:outline-offset-2 focus-visible:rounded-sm'
									style={{ color: 'var(--lagoon-body)' }}
								>
									Sign in
								</Link>
								<Link
									href='/register'
									className='hidden md:inline-flex h-9 items-center rounded-full px-5 text-[14px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lagoon-accent)]'
									style={{
										background: 'var(--lagoon-accent)',
										color: 'var(--lagoon-on-accent)',
									}}
									onMouseEnter={(e) =>
										((e.currentTarget as HTMLElement).style.background =
											'var(--lagoon-accent-strong)')
									}
									onMouseLeave={(e) =>
										((e.currentTarget as HTMLElement).style.background = 'var(--lagoon-accent)')
									}
								>
									Start free
								</Link>
							</>
						)}

						{/* Hamburger button — mobile only */}
						<button
							ref={menuButtonRef}
							type='button'
							onClick={() => setMenuOpen(true)}
							aria-label='Open navigation menu'
							aria-expanded={menuOpen}
							aria-controls={DRAWER_ID}
							className='flex md:hidden h-9 w-9 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-[var(--lagoon-accent)] focus-visible:outline-offset-2'
							style={{ color: 'var(--lagoon-ink)' }}
							onMouseEnter={(e) =>
								((e.currentTarget as HTMLElement).style.color = 'var(--lagoon-accent)')
							}
							onMouseLeave={(e) =>
								((e.currentTarget as HTMLElement).style.color = 'var(--lagoon-ink)')
							}
						>
							<Menu size={20} aria-hidden='true' />
						</button>
					</div>
				</nav>
			</header>

			{/* ── Mobile drawer — rendered outside header so z-index stacking is clean ── */}

			{/* Backdrop overlay */}
			<AnimatePresence>
				{menuOpen && (
					<m.div
						key='lagoon-nav-overlay'
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.18 }}
						aria-hidden='true'
						onClick={closeMobileMenu}
						className='fixed inset-0 z-[60] md:hidden'
						style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
					/>
				)}
			</AnimatePresence>

			{/* Drawer panel */}
			<AnimatePresence>
				{menuOpen && (
					<m.div
						key='lagoon-nav-drawer'
						ref={drawerRef}
						id={DRAWER_ID}
						role='dialog'
						aria-modal='true'
						aria-label='Navigation menu'
						initial={{ x: '100%' }}
						animate={{ x: 0 }}
						exit={{ x: '100%' }}
						transition={{ type: 'spring', stiffness: 320, damping: 32 }}
						className='fixed top-0 right-0 bottom-0 z-[70] flex w-[80vw] max-w-[320px] flex-col md:hidden'
						style={{
							background: 'var(--lagoon-surface)',
							borderLeft: '1px solid var(--lagoon-border)',
							boxShadow: '-20px 0 60px rgba(0,0,0,0.18)',
						}}
					>
						{/* Drawer header: logo + close button */}
						<div
							className='flex items-center justify-between px-5 py-4'
							style={{ borderBottom: '1px solid var(--lagoon-border)' }}
						>
							<Link
								href='/'
								onClick={closeMobileMenu}
								className='flex items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-[var(--lagoon-accent)] focus-visible:outline-offset-2'
								aria-label='Budget Planner home'
							>
								<span
									aria-hidden='true'
									className='flex h-6 w-6 shrink-0 items-center justify-center rounded-md'
									style={{ background: 'var(--lagoon-accent)' }}
								>
									<svg width='12' height='10' viewBox='0 0 14 12' fill='none' aria-hidden='true'>
										<rect x='0' y='5' width='3' height='7' rx='1' fill='white' />
										<rect
											x='4'
											y='2'
											width='3'
											height='10'
											rx='1'
											fill='white'
											fillOpacity='0.85'
										/>
										<rect
											x='8'
											y='0'
											width='3'
											height='12'
											rx='1'
											fill='white'
											fillOpacity='0.7'
										/>
										<rect
											x='12'
											y='3'
											width='2'
											height='9'
											rx='1'
											fill='white'
											fillOpacity='0.5'
										/>
									</svg>
								</span>
								<span
									className='text-[14px] font-semibold tracking-[-0.02em]'
									style={{ color: 'var(--lagoon-ink)' }}
								>
									Budget Planner
								</span>
							</Link>
							<button
								type='button'
								onClick={closeMobileMenu}
								aria-label='Close navigation menu'
								className='flex h-9 w-9 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-[var(--lagoon-accent)] focus-visible:outline-offset-2'
								style={{ color: 'var(--lagoon-muted)' }}
								onMouseEnter={(e) =>
									((e.currentTarget as HTMLElement).style.color = 'var(--lagoon-ink)')
								}
								onMouseLeave={(e) =>
									((e.currentTarget as HTMLElement).style.color = 'var(--lagoon-muted)')
								}
							>
								<X size={18} aria-hidden='true' />
							</button>
						</div>

						{/* Nav links */}
						<nav
							className='flex flex-1 flex-col overflow-y-auto px-3 py-3'
							aria-label='Mobile navigation'
						>
							{NAV_LINKS.map((link) => {
								const isActive = pathname === link.href;
								return (
									<Link
										key={link.label}
										href={link.href}
										onClick={closeMobileMenu}
										aria-current={isActive ? 'page' : undefined}
										className='flex items-center justify-between rounded-lg px-3 py-3 text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[var(--lagoon-accent)] focus-visible:outline-offset-1'
										style={{
											color: isActive ? 'var(--lagoon-accent)' : 'var(--lagoon-ink)',
											background: isActive ? 'var(--lagoon-accent-bg)' : undefined,
										}}
										onMouseEnter={(e) => {
											if (!isActive)
												(e.currentTarget as HTMLElement).style.background =
													'var(--lagoon-surface-2)';
										}}
										onMouseLeave={(e) => {
											(e.currentTarget as HTMLElement).style.background = isActive
												? 'var(--lagoon-accent-bg)'
												: '';
										}}
									>
										{link.label}
										{isActive && (
											<span
												aria-hidden='true'
												className='h-1.5 w-1.5 rounded-full'
												style={{ background: 'var(--lagoon-accent)' }}
											/>
										)}
									</Link>
								);
							})}
						</nav>

						{/* Auth CTAs — bottom of drawer */}
						<div
							className='flex flex-col gap-2 px-4 py-5'
							style={{ borderTop: '1px solid var(--lagoon-border)' }}
						>
							{isLoggedIn ? (
								<Link
									href='/dashboard'
									onClick={closeMobileMenu}
									className='flex h-11 items-center justify-center rounded-full text-[14px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[var(--lagoon-accent)] focus-visible:outline-offset-2'
									style={{
										background: 'var(--lagoon-accent)',
										color: 'var(--lagoon-on-accent)',
									}}
								>
									Go to dashboard
								</Link>
							) : (
								<>
									<Link
										href='/register'
										onClick={closeMobileMenu}
										className='flex h-11 items-center justify-center rounded-full text-[14px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[var(--lagoon-accent)] focus-visible:outline-offset-2'
										style={{
											background: 'var(--lagoon-accent)',
											color: 'var(--lagoon-on-accent)',
										}}
									>
										Start free
									</Link>
									<Link
										href='/login'
										onClick={closeMobileMenu}
										className='flex h-11 items-center justify-center rounded-full text-[14px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[var(--lagoon-accent)] focus-visible:outline-offset-2'
										style={{
											color: 'var(--lagoon-body)',
											border: '1px solid var(--lagoon-border)',
										}}
									>
										Sign in
									</Link>
								</>
							)}
						</div>
					</m.div>
				)}
			</AnimatePresence>
		</>
	);
}
