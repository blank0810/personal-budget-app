'use server';

import { auth } from '@/auth';
import { AdminService } from './admin.service';
import { AdminUsersService } from './admin-users.service';
import { AdminContentService } from './admin-content.service';
import { invalidateTags } from '@/server/actions/cache';
import { CACHE_TAGS } from '@/server/lib/cache-tags';
import { serialize } from '@/lib/serialization';

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
		return { error: 'Not authenticated' };

	const result = await AdminService.verifyAndElevate(
		session.user.id,
		password
	);
	if ('success' in result) invalidateTags(CACHE_TAGS.ADMIN);
	return result;
}

export async function adminReauthOAuth() {
	const session = await auth();
	if (!session?.user?.id)
		return { error: 'Not authenticated' };

	const result = await AdminService.elevateViaOAuth(session.user.id);
	if ('success' in result) invalidateTags(CACHE_TAGS.ADMIN);
	return result;
}

export async function exitAdminMode() {
	const session = await auth();
	if (!session?.user?.id)
		return { error: 'Not authenticated' };

	await AdminService.deactivateAdminSession(session.user.id);
	invalidateTags(CACHE_TAGS.ADMIN);
	return { success: true as const };
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
	if (error) return { error };

	try {
		const result = await AdminUsersService.getUsers(page, search, filters);
		return { success: true as const, data: result };
	} catch (err) {
		return {
			error: err instanceof Error ? err.message : 'Failed to fetch users',
		};
	}
}

export async function adminGetUserDetailAction(userId: string) {
	const { error } = await requireAdminSession();
	if (error) return { error };

	try {
		const user = await AdminUsersService.getUserDetail(userId);
		return { success: true as const, data: { user: serialize(user) } };
	} catch (err) {
		return {
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
	if (error) return { error };

	try {
		const timeline = await AdminUsersService.getUserActivity(userId, limit);
		return { success: true as const, data: { timeline: serialize(timeline) } };
	} catch (err) {
		return {
			error:
				err instanceof Error ? err.message : 'Failed to fetch activity',
		};
	}
}

export async function adminDisableUserAction(userId: string) {
	const { error } = await requireAdminSession();
	if (error) return { error };

	try {
		await AdminUsersService.disableUser(userId);
		invalidateTags(CACHE_TAGS.ADMIN);
		return { success: true as const };
	} catch (err) {
		return {
			error:
				err instanceof Error ? err.message : 'Failed to disable user',
		};
	}
}

export async function adminEnableUserAction(userId: string) {
	const { error } = await requireAdminSession();
	if (error) return { error };

	try {
		await AdminUsersService.enableUser(userId);
		invalidateTags(CACHE_TAGS.ADMIN);
		return { success: true as const };
	} catch (err) {
		return {
			error:
				err instanceof Error ? err.message : 'Failed to enable user',
		};
	}
}

export async function adminExportUserDataAction(userId: string) {
	const { error } = await requireAdminSession();
	if (error) return { error };

	try {
		const data = await AdminUsersService.exportUserData(userId);
		return { success: true as const, data };
	} catch (err) {
		return {
			error:
				err instanceof Error
					? err.message
					: 'Failed to export user data',
		};
	}
}

// --- Content Management Actions ---

export async function adminGetFeatureRequestsAction(
	page: number = 1,
	status?: string,
	category?: string
) {
	const { error } = await requireAdminSession();
	if (error) return { error };

	try {
		const result = await AdminContentService.getFeatureRequests(
			page,
			status,
			category
		);
		return { success: true as const, data: result };
	} catch (err) {
		return {
			error:
				err instanceof Error
					? err.message
					: 'Failed to fetch feature requests',
		};
	}
}

export async function adminUpdateFeatureRequestAction(
	id: string,
	status: string,
	adminNotes?: string
) {
	const { error } = await requireAdminSession();
	if (error) return { error };

	try {
		await AdminContentService.updateFeatureRequestStatus(
			id,
			status,
			adminNotes
		);
		return { success: true as const };
	} catch (err) {
		return {
			error:
				err instanceof Error
					? err.message
					: 'Failed to update feature request',
		};
	}
}

export async function adminGetFeatureFlagsAction() {
	const { error } = await requireAdminSession();
	if (error) return { error };

	try {
		const flags = await AdminContentService.getFeatureFlags();
		return { success: true as const, data: { flags } };
	} catch (err) {
		return {
			error:
				err instanceof Error
					? err.message
					: 'Failed to fetch feature flags',
		};
	}
}

export async function adminToggleFeatureFlagAction(
	key: string,
	enabled: boolean
) {
	const { error } = await requireAdminSession();
	if (error) return { error };

	try {
		await AdminContentService.toggleFeatureFlag(key, enabled);
		return { success: true as const };
	} catch (err) {
		return {
			error:
				err instanceof Error
					? err.message
					: 'Failed to toggle feature flag',
		};
	}
}
