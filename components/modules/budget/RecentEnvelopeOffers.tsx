'use client';

import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/lib/contexts/currency-context';
import type { InferredEnvelopeSuggestion } from '@/server/modules/budget/budget.analytics.types';

interface RecentEnvelopeOffersProps {
	suggestions: InferredEnvelopeSuggestion[];
	onSelectCategory: (categoryId: string, categoryName: string) => void;
}

export function RecentEnvelopeOffers({
	suggestions,
	onSelectCategory,
}: RecentEnvelopeOffersProps) {
	const { formatCurrency } = useCurrency();
	if (suggestions.length === 0) return null;

	return (
		<section
			aria-labelledby='recent-envelope-offers-title'
			className='space-y-4 border-y py-4'
		>
			<div className='flex items-start gap-3'>
				<History
					className='mt-0.5 h-4 w-4 shrink-0 text-muted-foreground'
					aria-hidden='true'
				/>
				<div className='space-y-1'>
					<h3
						id='recent-envelope-offers-title'
						className='text-sm font-semibold'
					>
						Shape an envelope from recent activity
					</h3>
					<p className='text-xs leading-relaxed text-muted-foreground'>
						Past spending is context, not a target. Choose a category,
						then type the target that fits your plan.
					</p>
				</div>
			</div>

			<div className='divide-y border-y'>
				{suggestions.map((suggestion) => (
					<div
						key={suggestion.categoryId}
						className='flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between'
					>
						<div className='min-w-0'>
							<p className='truncate text-sm font-medium'>
								{suggestion.categoryName}
							</p>
							<p className='text-xs text-muted-foreground'>
								{suggestion.monthsObserved} logged{' '}
								{suggestion.monthsObserved === 1 ? 'month' : 'months'}
							</p>
						</div>
						<div className='flex items-center justify-between gap-3 sm:justify-end'>
							<div className='text-right'>
								<p className='text-xs text-muted-foreground'>
									your recent average
								</p>
								<p className='font-mono text-sm font-semibold tabular-nums'>
									{formatCurrency(suggestion.recentAverage)}
								</p>
							</div>
							<Button
								type='button'
								variant='outline'
								size='sm'
								onClick={() =>
									onSelectCategory(
										suggestion.categoryId,
										suggestion.categoryName
									)
								}
							>
								Use category
							</Button>
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
