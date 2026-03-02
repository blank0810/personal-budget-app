import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const ADMIN_SESSION_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export class AdminService {
	static async verifyAndElevate(
		userId: string,
		password: string
	): Promise<{ success: boolean; error?: string }> {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { role: true, password: true },
		});

		if (!user || user.role !== 'ADMIN') {
			return { success: false, error: 'Unauthorized' };
		}

		if (!user.password) {
			return {
				success: false,
				error: 'Password auth not available. Use Google re-auth.',
			};
		}

		const valid = await bcrypt.compare(password, user.password);
		if (!valid) {
			return { success: false, error: 'Invalid password' };
		}

		await prisma.user.update({
			where: { id: userId },
			data: {
				adminSessionExpiresAt: new Date(
					Date.now() + ADMIN_SESSION_DURATION_MS
				),
			},
		});

		return { success: true };
	}

	static async elevateViaOAuth(
		userId: string
	): Promise<{ success: boolean; error?: string }> {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { role: true },
		});

		if (!user || user.role !== 'ADMIN') {
			return { success: false, error: 'Unauthorized' };
		}

		await prisma.user.update({
			where: { id: userId },
			data: {
				adminSessionExpiresAt: new Date(
					Date.now() + ADMIN_SESSION_DURATION_MS
				),
			},
		});

		return { success: true };
	}

	static async isAdminSessionActive(userId: string): Promise<boolean> {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { role: true, adminSessionExpiresAt: true },
		});

		if (!user || user.role !== 'ADMIN') return false;
		if (!user.adminSessionExpiresAt) return false;
		return user.adminSessionExpiresAt > new Date();
	}

	static async deactivateAdminSession(userId: string): Promise<void> {
		await prisma.user.update({
			where: { id: userId },
			data: { adminSessionExpiresAt: null },
		});
	}
}
