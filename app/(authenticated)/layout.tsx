import { Wallet, Search, Bell } from 'lucide-react';
import { AppSidebar } from '@/components/common/app-sidebar';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { HeaderUser } from '@/components/common/HeaderUser';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { auth, signOut } from '@/auth';
import { CurrencyProvider } from '@/lib/contexts/currency-context';
import { ChangelogService } from '@/server/modules/changelog/changelog.service';
import { UserService } from '@/server/modules/user/user.service';
import { FeatureFlagService } from '@/server/modules/feature-flag/feature-flag.service';
import { FEATURE_ROUTE_MAP } from '@/server/modules/feature-flag/feature-flag.types';

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await auth();

	const dbUser = await UserService.getForLayout(session!.user!.id);

	const resolvedFeatures = await FeatureFlagService.getResolvedFeaturesForUser(session!.user!.id);

	const disabledSidebarKeys: string[] = [];
	for (const [featureKey, mapping] of Object.entries(FEATURE_ROUTE_MAP)) {
		if (!resolvedFeatures[featureKey]) {
			for (const key of mapping.sidebarKeys) {
				disabledSidebarKeys.push(key);
			}
		}
	}

	const user = {
		name: dbUser?.name || 'User',
		email: dbUser?.email || '',
		role: dbUser?.role || 'USER',
	};

	const latestChangelogDate = ChangelogService.getLatestDate();
	const hasNewChangelog = latestChangelogDate
		? !dbUser?.lastSeenChangelogAt || latestChangelogDate > dbUser.lastSeenChangelogAt
		: false;

	const signOutAction = async () => {
		'use server';
		await signOut({ redirectTo: '/' });
	};

	return (
		<CurrencyProvider currency={dbUser?.currency ?? 'USD'}>
			<SidebarProvider>
				<AppSidebar user={user} signOutAction={signOutAction} hasNewChangelog={hasNewChangelog} disabledSidebarKeys={disabledSidebarKeys} />
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
						<div className='ml-auto flex items-center gap-1'>
							<ThemeToggle />
							<Button variant='ghost' size='icon' className='h-9 w-9 rounded-full'>
								<Search className='h-4 w-4' />
								<span className='sr-only'>Search</span>
							</Button>
							<div className='relative'>
								<Button variant='ghost' size='icon' className='h-9 w-9 rounded-full'>
									<Bell className='h-4 w-4' />
									<span className='sr-only'>Notifications</span>
								</Button>
								<span className='pointer-events-none absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500' />
							</div>
							<HeaderUser user={user} signOutAction={signOutAction} />
						</div>
					</header>
					<main className='px-4 pt-2 pb-4 md:px-8 md:pt-3 md:pb-8'>{children}</main>
				</SidebarInset>
			</SidebarProvider>
		</CurrencyProvider>
	);
}
