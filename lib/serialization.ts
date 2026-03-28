import { Decimal } from '@prisma/client/runtime/library';

/**
 * Serializes data for client components in a single pass by converting:
 * - Prisma Decimal -> number
 * - Date -> ISO string (matches JSON.stringify behavior)
 * - undefined values in objects -> omitted (matches JSON.stringify behavior)
 * - null -> null (preserved)
 * - Primitives (string, number, boolean) -> passed through
 */

function isDecimal(value: unknown): value is Decimal {
	return (
		value instanceof Decimal ||
		(typeof value === 'object' &&
			value !== null &&
			(value as { constructor?: { name?: string } }).constructor?.name ===
				'Decimal' &&
			'd' in value &&
			'e' in value &&
			typeof (value as { e: unknown }).e === 'number')
	);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSerializable(value: unknown): any {
	if (value === null || value === undefined) {
		return null;
	}
	if (isDecimal(value)) {
		return Number(value);
	}
	if (value instanceof Date) {
		return value.toISOString();
	}
	if (Array.isArray(value)) {
		return value.map(toSerializable);
	}
	if (typeof value === 'object') {
		const result: Record<string, unknown> = {};
		for (const key of Object.keys(value)) {
			const v = (value as Record<string, unknown>)[key];
			// Omit undefined values to match JSON.stringify behavior
			if (v !== undefined) {
				result[key] = toSerializable(v);
			}
		}
		return result;
	}
	return value;
}

export function serialize<T>(data: T): T {
	return toSerializable(data);
}
