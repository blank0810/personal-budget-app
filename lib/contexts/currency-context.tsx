'use client';

import { createContext, useContext } from 'react';
import { formatCurrency as formatCurrencyUtil } from '@/lib/formatters';

interface CurrencyContextType {
	currency: string;
	formatCurrency: (
		value: number | undefined | null,
		options?: { decimals?: number }
	) => string;
}

const CurrencyContext = createContext<CurrencyContextType>({
	currency: 'USD',
	formatCurrency: (value, options) =>
		formatCurrencyUtil(value, { ...options, currency: 'USD' }),
});

export function CurrencyProvider({
	currency,
	children,
}: {
	currency: string;
	children: React.ReactNode;
}) {
	const formatCurrency = (
		value: number | undefined | null,
		options?: { decimals?: number }
	) => formatCurrencyUtil(value, { ...options, currency });

	return (
		<CurrencyContext.Provider value={{ currency, formatCurrency }}>
			{children}
		</CurrencyContext.Provider>
	);
}

export function useCurrency() {
	return useContext(CurrencyContext);
}
