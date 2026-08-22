/** Round half-up to an integer. Number.prototype.toFixed and Math.round both
 * misbehave on negatives / exact ties, so this is explicit. */
export function roundHalfUp(value: number): number {
	const magnitude = Math.abs(value);
	const tieTolerance = magnitude * Number.EPSILON;
	const roundedMagnitude = Math.floor(magnitude + 0.5 + tieTolerance);
	return value < 0 ? -roundedMagnitude : roundedMagnitude;
}

/** A 2dp decimal (e.g. 100.55) as exact integer cents (10055). */
export function toCents(value: number): number {
	return roundHalfUp(value * 100);
}

/** Integer cents back to a 2dp number for display/storage (10055 -> 100.55). */
export function fromCents(cents: number): number {
	return cents / 100;
}

/** Snap a monetary value to the 2dp its decimal column can hold. */
export function roundMoney(value: number): number {
	return fromCents(toCents(value));
}

/** Calculate a percentage rounded half-up to 2dp after snapping both operands
 * to 2dp first. */
export function percentageOf(amount: number, percent: number): number {
	const resultCents = roundHalfUp(
		(toCents(amount) * toCents(percent)) / 10000
	);
	return fromCents(resultCents);
}
