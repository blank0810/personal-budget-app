import { notFound } from 'next/navigation';
import { AdminUsersService } from '@/server/modules/admin/admin-users.service';
import { AdminContentService } from '@/server/modules/admin/admin-content.service';
import { FeatureFlagService } from '@/server/modules/feature-flag/feature-flag.service';
import { UserDetailPage } from '@/components/modules/admin/UserDetailPage';
import { serialize } from '@/lib/serialization';

interface AdminUserDetailPageProps {
	params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({
	params,
}: AdminUserDetailPageProps) {
	const { id } = await params;

	let results;
	try {
		results = await Promise.all([
			AdminUsersService.getUserDetail(id),
			AdminUsersService.getUserActivity(id, 20),
			AdminContentService.getFeatureFlags(),
			FeatureFlagService.getUserOverrides(id),
		]);
	} catch {
		notFound();
	}

	const [user, timeline, flags, overrides] = results;

	return (
		<UserDetailPage
			user={serialize(user)}
			timeline={serialize(timeline)}
			flags={serialize(flags)}
			overrides={overrides}
		/>
	);
}
