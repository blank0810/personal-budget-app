'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { type CacheTag } from '@/server/lib/cache-tags';

/**
 * Invalidate one or more cache tags in a single call.
 *
 * Usage:
 *   invalidateTags(CACHE_TAGS.INCOMES, CACHE_TAGS.ACCOUNTS, CACHE_TAGS.DASHBOARD);
 */
export async function invalidateTags(...tags: CacheTag[]) {
	for (const tag of tags) {
		revalidateTag(tag, 'max');
	}
}

// ---------------------------------------------------------------------------
// Legacy path-based invalidation (deprecated)
// ---------------------------------------------------------------------------

/**
 * @deprecated Prefer `invalidateTags()` with `CACHE_TAGS` constants instead.
 */
export async function clearCache(
	path: string = '/',
	type: 'page' | 'layout' = 'layout'
) {
	try {
		console.log(`[Cache] Clearing cache for path: ${path} (${type})`);
		revalidatePath(path, type);
		return { success: true, message: `Cache cleared for ${path}` };
	} catch (error) {
		console.error('[Cache] Error clearing cache:', error);
		return { success: false, message: 'Failed to clear cache' };
	}
}
