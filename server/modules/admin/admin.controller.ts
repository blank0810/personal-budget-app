'use server';

import { auth } from '@/auth';
import { AdminService } from './admin.service';
import { AdminUsersService } from './admin-users.service';
import { clearCache } from '@/server/actions/cache';

async function requireAdminSession() {
	const session = await auth();
	if (!session?.user?.id)
		return { error: 'Not authenticated' as const, userId: '' };
	const active = await AdminService.isAdminSessionActive(session.user.id);
	if (!active) return { error: 'Admin session expired' as const, userId: '' };
	return { error: null, userId: session.user.id };
}

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

// --- User Management Actions ---

export async function adminGetUsersAction(
	page: number = 1,
	search?: string,
	filters?: { role?: string; status?: string }
) {
	const { error } = await requireAdminSession();
	if (error) return { success: false, error };

	try {
		const result = await AdminUsersService.getUsers(page, search, filters);
		return { success: true, ...result };
	} catch (err) {
		return {
			success: false,
			error: err instanceof Error ? err.message : 'Failed to fetch users',
		};
	}
}

export async function adminGetUserDetailAction(userId: string) {
	const { error } = await requireAdminSession();
	if (error) return { success: false, error };

	try {
		const user = await AdminUsersService.getUserDetail(userId);
		return { success: true, user };
	} catch (err) {
		return {
			success: false,
			error:
				err instanceof Error ? err.message : 'Failed to fetch user detail',
		};
	}
}

export async function adminGetUserActivityAction(
	userId: string,
	limit: number = 20
) {
	const { error } = await requireAdminSession();
	if (error) return { success: false, error };

	try {
		const timeline = await AdminUsersService.getUserActivity(userId, limit);
		return { success: true, timeline };
	} catch (err) {
		return {
			success: false,
			error:
				err instanceof Error ? err.message : 'Failed to fetch activity',
		};
	}
}

export async function adminDisableUserAction(userId: string) {
	const { error } = await requireAdminSession();
	if (error) return { success: false, error };

	try {
		await AdminUsersService.disableUser(userId);
		await clearCache('/admin');
		return { success: true };
	} catch (err) {
		return {
			success: false,
			error:
				err instanceof Error ? err.message : 'Failed to disable user',
		};
	}
}

export async function adminEnableUserAction(userId: string) {
	const { error } = await requireAdminSession();
	if (error) return { success: false, error };

	try {
		await AdminUsersService.enableUser(userId);
		await clearCache('/admin');
		return { success: true };
	} catch (err) {
		return {
			success: false,
			error:
				err instanceof Error ? err.message : 'Failed to enable user',
		};
	}
}

export async function adminExportUserDataAction(userId: string) {
	const { error } = await requireAdminSession();
	if (error) return { success: false, error };

	try {
		const data = await AdminUsersService.exportUserData(userId);
		return { success: true, data };
	} catch (err) {
		return {
			success: false,
			error:
				err instanceof Error
					? err.message
					: 'Failed to export user data',
		};
	}
}
