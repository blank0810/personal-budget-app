'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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

interface AccountCardCarouselProps {
	accounts: Array<AccountCardAccount & { currency: string }>;
	totalBalance?: number;
}

const QUICK_ACTIONS = [
	{ label: 'Send', href: '/transfers', icon: ArrowUpRight },
	{ label: 'Receive', href: '/income', icon: ArrowDownLeft },
	{ label: 'Transfer', href: '/transfers', icon: ArrowLeftRight },
	{ label: 'Payment', href: '/payments', icon: CreditCard },
] as const;

const AUTO_ROTATE_MS = 10000;

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

export function AccountCardCarousel({ accounts, totalBalance }: AccountCardCarouselProps) {
	const { formatCurrency, currency } = useCurrency();
	const sorted = sortAccountsByClass(accounts);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [isTransitioning, setIsTransitioning] = useState(false);
	const timerRef = useRef<NodeJS.Timeout | null>(null);

	const selected = sorted[selectedIndex] ?? sorted[0] ?? null;

	// Go to next card with transition animation
	const goToNext = useCallback(() => {
		if (sorted.length <= 1) return;
		setIsTransitioning(true);
		setTimeout(() => {
			setSelectedIndex((prev) => (prev + 1) % sorted.length);
			setIsTransitioning(false);
		}, 600);
	}, [sorted.length]);

	// Click card to advance to next
	const handleCardClick = useCallback(() => {
		// Reset auto-rotate timer on manual click
		if (timerRef.current) clearInterval(timerRef.current);
		goToNext();
		timerRef.current = setInterval(goToNext, AUTO_ROTATE_MS);
	}, [goToNext]);

	// Auto-rotate every 10s
	useEffect(() => {
		if (sorted.length <= 1) return;
		timerRef.current = setInterval(goToNext, AUTO_ROTATE_MS);
		return () => {
			if (timerRef.current) clearInterval(timerRef.current);
		};
	}, [sorted.length, goToNext]);

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

	const accountTypeLabel = selected
		? selected.type.charAt(0) + selected.type.slice(1).toLowerCase() + ' account'
		: '';

	// Get next card for the "peeking behind" effect
	const nextIndex = (selectedIndex + 1) % sorted.length;
	const nextAccount = sorted.length > 1 ? sorted[nextIndex] : null;

	return (
		<div className='animate-fade-up w-full overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 via-slate-200 to-orange-100 p-5 shadow-xl dark:from-zinc-800 dark:via-zinc-900 dark:to-orange-950 sm:p-6'>
			<div className='flex flex-col gap-4 sm:flex-row sm:items-start'>
				{/* LEFT: Stacked card display */}
				{selected && (
					<div
						className='relative shrink-0 cursor-pointer'
						style={{ width: '100%', maxWidth: 320, height: 220 }}
						onClick={handleCardClick}
					>
						{/* Back card - next card peeking behind */}
						{nextAccount && (
							<div
								className='absolute'
								style={{
									transform: 'perspective(800px) rotateY(5deg) translateX(20px) translateY(10px)',
									zIndex: 0,
									opacity: isTransitioning ? 0.8 : 0.4,
									transition: 'opacity 600ms cubic-bezier(0.22, 1, 0.36, 1)',
								}}
							>
								<AccountCard
									account={nextAccount}
									isSelected={false}
									onClick={() => {}}
								/>
							</div>
						)}

						{/* Front card (selected, tilted) */}
						<div
							className='relative'
							style={{
								transition: 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1), opacity 600ms cubic-bezier(0.22, 1, 0.36, 1)',
								transform: isTransitioning
									? 'perspective(800px) rotateY(-20deg) translateX(-40px) scale(0.93)'
									: 'perspective(800px) rotateY(-8deg)',
								opacity: isTransitioning ? 0 : 1,
								zIndex: 1,
							}}
						>
							<AccountCard
								account={selected}
								isSelected={false}
								onClick={() => {}}
							/>
						</div>
					</div>
				)}

				{/* RIGHT: Account info + balance + actions */}
				{selected && (
					<div className='flex flex-1 flex-col justify-between gap-3 sm:py-1'>
						{/* Account label + Add card */}
						<div className='flex items-start justify-between'>
							<p className='text-lg font-semibold text-zinc-900 dark:text-white'>
								{accountTypeLabel}
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
						<div className='flex items-center gap-4'>
							{QUICK_ACTIONS.map(({ label, href, icon: Icon }) => (
								<Link
									key={label}
									href={href}
									className='group flex flex-col items-center gap-2'
								>
									<span className='flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-zinc-200 transition-colors group-hover:bg-zinc-300 dark:border-white/20 dark:bg-white/5 dark:group-hover:bg-white/15'>
										<Icon className='h-4.5 w-4.5 text-zinc-700 dark:text-white/80' />
									</span>
									<span className='text-[11px] font-medium text-zinc-500 transition-colors group-hover:text-zinc-800 dark:text-white/60 dark:group-hover:text-white/90'>
										{label}
									</span>
								</Link>
							))}
						</div>

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
