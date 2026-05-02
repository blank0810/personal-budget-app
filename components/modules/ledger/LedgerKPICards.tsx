'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/lib/contexts/currency-context';
import type { LedgerKpiSnapshot } from '@/server/modules/ledger/ledger.types';

interface LedgerKPICardsProps {
	kpi: LedgerKpiSnapshot;
}

export function LedgerKPICards({ kpi }: LedgerKPICardsProps) {
	const { formatCurrency } = useCurrency();

	const cards = [
		{
			label: 'Total Assets',
			value: kpi.totalAssets,
			delta: kpi.deltaAssets,
			positiveIsGood: true,
		},
		{
			label: 'Total Liabilities',
			value: kpi.totalLiabilities,
			delta: kpi.deltaLiabilities,
			positiveIsGood: false,
		},
		{
			label: 'Net Worth',
			value: kpi.netWorth,
			delta: kpi.deltaNetWorth,
			positiveIsGood: true,
		},
	] as const;

	return (
		<div className='grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4'>
			{cards.map((card) => {
				const deltaPositive = card.delta > 0;
				const deltaZero = card.delta === 0;
				const isGood = card.positiveIsGood ? deltaPositive : !deltaPositive;
				const DeltaIcon = deltaZero ? Minus : deltaPositive ? TrendingUp : TrendingDown;

				return (
					<Card key={card.label} className='flex flex-col gap-1 p-4'>
						<CardHeader className='p-0'>
							<CardTitle className='text-xs font-medium text-muted-foreground'>
								{card.label}
							</CardTitle>
						</CardHeader>
						<CardContent className='p-0 space-y-1'>
							<p className='text-2xl font-bold tabular-nums'>
								{formatCurrency(card.value)}
							</p>
							{!deltaZero && (
								<div
									className={cn(
										'flex items-center gap-1 text-xs tabular-nums',
										isGood
											? 'text-green-600 dark:text-green-400'
											: 'text-red-600 dark:text-red-400'
									)}
								>
									<DeltaIcon className='h-3 w-3 shrink-0' />
									<span>
										{card.delta > 0 ? '+' : ''}
										{formatCurrency(card.delta)} this window
									</span>
								</div>
							)}
							{deltaZero && (
								<p className='text-xs text-muted-foreground'>No change this window</p>
							)}
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}
