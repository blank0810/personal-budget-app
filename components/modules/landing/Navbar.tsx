'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wallet } from 'lucide-react';
import { m, useScroll, useMotionValueEvent } from 'motion/react';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
	{ label: 'Features', href: '/features' },
	{ label: 'Invoicing', href: '/invoicing' },
	{ label: 'How it works', href: '/how-it-works' },
	{ label: 'AI Advisor', href: '/ai-advisor' },
	{ label: 'Pricing', href: '/pricing' },
	{ label: 'FAQ', href: '/faq' },
];

/**
 * LandingNavbar — sticky glass navbar (design-system §4.0).
 *
 * NO entrance animation: it sits above the LCP element and must paint
 * immediately. The only motion is a functional scroll-shadow — at >40px
 * scroll a border + shadow fade in (kept under prefers-reduced-motion;
 * it's functional, not decorative).
 */
export function LandingNavbar() {
	const [scrolled, setScrolled] = useState(false);
	const { scrollY } = useScroll();
	const { status } = useSession();
	const isAuthed = status === 'authenticated';
	const pathname = usePathname();

	useMotionValueEvent(scrollY, 'change', (latest) => {
		const next = latest > 40;
		setScrolled((prev) => (prev === next ? prev : next));
	});

	return (
		<m.header
			// Explicit initial (matching the unscrolled state) so Motion never
			// reads the `transparent` keyword from computed style — it cannot
			// interpolate that. Border + shadow fade in via zero-alpha colors.
			initial={{
				borderColor: 'oklch(0.91 0.006 264 / 0)',
				boxShadow: '0 0 0 0 oklch(0.13 0.01 264 / 0)',
			}}
			animate={{
				borderColor: scrolled
					? 'oklch(0.91 0.006 264)'
					: 'oklch(0.91 0.006 264 / 0)',
				boxShadow: scrolled
					? '0 1px 0 0 oklch(0.13 0.01 264 / 4%), 0 8px 24px oklch(0.13 0.01 264 / 6%)'
					: '0 0 0 0 oklch(0.13 0.01 264 / 0)',
			}}
			transition={{ duration: 0.2 }}
			className='sticky top-0 z-50 w-full border-b bg-l-bg/80 backdrop-blur-xl'
		>
			<nav className='mx-auto flex h-16 max-w-[1184px] items-center justify-between px-6 md:px-10 xl:px-12'>
				{/* Logo */}
				<Link
					href='/'
					className='flex items-center gap-2 text-l-text-1'
					aria-label='Budget Planner home'
				>
					<span className='flex h-8 w-8 items-center justify-center rounded-lg bg-l-accent-dim text-l-accent'>
						<Wallet className='h-[18px] w-[18px]' />
					</span>
					<span className='text-[15px] font-semibold tracking-[-0.01em]'>
						Budget Planner
					</span>
				</Link>

				{/* Center nav links — real routes with active-route highlight */}
				<div className='hidden items-center gap-1 md:flex'>
					{NAV_LINKS.map((link) => {
						const isActive = pathname === link.href;
						return (
							<Link
								key={link.href}
								href={link.href}
								aria-current={isActive ? 'page' : undefined}
								className={cn(
									'rounded-md px-3 py-2 text-sm transition-colors',
									isActive
										? 'font-medium text-l-text-1'
										: 'text-l-text-2 hover:text-l-text-1',
								)}
							>
								{link.label}
							</Link>
						);
					})}
				</div>

				{/*
				 * CTAs — auth-aware post-hydration.
				 *
				 * SSR + loading state (status !== 'authenticated') renders the
				 * logged-out pair so the initial HTML matches what crawlers and
				 * anonymous users see (static render preserved, no CLS on mount).
				 * Only after useSession confirms 'authenticated' do we swap to
				 * the single dashboard pill.
				 *
				 * min-w reserves space so the right edge of the nav doesn't
				 * shift when the wider two-button group collapses to one.
				 */}
				<div className='flex min-w-[156px] items-center justify-end gap-2'>
					{isAuthed ? (
						<Link
							href='/dashboard'
							className='rounded-full bg-l-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-l-accent/90'
						>
							Go to dashboard
						</Link>
					) : (
						<>
							<Link
								href='/login'
								className='rounded-md px-3 py-2 text-sm font-medium text-l-text-2 transition-colors hover:text-l-text-1'
							>
								Log in
							</Link>
							<Link
								href='/register'
								className='rounded-full bg-l-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-l-accent/90'
							>
								Start free
							</Link>
						</>
					)}
				</div>
			</nav>
		</m.header>
	);
}
