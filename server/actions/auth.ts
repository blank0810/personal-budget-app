'use server';

import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const registerSchema = z.object({
	name: z.string().min(2),
	email: z.string().email(),
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
