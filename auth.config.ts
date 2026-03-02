import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';

/**
 * Edge-compatible auth config — NO Prisma imports allowed here.
 * This is used by middleware (Edge Runtime).
 * The full auth.ts extends this with Prisma-dependent callbacks.
 */
export default {
	providers: [
		Google({
			clientId: process.env.GOOGLE_CLIENT_ID,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
		}),
		// Credentials provider declared here for middleware awareness.
		// The actual `authorize` function is in auth.ts (Node-only).
		Credentials({
			credentials: {
				email: { label: 'Email', type: 'email' },
				password: { label: 'Password', type: 'password' },
			},
		}),
	],
	callbacks: {
		async jwt({ token, user, trigger, session }) {
			// On sign-in, the full auth.ts signIn callback has already
			// populated the DB. Here we just map user fields to the token.
			if (user) {
				const dbUser = user as { currency?: string; role?: string; isOnboarded?: boolean; isDisabled?: boolean };
				token.sub = user.id;
				token.currency = dbUser.currency ?? 'USD';
				token.role = dbUser.role ?? 'USER';
				token.isOnboarded = dbUser.isOnboarded ?? false;
				token.isDisabled = dbUser.isDisabled ?? false;
			}

			// Handle session updates (e.g., after onboarding completion)
			if (trigger === 'update' && session?.user) {
				if (session.user.isOnboarded !== undefined) {
					token.isOnboarded = session.user.isOnboarded;
				}
				if (session.user.currency !== undefined) {
					token.currency = session.user.currency;
				}
			}

			return token;
		},
		async session({ session, token }) {
			if (token.sub && session.user) {
				session.user.id = token.sub;
				session.user.currency = token.currency as string;
				session.user.role = token.role as string;
				session.user.isOnboarded = token.isOnboarded as boolean;
				session.user.isDisabled = token.isDisabled as boolean;
			}
			return session;
		},
	},
	pages: {
		signIn: '/login',
	},
	session: { strategy: 'jwt' },
} satisfies NextAuthConfig;
