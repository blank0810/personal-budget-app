'use client';

import * as React from 'react';
import {
	LayoutDashboard,
	CreditCard,
	ArrowRightLeft,
	PieChart,
	BarChart3,
	Sparkles,
	Wallet,
	Shield,
	Upload,
	Target,
	FileText,
	type LucideIcon,
} from 'lucide-react';

import { NavMain } from '@/components/common/nav-main';
import { NavUser } from '@/components/common/nav-user';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
	SidebarSeparator,
	useSidebar,
} from '@/components/ui/sidebar';

type SubItem = { title: string; url: string };
type NavItem = {
	title: string;
	url: string;
	icon?: LucideIcon;
	items?: SubItem[];
};

const navItems: NavItem[] = [
	{
		title: 'Dashboard',
		url: '/dashboard',
		icon: LayoutDashboard,
	},
	{
		title: 'Transactions',
		url: '#',
		icon: ArrowRightLeft,
		items: [
			{ title: 'Income', url: '/income' },
			{ title: 'Expenses', url: '/expense' },
			{ title: 'Transfers', url: '/transfers' },
			{ title: 'Payments', url: '/payments' },
			{ title: 'Recurring', url: '/recurring' },
		],
	},
	{
		title: 'Budgets',
		url: '/budgets',
		icon: PieChart,
	},
	{
		title: 'Accounts',
		url: '/accounts',
		icon: CreditCard,
	},
	{
		title: 'Goals',
		url: '/goals',
		icon: Target,
	},
	{
		title: 'Invoices',
		url: '#',
		icon: FileText,
		items: [
			{ title: 'Clients', url: '/clients' },
			{ title: 'Entries', url: '/entries' },
			{ title: 'All Invoices', url: '/invoices' },
		],
	},
	{
		title: 'Reports',
		url: '/reports',
		icon: BarChart3,
	},
];

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
	user: { name: string; email: string; role: string };
	signOutAction: () => Promise<void>;
	hasNewChangelog?: boolean;
	disabledSidebarKeys?: string[];
}

function AppSidebarInner({ user, signOutAction, hasNewChangelog, disabledSidebarKeys, ...props }: AppSidebarProps) {
	const { state, setOpen, isMobile } = useSidebar();
	const wasCollapsedRef = React.useRef(false);

	const handleMouseEnter = React.useCallback(() => {
		if (state === 'collapsed' && !isMobile) {
			wasCollapsedRef.current = true;
			setOpen(true);
		}
	}, [state, isMobile, setOpen]);

	const handleMouseLeave = React.useCallback(() => {
		if (wasCollapsedRef.current && !isMobile) {
			wasCollapsedRef.current = false;
			setOpen(false);
		}
	}, [isMobile, setOpen]);

	return (
		<Sidebar
			collapsible='icon'
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			{...props}
		>
			<SidebarHeader className='p-3'>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size='lg' asChild className='h-14 px-3'>
							<a href='/dashboard'>
								<div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-9 items-center justify-center rounded-lg'>
									<Wallet className='size-5' />
								</div>
								<div className='grid flex-1 text-left leading-tight'>
									<span className='truncate text-base font-semibold'>
										Budget Planner
									</span>
									<span className='truncate text-xs text-muted-foreground'>
										Personal Finance
									</span>
								</div>
							</a>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarSeparator />
			<SidebarContent>
				<NavMain
					items={(() => {
						const disabled = disabledSidebarKeys ?? [];
						const filteredNavItems: NavItem[] = disabled.length
							? navItems
									.filter((item) => !disabled.includes(item.title))
									.map((item) =>
										item.items
											? {
													...item,
													items: item.items.filter(
														(sub) => !disabled.includes(sub.title),
													),
												}
											: item,
									)
							: navItems;
						return user.role === 'ADMIN'
							? [
									...filteredNavItems,
									{
										title: 'Admin',
										url: '/admin',
										icon: Shield,
									},
								]
							: filteredNavItems;
					})()}
				/>
			</SidebarContent>
			<SidebarSeparator />
			<SidebarFooter className='p-3'>
				<SidebarMenu>
					{!disabledSidebarKeys?.includes('Import') && (
						<SidebarMenuItem>
							<SidebarMenuButton asChild size='sm'>
								<a href='/import'>
									<Upload className='h-4 w-4' />
									<span>Import</span>
								</a>
							</SidebarMenuButton>
						</SidebarMenuItem>
					)}
					<SidebarMenuItem>
						<SidebarMenuButton asChild size='sm' tooltip='Community Changelog & Feedback'>
							<a href='/changelog' target='_blank' rel='noopener noreferrer'>
								<Sparkles className='h-4 w-4' />
								<span>Community</span>
								{hasNewChangelog && (
									<span className='ml-auto h-2 w-2 rounded-full bg-primary' />
								)}
							</a>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
				<SidebarSeparator />
				<NavUser user={user} signOutAction={signOutAction} />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}

export function AppSidebar(props: AppSidebarProps) {
	return <AppSidebarInner {...props} />;
}
