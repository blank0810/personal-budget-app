import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { NotificationService } from '@/server/modules/notification/notification.service';
import { ProfilePage } from '@/components/modules/profile/ProfilePage';

export default async function ProfileRoute() {
	const session = await auth();
	if (!session?.user?.id) {
		redirect('/api/auth/signin');
	}

	const userId = session.user.id;

	const [user, preferences] = await Promise.all([
		prisma.user.findUniqueOrThrow({
			where: { id: userId },
			select: {
				id: true,
				name: true,
				email: true,
				password: true,
				phoneNumber: true,
				createdAt: true,
				authAccounts: {
					select: {
						provider: true,
						providerAccountId: true,
					},
				},
			},
		}),
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
