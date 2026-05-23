'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, CreditCard } from 'lucide-react';
import { AccountCard, type AccountCardAccount } from './AccountCard';
import { AnimatedNumber } from './AnimatedNumber';
import {
	ACCOUNT_CLASS_MAP,
	ACCOUNT_CLASS_ORDER,
	type AccountClass,
} from '@/lib/account-utils';
import { useCurrency } from '@/lib/contexts/currency-context';
import { useQuickAction, type QuickAction } from './QuickActionSheet';

interface AccountCardCarouselProps {
	accounts: Array<AccountCardAccount & { currency: string }>;
	totalBalance?: number;
}

const QUICK_ACTIONS = [
	{ label: 'Send', action: 'transfer' as QuickAction, icon: ArrowUpRight },
	{ label: 'Receive', action: 'income' as QuickAction, icon: ArrowDownLeft },
	{ label: 'Transfer', action: 'transfer' as QuickAction, icon: ArrowLeftRight },
	{ label: 'Payment', action: 'payment' as QuickAction, icon: CreditCard },
] as const;

const AUTO_ROTATE_MS = 10000;

function QuickActions() {
	const { openSheet } = useQuickAction();
	return (
		<div className='flex items-center gap-4'>
			{QUICK_ACTIONS.map(({ label, action, icon: Icon }) => (
				<button
					key={label}
					type='button'
					onClick={() => openSheet(action)}
					className='group flex flex-col items-center gap-2'
				>
					<span className='flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-zinc-200 transition-colors group-hover:bg-zinc-300 dark:border-white/20 dark:bg-white/5 dark:group-hover:bg-white/15'>
						<Icon className='h-4.5 w-4.5 text-zinc-700 dark:text-white/80' />
					</span>
					<span className='text-[11px] font-medium text-zinc-500 transition-colors group-hover:text-zinc-800 dark:text-white/60 dark:group-hover:text-white/90'>
						{label}
					</span>
				</button>
			))}
		</div>
	);
}

function sortAccountsByClass(
	accounts: AccountCardCarouselProps['accounts']
): AccountCardCarouselProps['accounts'] {
	const groups: Record<AccountClass, AccountCardCarouselProps['accounts']> = {
		liquid: [],
		savings: [],
		liability: [],
	};

	for (const account of accounts) {
		const cls = ACCOUNT_CLASS_MAP[account.type as keyof typeof ACCOUNT_CLASS_MAP];
		if (cls) groups[cls].push(account);
	}

	return ACCOUNT_CLASS_ORDER.flatMap((cls) => groups[cls]);
}

// Position of a card in the shuffling stack, by its slot relative to the
// selected card: 0 = front (face up), 1 = peeking behind, n-1 = the card that
// just left the front (dealt up and off the top), deeper = hidden in the deck.
function cardSlotStyle(
	slot: number,
	n: number
): { transform: string; opacity: number; zIndex: number } {
	if (slot === 0)
		return {
			transform: 'perspective(800px) rotateY(-8deg) translateX(0px) translateY(0px) scale(1)',
			opacity: 1,
			zIndex: 30,
		};
	if (slot === 1)
		return {
			transform: 'perspective(800px) rotateY(6deg) translateX(22px) translateY(12px) scale(0.94)',
			opacity: 0.45,
			zIndex: 20,
		};
	if (slot === n - 1)
		return {
			transform: 'perspective(800px) rotateY(-16deg) translateX(-24px) translateY(-38px) scale(0.92)',
			opacity: 0,
			zIndex: 10,
		};
	return {
		transform: 'perspective(800px) rotateY(8deg) translateX(34px) translateY(20px) scale(0.9)',
		opacity: 0,
		zIndex: 5,
	};
}

