import { AdminContentService } from '@/server/modules/admin/admin-content.service';
import { FeatureFlagTable } from '@/components/modules/admin/FeatureFlagTable';

export default async function AdminFeatureFlagsPage() {
	const flags = await AdminContentService.getFeatureFlags();

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-6'>
			<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
				Feature Flags
			</h1>
			<FeatureFlagTable initialFlags={flags} />
		</div>
	);
}
