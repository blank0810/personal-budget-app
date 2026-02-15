import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default async function middleware(req: NextRequest) {
	const session = await auth();
	const { pathname } = req.nextUrl;

	const isAuthPage =
		pathname.startsWith('/login') ||
		pathname.startsWith('/register') ||
		pathname.startsWith('/forgot-password') ||
		pathname.startsWith('/reset-password');

	const isPublicPage = isAuthPage || pathname.startsWith('/changelog');

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

	return NextResponse.next();
}

export const config = {
	matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
