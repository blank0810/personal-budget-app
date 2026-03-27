import { Decimal } from '@prisma/client/runtime/library';

/**
 * Serializes data for client components by converting:
 * - Prisma Decimal -> number
 * - null/undefined -> null (preserved)
 *
 * IMPORTANT: We must walk the object tree before JSON.stringify because
 * Decimal.prototype.toJSON() returns a string. When JSON.stringify encounters
 * a Decimal, it calls toJSON() first — before the replacer — so the replacer
 * only ever sees a string like "8.00", never the Decimal instance. By pre-walking
 * the tree and replacing Decimals with plain numbers ourselves, we ensure the
 * values come out of JSON.parse as numbers rather than strings.
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
function convertDecimals(value: unknown): any {
	if (isDecimal(value)) {
		return Number(value);
	}
	if (Array.isArray(value)) {
		return value.map(convertDecimals);
	}
	if (typeof value === 'object' && value !== null) {
		const result: Record<string, unknown> = {};
		for (const key of Object.keys(value)) {
			result[key] = convertDecimals((value as Record<string, unknown>)[key]);
		}
		return result;
	}
	return value;
}

export function serialize<T>(data: T): T {
	return JSON.parse(JSON.stringify(convertDecimals(data)));
}
