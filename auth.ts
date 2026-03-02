import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from './lib/prisma';
import authConfig from './auth.config';

export const { handlers, signIn, signOut, auth, unstable_update } = NextAuth({
	...authConfig,
	providers: [
		// Keep Google from config as-is
		...authConfig.providers.filter(
			(p) => !('id' in p && p.id === 'credentials')
		),
		// Override Credentials with actual authorize function (needs Prisma)
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
		...authConfig.callbacks,
		async signIn({ user, account }) {
			if (account?.provider === 'google') {
				if (!user.email) return false;

				const existingUser = await prisma.user.findUnique({
					where: { email: user.email },
				});

				if (existingUser) {
					// Link Google account to existing user if not already linked
					const existingAccount =
						await prisma.authAccount.findUnique({
							where: {
								provider_providerAccountId: {
									provider: account.provider,
									providerAccountId:
										account.providerAccountId,
								},
							},
						});

					if (!existingAccount) {
						await prisma.authAccount.create({
							data: {
								userId: existingUser.id,
								type: account.type,
								provider: account.provider,
								providerAccountId:
									account.providerAccountId,
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
					? (
							await prisma.user.findUnique({
								where: { email: user.email },
								select: { id: true },
							})
						)?.id
					: user?.id;

			if (loginUserId) {
				await prisma.user.update({
					where: { id: loginUserId },
					data: { lastLoginAt: new Date() },
				});
			}

			return true;
		},
		async jwt({ token, user, account, trigger, session }) {
			// First, run the Edge-safe base jwt callback
			token = await (authConfig.callbacks?.jwt?.({
				token,
				user,
				account,
				trigger,
				session,
			} as Parameters<NonNullable<NonNullable<typeof authConfig.callbacks>['jwt']>>[0]) ?? token);

			// Enrich token with DB data at sign-in time (Node runtime only)
			if (account?.provider === 'google' && user?.email) {
				const dbUser = await prisma.user.findUnique({
					where: { email: user.email },
					select: {
						id: true,
						currency: true,
						role: true,
						isOnboarded: true,
						isDisabled: true,
					},
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
					select: {
						currency: true,
						role: true,
						isOnboarded: true,
						isDisabled: true,
					},
				});
				token.sub = user.id;
				token.currency = dbUser?.currency ?? 'USD';
				token.role = dbUser?.role ?? 'USER';
				token.isOnboarded = dbUser?.isOnboarded ?? false;
				token.isDisabled = dbUser?.isDisabled ?? false;
			}

			return token;
		},
	},
});
