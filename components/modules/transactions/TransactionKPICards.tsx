'use client';

import { ArrowDownLeft, ArrowUpRight, TrendingUp, Calculator } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/lib/contexts/currency-context';

interface TransactionKPICardsProps {
	totalIncome: number;
	totalExpenses: number;
	netFlow: number;
	averageAmount: number;
	activeType?: string | null;
}

const CARDS = [
	{
		key: 'income',
		label: 'Total Income',
		icon: ArrowDownLeft,
		color: 'text-green-500',
		bgActive: 'ring-2 ring-green-500/50 bg-green-500/5',
		getValue: (p: TransactionKPICardsProps) => p.totalIncome,
		prefix: '+',
	},
	{
		key: 'expense',
		label: 'Total Expenses',
		icon: ArrowUpRight,
		color: 'text-red-500',
		bgActive: 'ring-2 ring-red-500/50 bg-red-500/5',
		getValue: (p: TransactionKPICardsProps) => p.totalExpenses,
		prefix: '-',
	},
	{
		key: 'netflow',
		label: 'Net Flow',
		icon: TrendingUp,
		color: 'text-blue-500',
		bgActive: 'ring-2 ring-blue-500/50 bg-blue-500/5',
		getValue: (p: TransactionKPICardsProps) => p.netFlow,
		// Maps to both transfer + payment types
		matchTypes: ['transfer', 'payment'],
	},
	{
		key: 'average',
		label: 'Average Amount',
		icon: Calculator,
		color: 'text-zinc-500',
		bgActive: 'ring-2 ring-zinc-500/50 bg-zinc-500/5',
		getValue: (p: TransactionKPICardsProps) => p.averageAmount,
	},
] as const;

export function TransactionKPICards(props: TransactionKPICardsProps) {
	const { formatCurrency } = useCurrency();
	const { activeType } = props;

	return (
		<div className='grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4'>
			{CARDS.map((card) => {
				const value = card.getValue(props);
				const isActive =
					activeType &&
					(('matchTypes' in card &&
						(card as { matchTypes?: readonly string[] }).matchTypes?.includes(activeType)) ||
						card.key === activeType);
				const Icon = card.icon;

				return (
					<Card
						key={card.key}
						className={cn(
							'flex flex-col gap-2 p-4 transition-all',
							isActive && card.bgActive
						)}
					>
						<div className='flex items-center justify-between'>
							<span className='text-xs font-medium text-muted-foreground'>
								{card.label}
							</span>
							<Icon className={cn('h-4 w-4', card.color)} />
						</div>
						<p className='text-xl font-bold tabular-nums sm:text-2xl'>
							{'prefix' in card && card.prefix && value > 0
								? card.prefix
								: ''}
							{formatCurrency(Math.abs(value))}
						</p>
					</Card>
				);
			})}
		</div>
	);
}
