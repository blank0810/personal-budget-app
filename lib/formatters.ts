import { getCurrencyConfig } from './currency';

export function formatCurrency(
	value: number | undefined | null,
	options: { decimals?: number; currency?: string } = {}
): string {
	if (value === undefined || value === null) return '';

	const currencyCode = options.currency ?? 'USD';
	const config = getCurrencyConfig(currencyCode);

	return new Intl.NumberFormat(config.locale, {
		style: 'currency',
		currency: currencyCode,
		minimumFractionDigits: options.decimals ?? 2,
		maximumFractionDigits: options.decimals ?? 2,
	}).format(value);
}
