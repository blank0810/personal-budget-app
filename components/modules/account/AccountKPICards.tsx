'use client';

import { Wallet, CreditCard, TrendingUp, Percent } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/lib/contexts/currency-context';

export interface AccountKPIData {
	totalBalance: number;
	totalDebt: number;
	netWorth: number;
	creditUtilization: number | null; // null if no credit accounts
}

interface AccountKPICardsProps extends AccountKPIData {}

const CARDS = [
	{
		key: 'netWorth',
		label: 'Net Worth',
		icon: TrendingUp,
		color: 'text-blue-500',
		iconBg: 'bg-blue-500/10',
		getValue: (p: AccountKPICardsProps) => p.netWorth,
		format: 'currency' as const,
	},
	{
		key: 'totalBalance',
		label: 'Total Balance',
		icon: Wallet,
		color: 'text-emerald-500',
		iconBg: 'bg-emerald-500/10',
		getValue: (p: AccountKPICardsProps) => p.totalBalance,
		format: 'currency' as const,
	},
	{
		key: 'totalDebt',
		label: 'Total Debt',
		icon: CreditCard,
		color: 'text-red-500',
		iconBg: 'bg-red-500/10',
		getValue: (p: AccountKPICardsProps) => p.totalDebt,
		format: 'currency' as const,
	},
	{
		key: 'creditUtilization',
		label: 'Credit Utilization',
		icon: Percent,
		color: 'text-orange-500',
		iconBg: 'bg-orange-500/10',
		getValue: (p: AccountKPICardsProps) => p.creditUtilization,
		format: 'percent' as const,
	},
] as const;

function getUtilizationColor(value: number): string {
	if (value >= 90) return 'text-red-600 dark:text-red-400';
	if (value >= 70) return 'text-orange-600 dark:text-orange-400';
	if (value >= 50) return 'text-yellow-600 dark:text-yellow-400';
	if (value >= 30) return 'text-blue-600 dark:text-blue-400';
	return 'text-emerald-600 dark:text-emerald-400';
}

export function AccountKPICards(props: AccountKPICardsProps) {
	const { formatCurrency } = useCurrency();

	return (
		<div className='grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4'>
			{CARDS.map((card) => {
				const value = card.getValue(props);
				const Icon = card.icon;

				return (
					<Card key={card.key} className='flex flex-col gap-2 p-4'>
						<div className='flex items-center justify-between'>
							<span className='text-xs font-medium text-muted-foreground'>
								{card.label}
							</span>
							<span
								className={cn(
									'flex h-8 w-8 items-center justify-center rounded-lg',
									card.iconBg
								)}
							>
								<Icon className={cn('h-4 w-4', card.color)} />
							</span>
						</div>
						{card.format === 'percent' ? (
							<p
								className={cn(
									'text-xl font-bold tabular-nums sm:text-2xl',
									value !== null
										? getUtilizationColor(value)
										: 'text-muted-foreground'
								)}
							>
								{value !== null ? `${Math.round(value)}%` : 'N/A'}
							</p>
						) : (
							<p className='text-xl font-bold tabular-nums sm:text-2xl'>
								{formatCurrency(value as number)}
							</p>
						)}
					</Card>
				);
			})}
		</div>
	);
}
