import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { RegisterInput } from './auth.types';

export class AuthService {
	/**
	 * Register a new user.
	 * Checks for existing user, hashes password, and creates the user record.
	 * Throws if the email is already taken.
	 */
	static async register(data: RegisterInput) {
		const { name, email, password } = data;

		const existingUser = await prisma.user.findUnique({
			where: { email },
		});

		if (existingUser) {
			throw new AuthError('User already exists');
		}

		const hashedPassword = await bcrypt.hash(password, 10);

		await prisma.user.create({
			data: {
				name,
				email,
				password: hashedPassword,
			},
		});
	}

	/**
	 * Create a password reset token for the given email.
	 * Deletes any existing tokens for the email before creating a new one.
	 * Returns { token, userName } if the user exists, or null if no user is found.
	 * Returning null (instead of throwing) allows the controller to always return
	 * the same message regardless of whether the email exists.
	 */
	static async createPasswordResetToken(email: string) {
		const user = await prisma.user.findUnique({ where: { email } });

		if (!user) {
			return null;
		}

		// Delete any existing tokens for this email
		await prisma.passwordResetToken.deleteMany({ where: { email } });

		const token = crypto.randomUUID();
		await prisma.passwordResetToken.create({
			data: {
				email,
				token,
				expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
			},
		});

		return { token, userName: user.name || 'there' };
	}

	/**
	 * Reset a user's password using a valid reset token.
	 * Validates the token, hashes the new password, updates the user,
	 * and deletes the token -- all in a single transaction.
	 * Throws AuthError if the token is invalid, expired, or the user is not found.
	 */
	static async resetPassword(token: string, newPassword: string) {
		const resetToken = await prisma.passwordResetToken.findUnique({
			where: { token },
		});

		if (!resetToken || resetToken.expiresAt < new Date()) {
			throw new AuthError(
				'Invalid or expired reset link. Please request a new one.'
			);
		}

		const user = await prisma.user.findUnique({
			where: { email: resetToken.email },
		});

		if (!user) {
			throw new AuthError(
				'Invalid or expired reset link. Please request a new one.'
			);
		}

		const hashedPassword = await bcrypt.hash(newPassword, 10);

		await prisma.$transaction([
			prisma.user.update({
				where: { id: user.id },
				data: { password: hashedPassword },
			}),
			prisma.passwordResetToken.delete({
				where: { id: resetToken.id },
			}),
		]);
	}
}

/**
 * Domain-specific error for auth operations.
 * Controllers can catch this to return user-facing error messages.
 */
export class AuthError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'AuthError';
	}
}
