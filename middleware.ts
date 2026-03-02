import NextAuth from 'next-auth';
import authConfig from '@/auth.config';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Session } from 'next-auth';

const { auth } = NextAuth(authConfig);

export default auth(async function middleware(req: NextRequest & { auth: Session | null }) {
	const session = req.auth;
	const { pathname } = req.nextUrl;

	const isAuthPage =
		pathname.startsWith('/login') ||
		pathname.startsWith('/register') ||
		pathname.startsWith('/forgot-password') ||
		pathname.startsWith('/reset-password');

	const isPublicPage =
		isAuthPage || pathname.startsWith('/changelog') || pathname === '/';
	const isOnboardingPage = pathname.startsWith('/onboarding');
	const isAdminPage = pathname.startsWith('/admin');

	// Redirect authenticated users away from auth pages (not changelog)
	if (isAuthPage && session) {
		return NextResponse.redirect(new URL('/dashboard', req.url));
	}

	// Allow public pages without auth
	if (isPublicPage) {
		return NextResponse.next();
	}

	// Protect all other routes
	if (!session) {
		return NextResponse.redirect(new URL('/login', req.url));
	}

	// Block disabled users
	if (session.user.isDisabled) {
		return NextResponse.redirect(
			new URL('/login?error=disabled', req.url)
		);
	}

	// Onboarding redirect: if not onboarded, force to onboarding
	if (!session.user.isOnboarded && !isOnboardingPage) {
		return NextResponse.redirect(new URL('/onboarding', req.url));
	}

	// If already onboarded, don't let them go back to onboarding
	if (session.user.isOnboarded && isOnboardingPage) {
		return NextResponse.redirect(new URL('/dashboard', req.url));
	}

	// Admin routes require ADMIN role (sudo check happens in admin layout)
	if (isAdminPage && session.user.role !== 'ADMIN') {
		return NextResponse.redirect(new URL('/dashboard', req.url));
	}

	return NextResponse.next();
});

export const config = {
	matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
