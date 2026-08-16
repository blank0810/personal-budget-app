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

	return (
		<header className='flex flex-col gap-5 border-b pb-5 lg:flex-row lg:items-end lg:justify-between'>
			<div>
				<h1 className='text-3xl font-semibold tracking-[-0.03em] sm:text-4xl'>
					Dashboard
				</h1>
				<p className='mt-1 text-sm text-muted-foreground'>
					Current snapshot · {snapshotLabel}
				</p>
			</div>
			<div
				className='grid grid-cols-2 gap-2 sm:flex'
				aria-label='Quick actions'
			>
				{ACTIONS.map(({ kind, label, icon: Icon }, index) => {
					const state = availability[kind];
					return (
						<Button
							key={kind}
							type='button'
							variant={index === 0 ? 'default' : 'outline'}
							disabled={!state.enabled}
							title={state.disabledReason ?? undefined}
							onClick={() => openSheet(kind)}
						>
							<Icon aria-hidden='true' />
							{label}
						</Button>
					);
				})}
			</div>
		</header>
	);
}
