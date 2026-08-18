import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { UserService } from '@/server/modules/user/user.service';
import { DangerZoneCard } from '@/components/modules/settings/DangerZoneCard';

/**
 * "Data & Privacy", not "Danger Zone": nobody navigates toward a danger zone,
 * but people do go looking for how to export their data. The export lives here
 * alongside the destructive actions.
 */
export default async function SettingsDataPage() {
	const session = await auth();
	if (!session?.user?.id) redirect('/login');

	const user = await UserService.getProfile(session.user.id);

	return <DangerZoneCard hasPassword={Boolean(user.password)} />;
}
