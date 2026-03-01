import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from './lib/prisma';

export const { handlers, signIn, signOut, auth } = NextAuth({
	providers: [
		Google({
			clientId: process.env.GOOGLE_CLIENT_ID,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
		}),
		Credentials({
			credentials: {
				email: { label: 'Email', type: 'email' },
				password: { label: 'Password', type: 'password' },
			},
			authorize: async (credentials) => {
				const parsedCredentials = z
					.object({
						email: z.string().email(),
						password: z.string().min(6),
					})
					.safeParse(credentials);

				if (parsedCredentials.success) {
					const { email, password } = parsedCredentials.data;
					const user = await prisma.user.findUnique({
						where: { email },
					});
					if (!user || !user.password) return null;

					const passwordsMatch = await bcrypt.compare(
						password,
						user.password
					);
					if (passwordsMatch) return user;
				}

				return null;
			},
		}),
	],
	callbacks: {
		async signIn({ user, account }) {
			if (account?.provider === 'google') {
				if (!user.email) return false;

				const existingUser = await prisma.user.findUnique({
					where: { email: user.email },
				});

				if (existingUser) {
					// Link Google account to existing user if not already linked
					const existingAccount = await prisma.authAccount.findUnique({
						where: {
							provider_providerAccountId: {
								provider: account.provider,
								providerAccountId: account.providerAccountId,
							},
						},
					});

					if (!existingAccount) {
						await prisma.authAccount.create({
							data: {
								userId: existingUser.id,
								type: account.type,
								provider: account.provider,
								providerAccountId: account.providerAccountId,
								refresh_token: account.refresh_token,
								access_token: account.access_token,
								expires_at: account.expires_at,
								token_type: account.token_type,
								scope: account.scope,
								id_token: account.id_token,
							},
						});
					}
				} else {
					// Create new user + link account
					const newUser = await prisma.user.create({
						data: {
							email: user.email,
							name: user.name,
						},
					});

					await prisma.authAccount.create({
						data: {
							userId: newUser.id,
							type: account.type,
							provider: account.provider,
							providerAccountId: account.providerAccountId,
							refresh_token: account.refresh_token,
							access_token: account.access_token,
							expires_at: account.expires_at,
							token_type: account.token_type,
							scope: account.scope,
							id_token: account.id_token,
						},
					});
				}
			}

			// Track last login
			const loginUserId =
				account?.provider === 'google' && user?.email
					? (await prisma.user.findUnique({ where: { email: user.email }, select: { id: true } }))?.id
					: user?.id;

			if (loginUserId) {
				await prisma.user.update({
					where: { id: loginUserId },
					data: { lastLoginAt: new Date() },
				});
			}

			return true;
		},
		async jwt({ token, user, account }) {
			if (account?.provider === 'google' && user?.email) {
				// For Google sign-in, look up the actual DB user ID
				const dbUser = await prisma.user.findUnique({
					where: { email: user.email },
					select: { id: true, currency: true, role: true, isOnboarded: true, isDisabled: true },
				});
				if (dbUser) {
					token.sub = dbUser.id;
					token.currency = dbUser.currency;
					token.role = dbUser.role;
					token.isOnboarded = dbUser.isOnboarded;
					token.isDisabled = dbUser.isDisabled;
				}
			} else if (user) {
				const dbUser = await prisma.user.findUnique({
					where: { id: user.id },
					select: { currency: true, role: true, isOnboarded: true, isDisabled: true },
				});
				token.sub = user.id;
				token.currency = dbUser?.currency ?? 'USD';
				token.role = dbUser?.role ?? 'USER';
				token.isOnboarded = dbUser?.isOnboarded ?? false;
				token.isDisabled = dbUser?.isDisabled ?? false;
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
});
