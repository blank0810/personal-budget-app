import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { NotificationService } from '@/server/modules/notification/notification.service';
import { UserService } from '@/server/modules/user/user.service';
import { ProfilePage } from '@/components/modules/profile/ProfilePage';

export default async function ProfileRoute() {
	const session = await auth();
	if (!session?.user?.id) {
		redirect('/api/auth/signin');
	}

	const userId = session.user.id;

	const [user, preferences] = await Promise.all([
		UserService.getProfile(userId),
		NotificationService.getPreferencesForUser(userId),
	]);

	return (
		<ProfilePage
			user={{
				name: user.name,
				email: user.email,
				phoneNumber: user.phoneNumber,
				hasPassword: !!user.password,
				createdAt: user.createdAt.toISOString(),
				providers: user.authAccounts.map((a) => a.provider),
			}}
			preferences={preferences}
		/>
	);
}
