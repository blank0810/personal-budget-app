'use server';

import { z } from 'zod';
import { EmailService } from '@/server/modules/email/email.service';
import { AuthService, AuthError } from '@/server/modules/auth/auth.service';
import {
	registerSchema,
	requestResetSchema,
	resetPasswordSchema,
} from '@/server/modules/auth/auth.types';

export async function registerUser(data: z.infer<typeof registerSchema>) {
	const parsed = registerSchema.safeParse(data);

	if (!parsed.success) {
		return { error: 'Invalid input' };
	}

	try {
		await AuthService.register(parsed.data);
		return { success: true };
	} catch (error) {
		if (error instanceof AuthError) {
			return { error: error.message };
		}
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
		const result = await AuthService.createPasswordResetToken(email);

		if (result) {
			await EmailService.sendPasswordReset({
				email,
				token: result.token,
				userName: result.userName,
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
		await AuthService.resetPassword(token, password);
		return { success: true };
	} catch (error) {
		if (error instanceof AuthError) {
			return { error: error.message };
		}
		console.error('Password reset error:', error);
		return { error: 'Something went wrong. Please try again.' };
	}
}
