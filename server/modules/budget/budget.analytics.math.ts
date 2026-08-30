import { Prisma } from '@prisma/client';

export function getDecimalMedian(values: Prisma.Decimal[]): Prisma.Decimal {
	if (values.length === 0) {
		throw new Error('Cannot calculate a median without values');
	}

	const sorted = [...values].sort((a, b) => a.comparedTo(b));
	const middle = Math.floor(sorted.length / 2);
	if (sorted.length % 2 === 1) {
		return sorted[middle];
	}

	return sorted[middle - 1].plus(sorted[middle]).dividedBy(2);
}
