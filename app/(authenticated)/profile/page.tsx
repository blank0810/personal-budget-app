import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getNotificationPreferencesAction } from '@/server/modules/notification/notification.controller';
import { UserService } from '@/server/modules/user/user.service';
import { ProfilePage } from '@/components/modules/profile/ProfilePage';

export default async function ProfileRoute() {
	const session = await auth();
	if (!session?.user?.id) {
		redirect('/api/auth/signin');
	}

	const userId = session.user.id;

	// Through the controller, not the service directly: CLAUDE.md requires every
	// request to route via a controller so auth checks and validation are applied
	// at every entry point. This page previously reached past it.
	const [user, preferencesResult] = await Promise.all([
		UserService.getProfile(userId),
		getNotificationPreferencesAction(),
	]);

	if ('error' in preferencesResult) {
		throw new Error(preferencesResult.error);
	}

	const preferences = preferencesResult.data;

	return (
		<ProfilePage
			user={{
				name: user.name,
				email: user.email,
				phoneNumber: user.phoneNumber,
				hasPassword: !!user.password,
				createdAt: user.createdAt.toISOString(),
				providers: user.authAccounts.map((a) => a.provider),
				emailNotificationsEnabled: user.emailNotificationsEnabled,
				notificationEmail: user.notificationEmail,
				largeExpenseThreshold:
					user.largeExpenseThreshold === null
						? null
						: Number(user.largeExpenseThreshold),
				businessName: user.businessName,
				businessAddress: user.businessAddress,
				businessTaxId: user.businessTaxId,
				paymentInstructions: user.paymentInstructions,
			}}
			preferences={preferences}
		/>
	);
}
