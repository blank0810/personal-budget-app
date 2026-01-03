import {
	LayoutDashboard,
	Wallet,
	CreditCard,
	ArrowRightLeft,
	PieChart,
	BarChart3,
	Sparkles,
	type LucideIcon,
} from 'lucide-react';

export interface NavItem {
	title: string;
	href: string;
	icon: LucideIcon;
}

export const navItems: NavItem[] = [
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
