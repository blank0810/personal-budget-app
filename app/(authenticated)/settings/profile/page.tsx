import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { UserService } from '@/server/modules/user/user.service';
import { PersonalInfoCard } from '@/components/modules/settings/PersonalInfoCard';

export default async function SettingsProfilePage() {
	const session = await auth();
	if (!session?.user?.id) redirect('/login');

	const user = await UserService.getProfile(session.user.id);

	return (
		<PersonalInfoCard
			name={user.name}
			email={user.email}
			phoneNumber={user.phoneNumber}
		/>
	);
}
