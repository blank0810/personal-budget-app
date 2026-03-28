import { auth } from '@/auth';

/**
 * Authenticate the current user and return their ID.
 * Throws if no valid session exists.
 */
export async function getAuthenticatedUser(): Promise<string> {
	const session = await auth();
	if (!session?.user?.id) throw new Error('Unauthorized');
	return session.user.id;
}
