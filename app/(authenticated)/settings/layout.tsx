import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { FeatureFlagService } from '@/server/modules/feature-flag/feature-flag.service';
import { SettingsNav } from '@/components/modules/settings/SettingsNav';

/**
 * Settings shell.
 *
 * Real route segments rather than tabs on one page, because notification emails
 * link users straight here — the usual reason someone opens notification
 * settings is having received mail they did not want. That entry point needs a
 * stable, redirectable URL, which a `?tab=` query param is not.
 *
 * Each child page fetches only the data its own section needs. That is cheaper
 * than the single fat query the old /profile page ran, and it means a slow
 * section cannot delay the others.
 */
export default async function SettingsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await auth();
	if (!session?.user?.id) redirect('/login');

	// Invoicing settings are only meaningful to users who invoice, so the section
	// is gated on the same flag that already hides the Invoices sidebar entry.
	const features = await FeatureFlagService.getResolvedFeaturesForUser(
		session.user.id
	);

	return (
		<div className='container mx-auto py-6 md:py-10'>
			<div className='mb-6 space-y-1'>
				<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
					Settings
				</h1>
				<p className='text-sm text-muted-foreground'>
					Manage your account, security, and what we email you about.
				</p>
			</div>

			<div className='flex flex-col gap-6 lg:flex-row lg:gap-10'>
				<SettingsNav showInvoicing={Boolean(features.invoices)} />
				<div className='min-w-0 flex-1 space-y-6'>{children}</div>
			</div>
		</div>
	);
}
