import { AdminContentService } from '@/server/modules/admin/admin-content.service';
import { FeatureRequestTable } from '@/components/modules/admin/FeatureRequestTable';
import { serialize } from '@/lib/serialization';

export default async function AdminFeatureRequestsPage() {
	const result = await AdminContentService.getFeatureRequests(1);

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-6'>
			<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
				Feature Requests
			</h1>
			<FeatureRequestTable
				initialRequests={serialize(result.requests)}
				initialTotal={result.total}
				initialPages={result.pages}
			/>
		</div>
	);
}
