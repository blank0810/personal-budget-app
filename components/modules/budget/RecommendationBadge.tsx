'use client';

import { TrendingUp, TrendingDown, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCurrency } from '@/lib/contexts/currency-context';
import { cn } from '@/lib/utils';

interface RecommendationBadgeProps {
	recommendation: 'increase' | 'decrease' | 'stable';
	suggestedAmount: number | null;
	currentAmount: number;
	trend?: string;
	onApply?: (amount: number) => void;
}

const config = {
	increase: {
		label: 'Increase',
		icon: TrendingUp,
		className: 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200',
	},
	decrease: {
		label: 'Decrease',
		icon: TrendingDown,
		className: 'bg-sky-100 text-sky-700 hover:bg-sky-200 border-sky-200',
	},
	stable: {
		label: 'Stable',
		icon: Check,
		className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200',
	},
};

export function RecommendationBadge({
	recommendation,
	suggestedAmount,
	currentAmount,
	trend,
	onApply,
}: RecommendationBadgeProps) {
	const { formatCurrency } = useCurrency();
	const { label, icon: Icon, className } = config[recommendation];
	const hasSuggestion = suggestedAmount !== null && suggestedAmount !== currentAmount;
	const diff = suggestedAmount ? suggestedAmount - currentAmount : 0;

	const badge = (
		<Badge
			variant="outline"
			className={cn(
				'gap-1 cursor-default transition-colors',
				className,
				hasSuggestion && onApply && 'cursor-pointer'
			)}
			onClick={() => {
				if (hasSuggestion && onApply && suggestedAmount) {
					onApply(suggestedAmount);
				}
			}}
		>
			<Icon className="h-3 w-3" />
			<span className="text-xs font-medium">{label}</span>
		</Badge>
	);

	if (!trend && !hasSuggestion) {
		return badge;
	}

	return (
		<TooltipProvider>
			<Tooltip delayDuration={200}>
				<TooltipTrigger asChild>{badge}</TooltipTrigger>
				<TooltipContent side="top" className="max-w-[200px]">
					<div className="space-y-1 text-xs">
						{trend && <p className="text-muted-foreground">{trend}</p>}
						{hasSuggestion && (
							<p className="font-medium">
								Suggested: {formatCurrency(suggestedAmount!)}
								<span className={cn(
									'ml-1',
									diff > 0 ? 'text-amber-600' : 'text-sky-600'
								)}>
									({diff > 0 ? '+' : ''}{formatCurrency(diff)})
								</span>
							</p>
						)}
						{hasSuggestion && onApply && (
							<p className="text-muted-foreground italic">Click to apply</p>
						)}
					</div>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
