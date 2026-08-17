import { auth } from '@/auth';
import { AdminService } from '@/server/modules/admin/admin.service';

/**
 * Authenticate the current user and return their ID.
 * Throws if no valid session exists.
 */
export async function getAuthenticatedUser(): Promise<string> {
	const session = await auth();
	if (!session?.user?.id) throw new Error('Unauthorized');
	return session.user.id;
}

/**
 * Require an ADMIN role plus a live sudo re-authentication window.
 *
 * Returns a discriminated result rather than throwing, because admin server
 * actions surface the reason to the UI so it can prompt for re-auth.
 */
export async function requireAdminSession(): Promise<
	{ error: string; userId: '' } | { error: null; userId: string }
> {
	const session = await auth();
	if (!session?.user?.id) return { error: 'Not authenticated', userId: '' };

	const active = await AdminService.isAdminSessionActive(session.user.id);
	if (!active) return { error: 'Admin session expired', userId: '' };

	return { error: null, userId: session.user.id };
}
