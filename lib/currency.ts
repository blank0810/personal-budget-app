export const SUPPORTED_CURRENCIES = [
	{ code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US' },
	{ code: 'PHP', name: 'Philippine Peso', symbol: '₱', locale: 'en-PH' },
	{ code: 'EUR', name: 'Euro', symbol: '€', locale: 'en-IE' },
	{ code: 'GBP', name: 'British Pound', symbol: '£', locale: 'en-GB' },
	{ code: 'JPY', name: 'Japanese Yen', symbol: '¥', locale: 'ja-JP' },
	{ code: 'AUD', name: 'Australian Dollar', symbol: 'A$', locale: 'en-AU' },
	{ code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', locale: 'en-CA' },
	{ code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', locale: 'en-SG' },
	{ code: 'KRW', name: 'South Korean Won', symbol: '₩', locale: 'ko-KR' },
	{ code: 'INR', name: 'Indian Rupee', symbol: '₹', locale: 'en-IN' },
	{ code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', locale: 'ms-MY' },
	{ code: 'THB', name: 'Thai Baht', symbol: '฿', locale: 'th-TH' },
	{ code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', locale: 'id-ID' },
	{ code: 'BRL', name: 'Brazilian Real', symbol: 'R$', locale: 'pt-BR' },
	{ code: 'MXN', name: 'Mexican Peso', symbol: 'MX$', locale: 'es-MX' },
	{ code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', locale: 'ar-AE' },
	{ code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', locale: 'ar-SA' },
	{ code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', locale: 'en-NZ' },
	{ code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', locale: 'de-CH' },
	{ code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', locale: 'en-HK' },
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]['code'];

export function getCurrencyConfig(code: string) {
	return (
		SUPPORTED_CURRENCIES.find((c) => c.code === code) ??
		SUPPORTED_CURRENCIES[0]
	);
}
