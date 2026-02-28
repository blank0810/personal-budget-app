'use server';

import { auth } from '@/auth';
import { AdminService } from './admin.service';
import { clearCache } from '@/server/actions/cache';

export async function adminReauth(password: string) {
	const session = await auth();
	if (!session?.user?.id)
		return { success: false, error: 'Not authenticated' };

	const result = await AdminService.verifyAndElevate(
		session.user.id,
		password
	);
	if (result.success) await clearCache('/admin', 'layout');
	return result;
}

export async function adminReauthOAuth() {
	const session = await auth();
	if (!session?.user?.id)
		return { success: false, error: 'Not authenticated' };

	const result = await AdminService.elevateViaOAuth(session.user.id);
	if (result.success) await clearCache('/admin', 'layout');
	return result;
}

export async function exitAdminMode() {
	const session = await auth();
	if (!session?.user?.id)
		return { success: false, error: 'Not authenticated' };

	await AdminService.deactivateAdminSession(session.user.id);
	await clearCache('/admin', 'layout');
	return { success: true };
}

export async function checkAdminSession() {
	const session = await auth();
	if (!session?.user?.id) return { active: false };
	const active = await AdminService.isAdminSessionActive(session.user.id);
	return { active };
}