export function AccountCardCarousel({ accounts, totalBalance }: AccountCardCarouselProps) {
	const { formatCurrency, currency } = useCurrency();
	const sorted = sortAccountsByClass(accounts);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const selected = sorted[selectedIndex] ?? sorted[0] ?? null;
	const count = sorted.length;

	// Advance to the next card. The stack animates purely via CSS transitions on
	// each card's slot transform, so advancing is just an index bump — no timed
	// fade-out-then-swap (that gap was the ~1s "freeze" before the next card rose).
	const advance = () =>
		setSelectedIndex((prev) => (count <= 1 ? prev : (prev + 1) % count));

	// Click the card to advance + restart the auto-rotate timer.
	const handleCardClick = () => {
		if (timerRef.current) clearInterval(timerRef.current);
		advance();
		if (count > 1) timerRef.current = setInterval(advance, AUTO_ROTATE_MS);
	};

	// Auto-rotate every 10s.
	useEffect(() => {
		if (count <= 1) return;
		const id = setInterval(() => {
			setSelectedIndex((prev) => (prev + 1) % count);
		}, AUTO_ROTATE_MS);
		timerRef.current = id;
		return () => clearInterval(id);
	}, [count]);

	if (accounts.length === 0) {
		return (
			<div className='animate-fade-up flex flex-col items-center justify-center rounded-2xl border border-dashed py-12 text-center'>
				<p className='text-sm text-muted-foreground'>No accounts yet.</p>
				<Link
					href='/accounts'
					className='mt-2 text-sm font-medium text-primary underline-offset-4 hover:underline'
				>
					Add your first account
				</Link>
			</div>
		);
	}

	const accountLabel = selected ? selected.name : '';

	return (
		<div className='animate-fade-up w-full overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 via-slate-200 to-orange-100 p-5 shadow-xl dark:from-zinc-800 dark:via-zinc-900 dark:to-orange-950 sm:p-6'>
			<div className='flex flex-col gap-4 sm:flex-row sm:items-start'>
				{/* LEFT: Shuffling card stack — every account is a stable, keyed
				    element that animates between deck slots, so advancing slides the
				    next card up as the current is dealt off (no fade-out/swap freeze). */}
				{selected && (
					<>
						<style>{`
							@media (prefers-reduced-motion: reduce) {
								.acct-shuffle-card { transition: none !important; }
							}
						`}</style>
						<div
							className='relative shrink-0 cursor-pointer'
							style={{ width: '100%', maxWidth: 320, height: 220 }}
							onClick={handleCardClick}
						>
							{sorted.map((account, i) => {
								const slot = (i - selectedIndex + sorted.length) % sorted.length;
								const s = cardSlotStyle(slot, sorted.length);
								return (
									<div
										key={account.id}
										className='acct-shuffle-card absolute left-0 top-0'
										style={{
											transform: s.transform,
											opacity: s.opacity,
											zIndex: s.zIndex,
											pointerEvents: slot === 0 ? 'auto' : 'none',
											transition:
												'transform 520ms cubic-bezier(0.22, 1, 0.36, 1), opacity 520ms cubic-bezier(0.22, 1, 0.36, 1)',
										}}
									>
										<AccountCard account={account} isSelected={false} onClick={() => {}} />
									</div>
								);
							})}
						</div>
					</>
				)}

				{/* RIGHT: Account info + balance + actions */}
				{selected && (
					<div className='flex flex-1 flex-col justify-between gap-3 sm:py-1'>
						{/* Account label + Add card */}
						<div className='flex items-start justify-between'>
							<p className='text-lg font-semibold text-zinc-900 dark:text-white'>
								{accountLabel}
							</p>
							<Link
								href='/accounts'
								className='rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200 hover:text-zinc-900 dark:border-white/20 dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white'
							>
								Add card
							</Link>
						</div>

						{/* Animated balance / available credit */}
						<div>
							{selected.isLiability && selected.creditLimit !== null && selected.creditLimit > 0 && (
								<p className='text-xs font-medium text-zinc-500 dark:text-white/50 mb-1'>
									Available Credit
								</p>
							)}
							<div className='flex items-baseline gap-3'>
								<AnimatedNumber
									value={
										selected.isLiability && selected.creditLimit !== null && selected.creditLimit > 0
											? selected.creditLimit - selected.balance
											: selected.balance
									}
									duration={700}
									formatFn={formatCurrency}
									className='text-4xl font-bold tabular-nums tracking-tight text-zinc-900 dark:text-white md:text-5xl'
								/>
								<span className='text-sm font-medium text-zinc-500 dark:text-white/50'>
									{currency}
								</span>
							</div>
							{selected.isLiability && selected.creditLimit !== null && selected.creditLimit > 0 && (
								<p className='text-xs text-zinc-400 dark:text-white/40 mt-1'>
									{formatCurrency(selected.balance)} owed of {formatCurrency(selected.creditLimit)} limit
								</p>
							)}
						</div>

						{/* Quick actions */}
						<QuickActions />

						{/* Total balance across all accounts */}
						{totalBalance !== undefined && (
							<div className='flex items-center justify-between border-t border-zinc-300 pt-2 dark:border-white/10'>
								<span className='text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-white/40'>
									Total Balance
								</span>
								<span className='text-sm font-semibold tabular-nums text-zinc-600 dark:text-white/70'>
									{formatCurrency(totalBalance)}
								</span>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
