import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from './lib/prisma';

// Basic NextAuth config for Credentials
export const { handlers, signIn, signOut, auth } = NextAuth({
	providers: [
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
					if (!user) return null;

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
		async session({ session, token }) {
			if (token.sub && session.user) {
				session.user.id = token.sub;
			}
			return session;
		},
	},
	session: { strategy: 'jwt' },
});
