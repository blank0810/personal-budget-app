/**
 * Invoice arithmetic uses integer cents rather than IEEE-754 floats so every
 * value written to a 2dp decimal column is rounded once and stays reproducible.
 */

/** Round half-up to an integer. Number.prototype.toFixed and Math.round both
 * misbehave on negatives / exact ties, so this is explicit. */
function roundHalfUp(value: number): number {
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

/** amount = quantity x unitPrice, rounded half-up to 2dp. */
export function lineAmount(quantity: number, unitPrice: number): number {
	const amountCents = roundHalfUp(
		(toCents(quantity) * toCents(unitPrice)) / 100
	);
	return fromCents(amountCents);
}

/** The canonical invoice totals. Returns 2dp numbers that satisfy
 * subtotal + taxAmount === totalAmount exactly. */
export function computeInvoiceTotals(
	lineItems: { amount: number }[],
	taxRate: number
): { subtotal: number; taxAmount: number; totalAmount: number } {
	const subtotalCents = lineItems.reduce(
		(sum, item) => sum + toCents(item.amount),
		0
	);
	const taxCents = roundHalfUp(
		(subtotalCents * toCents(normalizeTaxRate(taxRate))) / 10000
	);
	// Valid Decimal(12,2) invoice values stay far below Number.MAX_SAFE_INTEGER.
	const totalCents = subtotalCents + taxCents;

	return {
		subtotal: fromCents(subtotalCents),
		taxAmount: fromCents(taxCents),
		totalAmount: fromCents(totalCents),
	};
}

/** taxRate clamped to the 2dp the Decimal(5,2) column can actually hold. */
export function normalizeTaxRate(rate: number): number {
	return fromCents(toCents(rate));
}
