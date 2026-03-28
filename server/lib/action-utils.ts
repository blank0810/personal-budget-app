/**
 * Utility for server action input preprocessing.
 *
 * When a client passes a plain object to a server action, Next.js serializes
 * it to JSON. Date objects become ISO strings. This helper coerces known date
 * fields back to Date objects before Zod validation so that schemas can keep
 * using z.date() (which is compatible with @hookform/resolvers/zod on the
 * client side) without needing z.coerce.date() (which breaks react-hook-form
 * type inference).
 */

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

/**
 * Coerce ISO date strings to Date objects in a shallow plain object.
 * Only processes top-level string values that look like ISO timestamps.
 *
 * Usage in controllers:
 *   const parsed = schema.safeParse(coerceDateFields(data));
 */
export function coerceDateFields(data: unknown): unknown {
	if (data === null || data === undefined || typeof data !== 'object') {
		return data;
	}

	// Don't process arrays, FormData, or class instances
	if (Array.isArray(data) || !(data.constructor === Object)) {
		return data;
	}

	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
		if (typeof value === 'string' && ISO_DATE_REGEX.test(value)) {
			const parsed = new Date(value);
			// Only coerce if the result is a valid date
			result[key] = isNaN(parsed.getTime()) ? value : parsed;
		} else {
			result[key] = value;
		}
	}
	return result;
}
