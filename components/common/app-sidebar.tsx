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
		title: 'Accounts',
		url: '/accounts',
		icon: CreditCard,
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
}

function AppSidebarInner({ user, signOutAction, hasNewChangelog, ...props }: AppSidebarProps) {
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
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton asChild size='sm'>
							<a href='/recurring'>
								<ArrowRightLeft className='h-4 w-4' />
								<span>Recurring</span>
							</a>
						</SidebarMenuButton>
					</SidebarMenuItem>
					<SidebarMenuItem>
						<SidebarMenuButton asChild size='sm'>
							<a href='/import'>
								<Upload className='h-4 w-4' />
								<span>Import</span>
							</a>
						</SidebarMenuButton>
					</SidebarMenuItem>
					<SidebarMenuItem>
						<SidebarMenuButton asChild size='sm'>
							<a href='/changelog'>
								<Sparkles className='h-4 w-4' />
								<span>Changelog</span>
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
