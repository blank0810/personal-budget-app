'use client';

import * as React from 'react';
import {
	LayoutDashboard,
	CreditCard,
	ArrowRightLeft,
	PieChart,
	BarChart3,
	Sparkles,
	MessageSquarePlus,
	Wallet,
	Shield,
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

const navItems = [
	{
		title: 'Dashboard',
		url: '/dashboard',
		icon: LayoutDashboard,
	},
	{
		title: 'Transactions',
		url: '#',
		icon: ArrowRightLeft,
		isActive: true,
		items: [
			{ title: 'Income', url: '/income' },
			{ title: 'Expenses', url: '/expense' },
			{ title: 'Transfers', url: '/transfers' },
			{ title: 'Payments', url: '/payments' },
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
		title: 'Reports',
		url: '/reports',
		icon: BarChart3,
	},
	{
		title: 'Updates',
		url: '/changelog',
		icon: Sparkles,
	},
	{
		title: 'Feedback',
		url: '/changelog#request',
		icon: MessageSquarePlus,
	},
];

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
	user: { name: string; email: string; role: string };
	signOutAction: () => Promise<void>;
}

function AppSidebarInner({ user, signOutAction, ...props }: AppSidebarProps) {
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
					items={
						user.role === 'ADMIN'
							? [
									...navItems,
									{
										title: 'Admin',
										url: '/admin',
										icon: Shield,
									},
								]
							: navItems
					}
				/>
			</SidebarContent>
			<SidebarSeparator />
			<SidebarFooter className='p-3'>
				<NavUser user={user} signOutAction={signOutAction} />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}

export function AppSidebar(props: AppSidebarProps) {
	return <AppSidebarInner {...props} />;
}
