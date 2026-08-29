'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { THEME_KEY } from './nav-links';

const useIsoLayoutEffect =
	typeof window === 'undefined' ? useEffect : useLayoutEffect;

type Theme = 'light' | 'dark';

/**
 * ThemeToggle — the public site's most-used control, so it gets the
 * best motion in the system.
 *
 * Browsers with the View Transitions API get a circular wipe that
 * originates at the button itself, so the change reads as caused by the
 * visitor rather than as a flash. Everything else falls back to a brief
 * token cross-fade, applied via a class that removes itself — leaving
 * those transitions permanently on would tax every hover and scroll for
 * the sake of one control. Reduced motion gets a straight swap.
 *
 * The glyph state is read from the DOM before paint, because the
 * no-flash script in the layout has already set the attribute; deriving
 * it from React state alone would flash the wrong icon on first render.
 */
export function ThemeToggle() {
	const [theme, setTheme] = useState<Theme>('dark');

	useIsoLayoutEffect(() => {
		const attr = document.documentElement.getAttribute('data-in-theme');
		setTheme(attr === 'light' ? 'light' : 'dark');
	}, []);

	const apply = useCallback((next: Theme) => {
		document.documentElement.setAttribute('data-in-theme', next);
		setTheme(next);
		try {
			localStorage.setItem(THEME_KEY, next);
		} catch {
			/* Storage can be blocked; the attribute swap still works. */
		}
	}, []);

	const onClick = useCallback(
		(event: React.MouseEvent<HTMLButtonElement>) => {
			const root = document.documentElement;
			const next: Theme =
				root.getAttribute('data-in-theme') === 'dark' ? 'light' : 'dark';

			const reduced = window.matchMedia(
				'(prefers-reduced-motion: reduce)',
			).matches;

			if (reduced) {
				apply(next);
				return;
			}

			const startViewTransition = (
				document as Document & {
					startViewTransition?: (cb: () => void) => { ready: Promise<void> };
				}
			).startViewTransition;

			if (typeof startViewTransition !== 'function') {
				root.classList.add('theming');
				apply(next);
				window.setTimeout(() => root.classList.remove('theming'), 460);
				return;
			}

			const rect = event.currentTarget.getBoundingClientRect();
			const x = rect.left + rect.width / 2;
			const y = rect.top + rect.height / 2;
			const radius = Math.hypot(
				Math.max(x, window.innerWidth - x),
				Math.max(y, window.innerHeight - y),
			);

			startViewTransition.call(document, () => apply(next)).ready.then(() => {
				root.animate(
					{
						clipPath: [
							`circle(0px at ${x}px ${y}px)`,
							`circle(${radius}px at ${x}px ${y}px)`,
						],
					},
					{
						duration: 560,
						easing: 'cubic-bezier(.16,1,.3,1)',
						pseudoElement: '::view-transition-new(root)',
					},
				);
			});
		},
		[apply],
	);

	/* Follow the OS while the visitor has not made an explicit choice. */
	useEffect(() => {
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const onChange = (e: MediaQueryListEvent) => {
			try {
				if (localStorage.getItem(THEME_KEY)) return;
			} catch {
				return;
			}
			const next: Theme = e.matches ? 'dark' : 'light';
			document.documentElement.setAttribute('data-in-theme', next);
			setTheme(next);
		};
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	}, []);

	return (
		<button
			type='button'
			className='toggle'
			onClick={onClick}
			aria-label={
				theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
			}
		>
			<svg
				className='i-sun'
				viewBox='0 0 24 24'
				fill='none'
				stroke='currentColor'
				strokeWidth='1.7'
				strokeLinecap='round'
				aria-hidden='true'
			>
				<circle cx='12' cy='12' r='4.2' />
				<path d='M12 2.2v2.4M12 19.4v2.4M4.1 4.1l1.7 1.7M18.2 18.2l1.7 1.7M2.2 12h2.4M19.4 12h2.4M4.1 19.9l1.7-1.7M18.2 5.8l1.7-1.7' />
			</svg>
			<svg
				className='i-moon'
				viewBox='0 0 24 24'
				fill='none'
				stroke='currentColor'
				strokeWidth='1.7'
				strokeLinecap='round'
				strokeLinejoin='round'
				aria-hidden='true'
			>
				<path d='M20.5 14.6A8.6 8.6 0 1 1 9.4 3.5a6.9 6.9 0 0 0 11.1 11.1Z' />
			</svg>
		</button>
	);
}
