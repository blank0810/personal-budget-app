'use server';

import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { EmailService } from '@/server/modules/email/email.service';

const registerSchema = z.object({
	name: z.string().min(2),
	email: z.string().email(),
	password: z.string().min(6),
});

const requestResetSchema = z.object({
	email: z.string().email(),
});

const resetPasswordSchema = z.object({
	token: z.string().min(1),
	password: z.string().min(6),
});

export async function registerUser(data: z.infer<typeof registerSchema>) {
	const parsed = registerSchema.safeParse(data);

	if (!parsed.success) {
		return { error: 'Invalid input' };
	}

	const { name, email, password } = parsed.data;

	try {
		const existingUser = await prisma.user.findUnique({
			where: { email },
		});

		if (existingUser) {
			return { error: 'User already exists' };
		}

		const hashedPassword = await bcrypt.hash(password, 10);

		await prisma.user.create({
			data: {
				name,
				email,
				password: hashedPassword,
			},
		});

		return { success: true };
	} catch (error) {
		console.error('Registration error:', error);
		return { error: 'Failed to create user' };
	}
}

export async function requestPasswordReset(
	data: z.infer<typeof requestResetSchema>
) {
	const parsed = requestResetSchema.safeParse(data);
	if (!parsed.success) {
		return { error: 'Invalid email' };
	}

	const { email } = parsed.data;

	try {
		const user = await prisma.user.findUnique({ where: { email } });

		if (user) {
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

			await EmailService.sendPasswordReset({
				email,
				token,
				userName: user.name || 'there',
			});
		}

		// Always return the same message to avoid revealing email existence
		return {
			success: true,
			message: "If an account exists, we've sent a reset link.",
		};
	} catch (error) {
		console.error('Password reset request error:', error);
		return { error: 'Something went wrong. Please try again.' };
	}
}

export async function resetPassword(
	data: z.infer<typeof resetPasswordSchema>
) {
	const parsed = resetPasswordSchema.safeParse(data);
	if (!parsed.success) {
		return { error: 'Invalid input' };
	}

	const { token, password } = parsed.data;

	try {
		const resetToken = await prisma.passwordResetToken.findUnique({
			where: { token },
		});

		if (!resetToken || resetToken.expiresAt < new Date()) {
			return { error: 'Invalid or expired reset link. Please request a new one.' };
		}

		const user = await prisma.user.findUnique({
			where: { email: resetToken.email },
		});

		if (!user) {
			return { error: 'Invalid or expired reset link. Please request a new one.' };
		}

		const hashedPassword = await bcrypt.hash(password, 10);

		await prisma.$transaction([
			prisma.user.update({
				where: { id: user.id },
				data: { password: hashedPassword },
			}),
			prisma.passwordResetToken.delete({
				where: { id: resetToken.id },
			}),
		]);

		return { success: true };
	} catch (error) {
		console.error('Password reset error:', error);
		return { error: 'Something went wrong. Please try again.' };
	}
}
