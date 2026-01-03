import { Wallet, LogOut } from 'lucide-react';
import { SidebarNav } from '@/components/common/sidebar-nav';
import { MobileSidebar } from '@/components/common/mobile-sidebar';
import { Button } from '@/components/ui/button';
import { auth, signOut } from '@/auth';

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	await auth();

	const signOutAction = async () => {
		'use server';
		await signOut();
	};

	return (
		<div className='flex min-h-screen w-full flex-col bg-muted/40'>
			{/* Mobile Header */}
			<header className='sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:hidden'>
				<MobileSidebar signOutAction={signOutAction} />
				<div className='flex items-center gap-2'>
					<Wallet className='h-6 w-6' />
					<span className='text-lg font-bold'>Budget Planner</span>
				</div>
			</header>

			{/* Desktop Sidebar */}
			<aside className='fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r bg-background sm:flex'>
				<div className='flex h-16 items-center gap-2 border-b px-6'>
					<Wallet className='h-6 w-6' />
					<span className='text-lg font-bold'>Budget Planner</span>
				</div>
				<SidebarNav />
				<div className='mt-auto border-t p-4'>
					<form action={signOutAction}>
						<Button
							variant='ghost'
							className='w-full justify-start gap-3 text-muted-foreground'
						>
							<LogOut className='h-4 w-4' />
							Sign Out
						</Button>
					</form>
				</div>
			</aside>

			{/* Main Content */}
			<main className='flex-1 sm:ml-64'>
				<div className='p-4 md:p-8'>{children}</div>
			</main>
		</div>
	);
}
