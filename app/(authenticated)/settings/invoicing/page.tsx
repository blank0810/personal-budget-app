import { auth } from '@/auth';
import { notFound, redirect } from 'next/navigation';
import { FeatureFlagService } from '@/server/modules/feature-flag/feature-flag.service';
import { UserService } from '@/server/modules/user/user.service';
import { BusinessProfileCard } from '@/components/modules/settings/BusinessProfileCard';

/**
 * Sender identity printed on invoices a client receives — not information about
 * the user as a person, which is why it is not on the Profile section. Gated on
 * the same flag that hides the Invoices area, so users who never invoice never
 * see it.
 */
export default async function SettingsInvoicingPage() {
	const session = await auth();
	if (!session?.user?.id) redirect('/login');

	const features = await FeatureFlagService.getResolvedFeaturesForUser(
		session.user.id
	);
	if (!features.invoices) notFound();

	const user = await UserService.getProfile(session.user.id);

	return (
		<BusinessProfileCard
			businessName={user.businessName}
			businessAddress={user.businessAddress}
			businessTaxId={user.businessTaxId}
			paymentInstructions={user.paymentInstructions}
		/>
	);
}
