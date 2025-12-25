'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

/**
 * clearCache
 *
 * Revalidates the cache for a specific path or tag.
 * Defaults to revalidating the entire root layout to ensure fresh data everywhere.
 *
 * @param path The path to revalidate (default: '/')
 * @param type The type of revalidation: 'page' or 'layout' (default: 'layout')
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
