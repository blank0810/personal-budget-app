import { Wallet } from 'lucide-react';
import { AppSidebar } from '@/components/common/app-sidebar';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { auth, signOut } from '@/auth';
import prisma from '@/lib/prisma';
import { CurrencyProvider } from '@/lib/contexts/currency-context';

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await auth();

	const dbUser = await prisma.user.findUnique({
		where: { id: session!.user!.id },
		select: { name: true, email: true, currency: true, role: true },
	});

	const user = {
		name: dbUser?.name || 'User',
		email: dbUser?.email || '',
		role: dbUser?.role || 'USER',
	};

	const signOutAction = async () => {
		'use server';
		await signOut();
	};

	return (
		<CurrencyProvider currency={dbUser?.currency ?? 'USD'}>
			<SidebarProvider>
				<AppSidebar user={user} signOutAction={signOutAction} />
				<SidebarInset>
					<header className='flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12'>
						<div className='flex items-center gap-2'>
							<SidebarTrigger className='-ml-1' />
							<Separator
								orientation='vertical'
								className='mr-2 data-[orientation=vertical]:h-4 md:hidden'
							/>
							<div className='flex items-center gap-2 md:hidden'>
								<Wallet className='h-5 w-5' />
								<span className='text-lg font-bold'>Budget Planner</span>
							</div>
						</div>
					</header>
					<main className='p-4 md:p-8'>{children}</main>
				</SidebarInset>
			</SidebarProvider>
		</CurrencyProvider>
	);
}
