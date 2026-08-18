import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { UserService } from '@/server/modules/user/user.service';
import { SecurityCard } from '@/components/modules/settings/SecurityCard';
import { LinkedAccountsCard } from '@/components/modules/settings/LinkedAccountsCard';

/**
 * Password and linked accounts share a section: an OAuth provider IS a sign-in
 * method, and the two are already coupled in code — the disconnect button is
 * gated on whether a password exists, so splitting them would separate a control
 * from the thing that governs it.
 */
export default async function SettingsSecurityPage() {
	const session = await auth();
	if (!session?.user?.id) redirect('/login');

	const user = await UserService.getProfile(session.user.id);
	const hasPassword = Boolean(user.password);

	return (
		<>
			<SecurityCard hasPassword={hasPassword} />
			<LinkedAccountsCard
				providers={user.authAccounts.map((a) => a.provider)}
				hasPassword={hasPassword}
			/>
		</>
	);
}
