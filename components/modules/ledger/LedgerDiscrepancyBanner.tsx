'use client';

import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCurrency } from '@/lib/contexts/currency-context';

interface LedgerDiscrepancyBannerProps {
	discrepancy: {
		assetsDiff: number;
		liabilitiesDiff: number;
	};
}

export function LedgerDiscrepancyBanner({ discrepancy }: LedgerDiscrepancyBannerProps) {
	const { formatCurrency } = useCurrency();

	return (
		<Alert variant='destructive'>
			<AlertTriangle className='h-4 w-4' />
			<AlertTitle>Ledger out of sync — please contact support.</AlertTitle>
			<AlertDescription>
				<span className='text-xs text-destructive/80 tabular-nums'>
					Assets diff: {formatCurrency(Math.abs(discrepancy.assetsDiff))} &middot;{' '}
					Liabilities diff: {formatCurrency(Math.abs(discrepancy.liabilitiesDiff))}
				</span>
			</AlertDescription>
		</Alert>
	);
}
