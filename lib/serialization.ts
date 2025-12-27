import { Decimal } from '@prisma/client/runtime/library';

/**
 * Serializes data for client components by converting:
 * - Prisma Decimal -> number
 * - Date -> string (ISO)
 * - null/undefined -> null (preserved)
 */
export function serialize<T>(data: T): T {
	return JSON.parse(
		JSON.stringify(data, (key, value) => {
			if (typeof value === 'object' && value !== null) {
				if (
					value instanceof Decimal ||
					(typeof value === 'object' && 'd' in value && 'e' in value)
				) {
					return Number(value);
				}
			}
			return value;
		})
	);
}
