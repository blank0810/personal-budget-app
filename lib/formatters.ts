export function formatCurrency(
	value: number | undefined | null,
	options: { decimals?: number } = {}
): string {
	if (value === undefined || value === null) return '';

	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: options.decimals ?? 2,
		maximumFractionDigits: options.decimals ?? 2,
	}).format(value);
}
