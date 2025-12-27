'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
	LayoutDashboard,
	Wallet,
	CreditCard,
	ArrowRightLeft,
	PieChart,
	BarChart3,
	Sparkles,
} from 'lucide-react';

const items = [
	{
		title: 'Dashboard',
		href: '/dashboard',
		icon: LayoutDashboard,
	},
	{
		title: 'Income',
		href: '/income',
		icon: Wallet,
	},
	{
		title: 'Expenses',
		href: '/expense',
		icon: CreditCard,
	},
	{
		title: 'Budgets',
		href: '/budgets',
		icon: PieChart,
	},
	{
		title: 'Accounts',
		href: '/accounts',
		icon: CreditCard,
	},
	{
		title: 'Transfers',
		href: '/transfers',
		icon: ArrowRightLeft,
	},
	{
		title: 'Reports',
		href: '/reports',
		icon: BarChart3,
	},
	{
		title: 'Updates',
		href: '/changelog',
		icon: Sparkles,
	},
];

export function SidebarNav() {
	const pathname = usePathname();

	return (
		<nav className='flex flex-col gap-2 px-4 py-4'>
			{items.map((item) => (
				<a
					key={item.href}
					href={item.href}
					className={cn(
						'flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary hover:bg-muted',
						pathname === item.href ||
							pathname?.startsWith(`${item.href}/`)
							? 'bg-muted text-primary'
							: 'text-muted-foreground'
					)}
				>
					<item.icon className='h-4 w-4' />
					{item.title}
				</a>
			))}
		</nav>
	);
}
