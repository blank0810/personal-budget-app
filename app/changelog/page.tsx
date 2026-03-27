export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { Rocket, Wallet, ArrowLeft, MessageSquarePlus, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChangelogView } from '@/components/modules/changelog/ChangelogView';
import { ChangelogService } from '@/server/modules/changelog/changelog.service';
import { FeatureRequestForm } from '@/components/modules/feature-request/FeatureRequestForm';
import { FeatureRequestTabs } from '@/components/modules/feature-request/FeatureRequestTabs';
import { FeatureRequestService } from '@/server/modules/feature-request/feature-request.service';
import prisma from '@/lib/prisma';
import Link from 'next/link';

export default async function PublicChangelogPage() {
	const versions = ChangelogService.getAllVersions();

	let userEmail: string | null = null;
	try {
		const session = await auth();
		userEmail = session?.user?.email ?? null;

		// Mark changelog as seen for authenticated users
		if (session?.user?.id) {
			await prisma.user.update({
				where: { id: session.user.id },
				data: { lastSeenChangelogAt: new Date() },
			});
		}
	} catch {
		// Not authenticated
	}

	const requests = await FeatureRequestService.getAll() ?? [];
	const latestVersion = versions[0];

	return (
		<div className='min-h-screen bg-background'>
			{/* Header */}
			<header className='sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
				<div className='mx-auto flex max-w-4xl items-center justify-between px-4 sm:px-6 py-3'>
					<Link href='/' className='flex items-center gap-2'>
						<div className='bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg'>
							<Wallet className='size-4' />
						</div>
						<span className='font-semibold'>Budget Planner</span>
					</Link>
					<div className='flex items-center gap-2'>
						<Button variant='ghost' size='sm' asChild>
							<a href='#request'>
								<MessageSquarePlus className='h-4 w-4 mr-1' />
								<span className='hidden sm:inline'>Request a Feature</span>
								<span className='sm:hidden'>Feedback</span>
							</a>
						</Button>
						{userEmail ? (
							<Button variant='outline' size='sm' asChild>
								<Link href='/dashboard'>
									<ArrowLeft className='h-4 w-4 mr-1' />
									<span className='hidden sm:inline'>Back to App</span>
									<span className='sm:hidden'>App</span>
								</Link>
							</Button>
						) : (
							<Button variant='outline' size='sm' asChild>
								<Link href='/login'>Sign In</Link>
							</Button>
						)}
					</div>
				</div>
			</header>

			{/* Hero */}
			<section className='border-b bg-muted/30'>
				<div className='mx-auto max-w-4xl px-4 sm:px-6 py-10 md:py-14'>
					<div className='flex flex-col gap-3'>
						<div className='flex items-center gap-3'>
							<Rocket className='h-7 w-7 sm:h-9 sm:w-9 text-primary' />
							<h1 className='text-2xl sm:text-4xl font-bold tracking-tight'>
								Product Updates
							</h1>
						</div>
						<p className='text-muted-foreground text-base sm:text-lg max-w-2xl'>
							A timeline of how the Budget Planner is evolving to
							help you build wealth.
						</p>
						{latestVersion && (
							<div className='flex items-center gap-2 mt-2'>
								<span className='inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'>
									<span className='h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse' />
									Latest: {latestVersion.version}
								</span>
								<span className='text-xs text-muted-foreground'>
									{latestVersion.date}
								</span>
							</div>
						)}
					</div>
				</div>
			</section>

			{/* Changelog Timeline */}
			<main className='mx-auto max-w-4xl px-4 sm:px-6 py-8 md:py-12'>
				<h2 className='text-2xl font-bold mb-6'>Release Notes</h2>
				<div className='max-h-[70vh] overflow-y-auto pr-2 border rounded-lg p-4'>
					<ChangelogView versions={versions} />
				</div>
			</main>

			{/* Community Requests */}
			<section className='border-t'>
				<div className='mx-auto max-w-4xl px-4 sm:px-6 py-10 md:py-14 space-y-6'>
					<div className='flex flex-col gap-1'>
						<h2 className='text-lg font-semibold flex items-center gap-2'>
							<Lightbulb className='h-5 w-5 text-amber-500' />
							Community Requests
						</h2>
						<p className='text-sm text-muted-foreground'>
							Ideas and bug reports submitted by users.
						</p>
					</div>
					<FeatureRequestTabs
						requests={requests.map((r) => ({
							...r,
							createdAt: r.createdAt.toISOString(),
							updatedAt: r.updatedAt.toISOString(),
						}))}
					/>
				</div>
			</section>

			{/* Feature Request Form */}
			<section
				id='request'
				className='border-t bg-muted/20 scroll-mt-16'
			>
				<div className='mx-auto max-w-4xl px-4 sm:px-6 py-10 md:py-14'>
					<FeatureRequestForm userEmail={userEmail} />
				</div>
			</section>
		</div>
	);
}
