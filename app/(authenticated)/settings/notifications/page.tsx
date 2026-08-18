import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { UserService } from '@/server/modules/user/user.service';
import { getNotificationPreferencesAction } from '@/server/modules/notification/notification.controller';
import { NotificationPreferencesCard } from '@/components/modules/notification/NotificationPreferencesCard';

/**
 * The destination our notification emails link to. Every "Manage preferences"
 * footer points here, so this URL is a published contract — treat a rename as a
 * breaking change and add a redirect rather than moving it.
 */
export default async function SettingsNotificationsPage() {
	const session = await auth();
	if (!session?.user?.id) redirect('/login');

	const userId = session.user.id;

	const [user, preferencesResult] = await Promise.all([
		UserService.getProfile(userId),
		getNotificationPreferencesAction(),
	]);

	// An inline error rather than throwing the whole route: someone who arrived
	// from an email to turn something OFF must still reach the master switch.
	// The old /profile page threw here, taking every other section down with it.
	if ('error' in preferencesResult) {
		return (
			<div className='rounded-lg border border-destructive/50 bg-destructive/5 p-6'>
				<p className='text-sm font-medium text-destructive'>
					Could not load your notification preferences.
				</p>
				<p className='mt-1 text-sm text-muted-foreground'>
					{preferencesResult.error} — please refresh to try again.
				</p>
			</div>
		);
	}

	return (
		<NotificationPreferencesCard
			preferences={preferencesResult.data}
			emailNotificationsEnabled={user.emailNotificationsEnabled}
			notificationEmail={user.notificationEmail}
			accountEmail={user.email}
			largeExpenseThreshold={
				user.largeExpenseThreshold === null
					? null
					: Number(user.largeExpenseThreshold)
			}
		/>
	);
}
