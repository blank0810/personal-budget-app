'use client';

import { ArrowLeftRight, CreditCard, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type {
	DashboardOverview,
	DashboardQuickActionKind,
} from '@/server/modules/dashboard/dashboard.types';
import { useQuickAction } from './QuickActionSheet';

const ACTIONS: Array<{
	kind: DashboardQuickActionKind;
	label: string;
	icon: typeof Plus;
}> = [
	{ kind: 'income', label: 'Add income', icon: Plus },
	{ kind: 'expense', label: 'Add expense', icon: Minus },
	{ kind: 'transfer', label: 'Transfer', icon: ArrowLeftRight },
	{ kind: 'payment', label: 'Pay debt', icon: CreditCard },
];

export function DashboardHeader({
	snapshotLabel,
	availability,
}: {
	snapshotLabel: string;
	availability: DashboardOverview['quickActions']['availability'];
}) {
	const { openSheet } = useQuickAction();
	const unavailableActions = ACTIONS.filter(
		({ kind }) => !availability[kind].enabled,
	);

	return (
		<header className='flex flex-col gap-4 border-b pb-4 xl:flex-row xl:items-end xl:justify-between'>
			<div>
				<h1 className='text-3xl font-semibold tracking-[-0.03em] sm:text-4xl'>
					Dashboard
				</h1>
				<p className='mt-1 text-sm text-muted-foreground'>
					Current snapshot · {snapshotLabel}
				</p>
			</div>
			<div className='flex flex-col gap-2 xl:items-end'>
				<div
					className='grid grid-cols-2 gap-2 sm:flex'
					aria-label='Quick actions'
				>
					{ACTIONS.map(({ kind, label, icon: Icon }, index) => {
						const state = availability[kind];
						const reasonId = `dashboard-${kind}-unavailable`;
						return (
							<Button
								key={kind}
								type='button'
								variant={index === 0 ? 'default' : 'outline'}
								aria-disabled={!state.enabled || undefined}
								aria-describedby={!state.enabled ? reasonId : undefined}
								className='aria-disabled:cursor-not-allowed aria-disabled:opacity-50'
								onClick={() => {
									if (state.enabled) openSheet(kind);
								}}
							>
								<Icon aria-hidden='true' />
								{label}
							</Button>
						);
					})}
				</div>
				{unavailableActions.length > 0 && (
					<ul className='space-y-1 text-xs text-muted-foreground xl:text-right'>
						{unavailableActions.map(({ kind, label }) => (
							<li key={kind} id={`dashboard-${kind}-unavailable`}>
								<span className='font-medium text-foreground'>{label}:</span>{' '}
								{availability[kind].disabledReason}
							</li>
						))}
					</ul>
				)}
			</div>
		</header>
	);
}
