/**
 * Unified return type for all server action controllers.
 *
 * Every exported server action should return ActionResponse<T>:
 *   - Success: { success: true } or { success: true, data: T }
 *   - Error:   { error: string }
 *
 * This aligns with the useServerAction hook expectation:
 *   { error: string } | { success: true; data?: T }
 */
export type ActionResponse<T = void> =
	| { success: true; data?: T }
	| { error: string };
