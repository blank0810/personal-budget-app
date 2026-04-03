'use client';

import {
	Landmark,
	Wallet,
	PiggyBank,
	TrendingUp,
	CreditCard,
	FileText,
	Church,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/lib/contexts/currency-context';

const ACCOUNT_TYPE_ICON: Record<string, React.ElementType> = {
	BANK: Landmark,
	CASH: Wallet,
	SAVINGS: PiggyBank,
	INVESTMENT: TrendingUp,
	CREDIT: CreditCard,
	LOAN: FileText,
	TITHE: Church,
};

const GRADIENT_MAP: Record<string, string> = {
	slate: 'from-slate-600 via-slate-700 to-slate-900',
	blue: 'from-blue-600 via-blue-700 to-blue-900',
	emerald: 'from-emerald-600 via-emerald-700 to-emerald-900',
	red: 'from-red-500 via-orange-600 to-red-900',
	orange: 'from-orange-400 via-orange-600 to-red-900',
	amber: 'from-amber-500 via-orange-600 to-red-900',
	purple: 'from-purple-600 via-purple-700 to-purple-900',
	pink: 'from-pink-500 via-pink-600 to-pink-900',
	teal: 'from-teal-500 via-teal-600 to-teal-900',
};

const UTILIZATION_BAR_COLOR = (utilization: number): string => {
	if (utilization >= 0.9) return 'bg-red-400';
	if (utilization >= 0.7) return 'bg-red-300';
	if (utilization >= 0.5) return 'bg-orange-300';
	if (utilization >= 0.3) return 'bg-yellow-300';
	return 'bg-green-300';
};

export interface AccountCardAccount {
	id: string;
	name: string;
	type: string;
	balance: number;
	color: string | null;
	isLiability: boolean;
	creditLimit: number | null;
}

interface AccountCardProps {
	account: AccountCardAccount;
	isSelected: boolean;
	onClick: () => void;
}

function getMaskedNumber(id: string): string {
	const chars = id.replace(/-/g, '');
	let num = 0;
	for (let i = 0; i < chars.length; i++) {
		num = (num * 31 + chars.charCodeAt(i)) >>> 0;
	}
	const suffix = String(num % 10000).padStart(4, '0');
	return `${suffix}`;
}

function getMaskedCardNumber(id: string): string {
	const chars = id.replace(/-/g, '');
	let num = 0;
	for (let i = 0; i < chars.length; i++) {
		num = (num * 31 + chars.charCodeAt(i)) >>> 0;
	}
	const suffix = String(num % 10000).padStart(4, '0');
	return `•••• •••• •••• ${suffix}`;
}

export function AccountCard({ account, isSelected, onClick }: AccountCardProps) {
	const { formatCurrency } = useCurrency();
	const TypeIcon = ACCOUNT_TYPE_ICON[account.type] ?? Landmark;
	const gradient =
		account.color && GRADIENT_MAP[account.color]
			? GRADIENT_MAP[account.color]
			: GRADIENT_MAP.slate;

	const hasCreditBar =
		account.isLiability &&
		account.creditLimit !== null &&
		account.creditLimit > 0;

	const utilization = hasCreditBar
		? Math.min(account.balance / account.creditLimit!, 1)
		: 0;
	const utilizationPercent = Math.round(utilization * 100);

	const cardNumber = getMaskedCardNumber(account.id);

	return (
		<button
			type='button'
			onClick={onClick}
			className={cn(
				'group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br text-white shadow-lg',
				'transition-all duration-200 ease-out',
				'hover:shadow-xl hover:scale-[1.01]',
				'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
				gradient,
				isSelected && 'ring-2 ring-primary scale-[1.02] shadow-xl'
			)}
			style={{
				width: 300,
				minHeight: 190,
				flexShrink: 0,
			}}
		>
			{/* Top section with padding */}
			<div className='relative flex flex-col gap-3 p-5 pb-2'>
				{/* Top row: icon + account type */}
				<div className='flex items-center justify-between'>
					<span className='flex h-8 w-8 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20'>
						<TypeIcon className='h-4 w-4 text-white' />
					</span>
					<span className='text-xs font-semibold italic text-white/90'>
						{account.type.toLowerCase()}
					</span>
				</div>

				{/* Card number - large and prominent */}
				<p className='font-mono text-lg font-bold tracking-[0.15em] text-white'>
					{cardNumber}
				</p>

				{/* Account name below number */}
				<p className='truncate text-xs font-medium tracking-wide text-white/60'>
					{account.name}
				</p>
			</div>

			{/* Bottom section - labels row with subtle gradient overlay */}
			<div className='relative mt-auto px-5 pb-4 pt-2'>
				<div className='flex items-end justify-between'>
					{/* Card Holder */}
					<div className='flex flex-col gap-0.5'>
						<span className='text-[8px] font-bold tracking-[0.15em] text-white/50 uppercase'>
							Card Holder
						</span>
						<span className='max-w-[100px] truncate text-[11px] font-semibold text-white'>
							{account.name}
						</span>
					</div>

					{/* Balance or Limit */}
					<div className='flex flex-col items-center gap-0.5'>
						<span className='text-[8px] font-bold tracking-[0.15em] text-white/50 uppercase'>
							{hasCreditBar ? 'Limit' : 'Balance'}
						</span>
						<span className='text-[11px] font-bold tabular-nums text-white'>
							{hasCreditBar
								? formatCurrency(account.creditLimit!)
								: formatCurrency(account.balance)}
						</span>
					</div>

					{/* EMV Chip - grid pattern like real chip */}
					<div
						className='rounded-sm border border-white/30 p-[3px]'
						style={{ width: 32, height: 26 }}
					>
						<div className='grid h-full w-full grid-cols-3 grid-rows-3 gap-[1px]'>
							{Array.from({ length: 9 }).map((_, i) => (
								<div
									key={i}
									className={cn(
										'rounded-[1px]',
										i % 2 === 0 ? 'bg-white/60' : 'bg-white/35'
									)}
								/>
							))}
						</div>
					</div>
				</div>
			</div>

			{/* Credit utilization bar - overlaid at the very bottom */}
			{hasCreditBar && (
				<div className='px-5 pb-3'>
					<div className='mb-1 flex justify-between text-[8px] font-medium text-white/50'>
						<span>{utilizationPercent}% used</span>
						<span>
							{formatCurrency(account.creditLimit! - account.balance)} avail.
						</span>
					</div>
					<div className='h-1 w-full overflow-hidden rounded-full bg-white/20'>
						<div
							className={cn(
								'h-full rounded-full transition-all duration-500',
								UTILIZATION_BAR_COLOR(utilization)
							)}
							style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
						/>
					</div>
				</div>
			)}
		</button>
	);
}
