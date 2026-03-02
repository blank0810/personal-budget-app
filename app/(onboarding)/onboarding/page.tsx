import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { OnboardingWizard } from '@/components/modules/onboarding/OnboardingWizard';

export default async function OnboardingPage() {
	const session = await auth();
	if (!session?.user) redirect('/login');

	return <OnboardingWizard userName={session.user.name || 'there'} />;
}
