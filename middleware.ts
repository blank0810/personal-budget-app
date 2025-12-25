import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default async function middleware(req: NextRequest) {
	const session = await auth();
	const isAuthPage =
		req.nextUrl.pathname.startsWith('/login') ||
		req.nextUrl.pathname.startsWith('/register');

	if (isAuthPage) {
		if (session) {
			return NextResponse.redirect(new URL('/dashboard', req.url));
		}
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
