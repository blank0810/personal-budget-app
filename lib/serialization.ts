import { Decimal } from '@prisma/client/runtime/library';

/**
 * Serializes data for client components by converting:
 * - Prisma Decimal -> number

 * - null/undefined -> null (preserved)
 */
export function serialize<T>(data: T): T {
	return JSON.parse(
		JSON.stringify(data, (key, value) => {
			if (typeof value === 'object' && value !== null) {
				if (
					value instanceof Decimal ||
					(value.constructor?.name === 'Decimal' &&
						'd' in value &&
						'e' in value &&
						typeof value.e === 'number')
				) {
					return Number(value);
				}
			}
			return value;
		})
	);
}
