import { AdminContentService } from '@/server/modules/admin/admin-content.service';
import { FeatureFlagTable } from '@/components/modules/admin/FeatureFlagTable';

export default async function AdminFeatureFlagsPage() {
	const flags = await AdminContentService.getFeatureFlags();

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-6'>
			<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
				Feature Flags
			</h1>
			<p className='rounded-md border border-dashed p-4 text-sm text-muted-foreground'>
				These flags are recorded but <strong>not currently enforced</strong>.
				Gating was removed while the app has a single tier, so toggling a flag
				here changes no behaviour. Re-introduce a guard in the relevant page,
				server action and API route before relying on one.
			</p>
			<FeatureFlagTable initialFlags={flags} />
		</div>
	);
}
