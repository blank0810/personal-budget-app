'use client';

import { SessionProvider } from 'next-auth/react';

/**
 * Thin client wrapper that makes next-auth's useSession available to
 * landing components without turning the (public) layout (which exports
 * `metadata`) into a client component.
 *
 * Pattern mirrors LazyMotionProvider — the server layout nests both.
 * No session value is passed here; the provider fetches it client-side
 * so the page itself stays statically rendered and SEO-safe.
 */
export function LandingSessionProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	return <SessionProvider>{children}</SessionProvider>;
}
